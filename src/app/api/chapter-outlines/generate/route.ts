import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStream, createStreamingResponse, parseAIJSON } from '@/lib/ai'
import { outlinePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

// POST /api/chapter-outlines/generate - Generate chapter outlines using AI (streaming)
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

    // Prepare context for outline generation
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n')

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
      .join('\n')

    // Cap chapter count at a reasonable max for AI generation
    const effectiveChapterCount = Math.min(project.chapterCount, 30)

    // Generate outlines using AI with streaming to avoid Vercel timeout
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

    // Scale maxTokens based on chapter count: ~500 tokens per chapter outline
    const outlineMaxTokens = Math.min(Math.max(effectiveChapterCount * 500, 4096), 16384)

    const stream = await aiChatStream(
      [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
      { maxTokens: outlineMaxTokens }
    )

    // Create streaming response
    const readableStream = createStreamingResponse(stream)

    // Use TransformStream to collect content while streaming, then save to DB
    let fullContent = ''
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        fullContent += text
        controller.enqueue(chunk)
      },
      async flush() {
        try {
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
            >(fullContent)
          } catch (parseError) {
            console.error('Failed to parse outline JSON:', parseError)
            await db.project.update({ where: { id: projectId! }, data: { status: 'architecting' } })
            return
          }

          if (!Array.isArray(outlines) || outlines.length === 0) {
            await db.project.update({ where: { id: projectId! }, data: { status: 'architecting' } })
            return
          }

          // Save outlines to database
          await db.$transaction(async (tx) => {
            await tx.chapterOutline.deleteMany({ where: { projectId: projectId! } })

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

            await tx.project.update({
              where: { id: projectId! },
              data: { status: 'outlining' },
            })
          })
        } catch (err) {
          console.error('Failed to save outlines:', err)
          try {
            await db.project.update({ where: { id: projectId! }, data: { status: 'architecting' } })
          } catch {
            // Ignore reset errors
          }
        }
      },
    })

    const finalStream = readableStream.pipeThrough(transformStream)

    return new Response(finalStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Outline generation failed:', error)
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
