import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStream, createStreamingResponse, parseAIJSON } from '@/lib/ai'
import { architecturePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

// POST /api/architecture/generate - Stream architecture generation
// Uses streaming to avoid Vercel hobby plan 10-second timeout
export async function POST(request: Request) {
  let projectId: string | undefined
  let coreSeed: string | undefined
  try {
    await ensureDbInitialized()
    const body = await request.json()
    projectId = body.projectId
    coreSeed = body.coreSeed
    if (!projectId || !coreSeed) {
      return NextResponse.json({ error: 'projectId and coreSeed are required' }, { status: 400 })
    }

    // Get project
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // Update status to architecting
    await db.project.update({
      where: { id: projectId },
      data: { coreSeed, status: 'architecting' },
    })

    // Generate architecture using AI with streaming
    const prompts = architecturePrompt({
      title: project.title,
      genre: project.genre,
      description: project.description,
      chapterCount: project.chapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed,
    })

    const stream = await aiChatStream([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ])

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
        // Save to database after streaming completes
        try {
          let architecture
          try {
            architecture = parseAIJSON<{
              coreSeed: string
              characters: Array<{
                name: string
                role: string
                personality: string
                motivation: string
                arc: string
                relationships: Record<string, string> | string
                appearance: string
                background: string
              }>
              worldSettings: Array<{
                category: string
                name: string
                description: string
                rules: string
              }>
              plotStructure: {
                setup: string
                risingAction: string
                midpoint: string
                fallingAction: string
                climax: string
                resolution: string
              }
            }>(fullContent)
          } catch (parseError) {
            console.error('Failed to parse architecture JSON:', parseError)
            await db.project.update({ where: { id: projectId! }, data: { status: 'draft' } })
            return
          }

          // Save to database in a transaction
          await db.$transaction(async (tx) => {
            await tx.project.update({
              where: { id: projectId! },
              data: {
                coreSeed: architecture.coreSeed || coreSeed,
                plotStructure: architecture.plotStructure
                  ? JSON.stringify(architecture.plotStructure)
                  : '',
                status: 'architecting',
              },
            })

            await tx.character.deleteMany({ where: { projectId: projectId! } })
            await tx.worldSetting.deleteMany({ where: { projectId: projectId! } })

            if (architecture.characters && architecture.characters.length > 0) {
              await tx.character.createMany({
                data: architecture.characters.map((char, index) => ({
                  projectId: projectId!,
                  name: char.name,
                  role: char.role || 'supporting',
                  personality: char.personality || '',
                  motivation: char.motivation || '',
                  arc: char.arc || '',
                  relationships:
                    typeof char.relationships === 'string'
                      ? char.relationships
                      : JSON.stringify(char.relationships || {}),
                  appearance: char.appearance || '',
                  background: char.background || '',
                  order: index,
                })),
              })
            }

            if (architecture.worldSettings && architecture.worldSettings.length > 0) {
              await tx.worldSetting.createMany({
                data: architecture.worldSettings.map((ws, index) => ({
                  projectId: projectId!,
                  category: ws.category || 'general',
                  name: ws.name,
                  description: ws.description || '',
                  rules: ws.rules || '',
                  order: index,
                })),
              })
            }
          })
        } catch (err) {
          console.error('Failed to save architecture:', err)
          try {
            await db.project.update({ where: { id: projectId! }, data: { status: 'draft' } })
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
        'X-Architecture-ProjectId': projectId,
        'X-Architecture-CoreSeed': encodeURIComponent(coreSeed),
        'X-Architecture-ChapterCount': String(project.chapterCount),
      },
    })
  } catch (error) {
    console.error('Architecture generation failed:', error)
    if (projectId) {
      try {
        await db.project.update({
          where: { id: projectId },
          data: { status: 'draft' },
        })
      } catch {
        // Ignore reset errors
      }
    }
    return NextResponse.json({ error: '架构生成失败，请重试' }, { status: 500 })
  }
}
