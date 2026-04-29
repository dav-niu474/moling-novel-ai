import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStreamCollect, parseAIJSON } from '@/lib/ai'
import { outlinePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

// POST /api/chapter-outlines/generate - Generate chapter outlines using AI
// Uses aiChatStreamCollect to collect full response before saving,
// which is more reliable than TransformStream flush on Vercel Serverless
export async function POST(request: Request) {
  let projectId: string | undefined
  try {
    await ensureDbInitialized()
    const body = await request.json()
    projectId = body.projectId
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Get project with characters and world settings
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    if (!project.coreSeed) {
      return NextResponse.json({ error: '请先生成小说架构（核心种子为空）' }, { status: 400 })
    }

    // Update status
    await db.project.update({
      where: { id: projectId },
      data: { status: 'outlining' },
    })

    // Prepare context
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n')

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
      .join('\n')

    // Parse plotStructure from stored JSON
    let plotStructureText = `架构核心种子：${project.coreSeed}`
    if (project.plotStructure) {
      try {
        const ps = JSON.parse(project.plotStructure)
        if (ps && typeof ps === 'object') {
          plotStructureText = [
            ps.setup ? `开局设定：${ps.setup}` : '',
            ps.risingAction ? `上升行动：${ps.risingAction}` : '',
            ps.midpoint ? `中点转折：${ps.midpoint}` : '',
            ps.fallingAction ? `下降行动：${ps.fallingAction}` : '',
            ps.climax ? `高潮：${ps.climax}` : '',
            ps.resolution ? `结局：${ps.resolution}` : '',
          ].filter(Boolean).join('\n')
        }
      } catch {
        // If JSON parse fails, use as plain text
        plotStructureText = project.plotStructure
      }
    }

    // Cap to 10 chapters per batch to stay within reasonable generation time
    const effectiveChapterCount = Math.min(project.chapterCount, 10)
    const outlineMaxTokens = Math.min(Math.max(effectiveChapterCount * 500, 4096), 16384)

    const prompts = outlinePrompt({
      title: project.title,
      genre: project.genre,
      chapterCount: effectiveChapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed: project.coreSeed,
      characters: charactersSummary || '暂无角色信息',
      worldSettings: worldSettingsSummary || '暂无世界设定',
      plotStructure: plotStructureText,
    })

    // Collect full response from AI (streaming internally to avoid timeout)
    const fullContent = await aiChatStreamCollect(
      [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      { maxTokens: outlineMaxTokens }
    )

    // Parse the AI response
    let outlines
    try {
      outlines = parseAIJSON<Array<{
        chapterNumber: number; title: string; summary: string;
        keyPoints: string[] | string; foreshadowing: string[] | string;
        emotionBeat: string; conflicts: Array<{ type: string; description: string }> | string;
      }>>(fullContent)
    } catch {
      await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } })
      return NextResponse.json({ error: '大纲格式解析失败，请重试' }, { status: 500 })
    }

    if (!Array.isArray(outlines) || outlines.length === 0) {
      await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } })
      return NextResponse.json({ error: '生成的大纲为空，请重试' }, { status: 500 })
    }

    // Save to database
    await db.$transaction(async (tx) => {
      await tx.chapterOutline.deleteMany({ where: { projectId: projectId! } })
      for (const outline of outlines) {
        await tx.chapterOutline.create({
          data: {
            projectId: projectId!,
            chapterNumber: outline.chapterNumber,
            title: outline.title || `第${outline.chapterNumber}章`,
            summary: outline.summary || '',
            keyPoints: typeof outline.keyPoints === 'string' ? outline.keyPoints : JSON.stringify(outline.keyPoints || []),
            foreshadowing: typeof outline.foreshadowing === 'string' ? outline.foreshadowing : JSON.stringify(outline.foreshadowing || []),
            emotionBeat: outline.emotionBeat || '',
            conflicts: typeof outline.conflicts === 'string' ? outline.conflicts : JSON.stringify(outline.conflicts || []),
          },
        })
      }
      await tx.project.update({ where: { id: projectId! }, data: { status: 'outlining' } })
    })

    // Return saved outlines
    const savedOutlines = await db.chapterOutline.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    })

    return NextResponse.json(savedOutlines)
  } catch (error) {
    console.error('Outline generation failed:', error)
    if (projectId) {
      try { await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } }) } catch {}
    }
    return NextResponse.json({ error: '大纲生成失败，请重试' }, { status: 500 })
  }
}
