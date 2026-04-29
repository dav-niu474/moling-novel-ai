import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStreamCollect, parseAIJSON } from '@/lib/ai'
import { architecturePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

// POST /api/architecture/generate - Generate architecture and save to DB
// Uses aiChatStreamCollect to collect full response before saving,
// which is more reliable than TransformStream flush on Vercel Serverless
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

    // Generate architecture using AI with streaming (collects internally to avoid timeout)
    const prompts = architecturePrompt({
      title: project.title,
      genre: project.genre,
      description: project.description,
      chapterCount: project.chapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed,
    })

    const fullContent = await aiChatStreamCollect([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ])

    // Parse the AI response
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
      await db.project.update({ where: { id: projectId }, data: { status: 'draft' } })
      return NextResponse.json({ error: '架构生成格式解析失败，请重试' }, { status: 500 })
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

    // Fetch saved data to return
    const savedProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        coreSeed: architecture.coreSeed || coreSeed,
        plotStructure: architecture.plotStructure,
        characters: savedProject?.characters || [],
        worldSettings: savedProject?.worldSettings || [],
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
