import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStream, createStreamingResponse } from '@/lib/ai'
import { chapterWritingPrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const { projectId, chapterNumber } = await request.json()
    if (!projectId || !chapterNumber) {
      return NextResponse.json(
        { error: 'projectId and chapterNumber are required' },
        { status: 400 }
      )
    }

    // Get project with all context
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
        chapterOutlines: {
          where: { chapterNumber },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const outline = project.chapterOutlines[0]
    if (!outline) {
      return NextResponse.json(
        { error: '该章节没有大纲，请先生成大纲' },
        { status: 400 }
      )
    }

    // Get previous chapter summary for context
    let previousChapterSummary = ''
    if (chapterNumber > 1) {
      const prevOutline = await db.chapterOutline.findUnique({
        where: {
          projectId_chapterNumber: { projectId, chapterNumber: chapterNumber - 1 },
        },
      })
      if (prevOutline) {
        previousChapterSummary = prevOutline.summary
      }
    }

    // Prepare character context
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n')

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}：${ws.description}`)
      .join('\n')

    // Generate chapter content using streaming
    const prompts = chapterWritingPrompt({
      title: project.title,
      genre: project.genre,
      chapterNumber,
      chapterTitle: outline.title,
      chapterSummary: outline.summary,
      keyPoints: outline.keyPoints,
      foreshadowing: outline.foreshadowing,
      emotionBeat: outline.emotionBeat,
      conflicts: outline.conflicts,
      characters: charactersSummary,
      worldSettings: worldSettingsSummary,
      previousChapterSummary,
      wordsPerChapter: project.wordsPerChapter,
    })

    const stream = await aiChatStream([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ])

    // Create streaming response
    const readableStream = createStreamingResponse(stream)

    // Use a TransformStream to capture content while streaming to save to DB after completion
    let fullContent = ''
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk)
        fullContent += text
        controller.enqueue(chunk)
      },
      async flush() {
        // Save to database after streaming completes
        try {
          const wordCount = fullContent.length
          await db.chapterContent.upsert({
            where: {
              projectId_chapterNumber: { projectId, chapterNumber },
            },
            create: {
              projectId,
              chapterNumber,
              content: fullContent,
              wordCount,
              status: 'generated',
            },
            update: {
              content: fullContent,
              wordCount,
              status: 'generated',
            },
          })

          // Update project status
          await db.project.update({
            where: { id: projectId },
            data: { status: 'writing' },
          })
        } catch (err) {
          console.error('Failed to save chapter content:', err)
        }
      },
    })

    const finalStream = readableStream.pipeThrough(transformStream)

    return new Response(finalStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chapter generation failed:', error)
    return NextResponse.json(
      { error: '章节生成失败，请重试' },
      { status: 500 }
    )
  }
}
