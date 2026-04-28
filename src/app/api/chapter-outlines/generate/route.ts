import { db } from '@/lib/db'
import { aiChat, parseAIJSON } from '@/lib/ai'
import { outlinePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let projectId: string | undefined
  try {
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

    // Prepare context for outline generation
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n')

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
      .join('\n')

    // Cap chapter count at a reasonable max for AI generation
    const effectiveChapterCount = Math.min(project.chapterCount, 30)

    // Generate outlines using AI
    const prompts = outlinePrompt({
      title: project.title,
      genre: project.genre,
      chapterCount: effectiveChapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed: project.coreSeed,
      characters: charactersSummary || '暂无角色信息',
      worldSettings: worldSettingsSummary || '暂无世界设定',
      plotStructure: `架构核心种子：${project.coreSeed}`,
    })

    // Use higher maxTokens for outline generation (needs to output multiple chapters)
    // Scale maxTokens based on chapter count: ~500 tokens per chapter outline
    const outlineMaxTokens = Math.min(Math.max(effectiveChapterCount * 500, 4096), 16384)

    const resultText = await aiChat(
      [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      { maxTokens: outlineMaxTokens }
    )

    // Parse the AI response
    let outlines
    try {
      outlines = parseAIJSON<
        Array<{
          chapterNumber: number
          title: string
          summary: string
          keyPoints: string[] | string
          foreshadowing: string[] | string
          emotionBeat: string
          conflicts: Array<{ type: string; description: string }> | string
        }>
      >(resultText)
    } catch (parseError) {
      console.error('Failed to parse outline JSON:', parseError)
      console.error('Raw AI response:', resultText)
      await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } })
      return NextResponse.json({ error: 'AI生成的大纲格式无法解析，请重试' }, { status: 500 })
    }

    if (!Array.isArray(outlines) || outlines.length === 0) {
      await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } })
      return NextResponse.json({ error: 'AI未生成有效大纲，请重试' }, { status: 500 })
    }

    // Save outlines to database
    await db.$transaction(async (tx) => {
      // Delete existing outlines for this project
      await tx.chapterOutline.deleteMany({ where: { projectId: projectId! } })

      // Create new outlines
      for (const outline of outlines) {
        await tx.chapterOutline.create({
          data: {
            projectId: projectId!,
            chapterNumber: outline.chapterNumber,
            title: outline.title || `第${outline.chapterNumber}章`,
            summary: outline.summary || '',
            keyPoints:
              typeof outline.keyPoints === 'string'
                ? outline.keyPoints
                : JSON.stringify(outline.keyPoints || []),
            foreshadowing:
              typeof outline.foreshadowing === 'string'
                ? outline.foreshadowing
                : JSON.stringify(outline.foreshadowing || []),
            emotionBeat: outline.emotionBeat || '',
            conflicts:
              typeof outline.conflicts === 'string'
                ? outline.conflicts
                : JSON.stringify(outline.conflicts || []),
          },
        })
      }

      // Update project status
      await tx.project.update({
        where: { id: projectId! },
        data: { status: 'outlining' },
      })
    })

    // Fetch saved outlines
    const savedOutlines = await db.chapterOutline.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    })

    return NextResponse.json(savedOutlines)
  } catch (error) {
    console.error('Outline generation failed:', error)
    // Use saved projectId to reset status
    if (projectId) {
      try {
        await db.project.update({
          where: { id: projectId },
          data: { status: 'architecting' },
        })
      } catch {
        // Ignore reset errors
      }
    }
    return NextResponse.json({ error: '大纲生成失败，请重试' }, { status: 500 })
  }
}
