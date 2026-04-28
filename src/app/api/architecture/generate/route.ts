import { db } from '@/lib/db'
import { aiChat, parseAIJSON } from '@/lib/ai'
import { architecturePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { projectId, coreSeed } = await request.json()
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

    // Generate architecture using AI
    const prompts = architecturePrompt({
      title: project.title,
      genre: project.genre,
      description: project.description,
      chapterCount: project.chapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed,
    })

    const resultText = await aiChat([
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
      }>(resultText)
    } catch (parseError) {
      console.error('Failed to parse architecture JSON:', parseError)
      console.error('Raw AI response:', resultText)
      await db.project.update({ where: { id: projectId }, data: { status: 'draft' } })
      return NextResponse.json({ error: 'AI生成的架构格式无法解析，请重试' }, { status: 500 })
    }

    // Save to database in a transaction
    await db.$transaction(async (tx) => {
      // Update project core seed
      await tx.project.update({
        where: { id: projectId },
        data: {
          coreSeed: architecture.coreSeed || coreSeed,
          status: 'architecting',
        },
      })

      // Delete existing characters and world settings (regenerating)
      await tx.character.deleteMany({ where: { projectId } })
      await tx.worldSetting.deleteMany({ where: { projectId } })

      // Save characters
      if (architecture.characters && architecture.characters.length > 0) {
        await tx.character.createMany({
          data: architecture.characters.map((char, index) => ({
            projectId,
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

      // Save world settings
      if (architecture.worldSettings && architecture.worldSettings.length > 0) {
        await tx.worldSetting.createMany({
          data: architecture.worldSettings.map((ws, index) => ({
            projectId,
            category: ws.category || 'general',
            name: ws.name,
            description: ws.description || '',
            rules: ws.rules || '',
            order: index,
          })),
        })
      }
    })

    // Transform AI response to frontend-expected format
    const characterDynamics = architecture.characters
      ? architecture.characters
          .map(
            (c) =>
              `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation} | 弧线：${c.arc}`
          )
          .join('\n')
      : ''

    const worldviewFramework = architecture.worldSettings
      ? architecture.worldSettings
          .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
          .join('\n')
      : ''

    const plotArchitecture = architecture.plotStructure
      ? `开局设定（前${Math.floor(project.chapterCount * 0.1)}章）：${architecture.plotStructure.setup}\n` +
        `上升行动（第${Math.floor(project.chapterCount * 0.1) + 1}-${Math.floor(project.chapterCount * 0.5)}章）：${architecture.plotStructure.risingAction}\n` +
        `中点转折（约第${Math.floor(project.chapterCount * 0.5)}章）：${architecture.plotStructure.midpoint}\n` +
        `下降行动（第${Math.floor(project.chapterCount * 0.5) + 1}-${Math.floor(project.chapterCount * 0.8)}章）：${architecture.plotStructure.fallingAction}\n` +
        `高潮（第${Math.floor(project.chapterCount * 0.8) + 1}-${Math.floor(project.chapterCount * 0.9)}章）：${architecture.plotStructure.climax}\n` +
        `结局（第${Math.floor(project.chapterCount * 0.9) + 1}-${project.chapterCount}章）：${architecture.plotStructure.resolution}`
      : ''

    // Derive rhythm points from plot structure's chapter distribution
    const chapterCount = project.chapterCount
    const rhythmPoints = [
      {
        chapter: 1,
        intensity: 60,
        label: '开篇引入',
      },
      {
        chapter: Math.floor(chapterCount * 0.1),
        intensity: 70,
        label: '初遇挑战',
      },
      {
        chapter: Math.floor(chapterCount * 0.25),
        intensity: 75,
        label: '冲突升级',
      },
      {
        chapter: Math.floor(chapterCount * 0.5),
        intensity: 90,
        label: '中点转折',
      },
      {
        chapter: Math.floor(chapterCount * 0.65),
        intensity: 70,
        label: '低谷蓄力',
      },
      {
        chapter: Math.floor(chapterCount * 0.8),
        intensity: 85,
        label: '二次冲突',
      },
      {
        chapter: Math.floor(chapterCount * 0.9),
        intensity: 95,
        label: '高潮预演',
      },
      {
        chapter: chapterCount,
        intensity: 100,
        label: '最终高潮',
      },
    ]

    return NextResponse.json({
      coreSeed: architecture.coreSeed || coreSeed,
      characterDynamics,
      worldviewFramework,
      plotArchitecture,
      rhythmPoints,
    })
  } catch (error) {
    console.error('Architecture generation failed:', error)
    // Try to reset status
    try {
      const { projectId } = await request.json()
      if (projectId) {
        await db.project.update({
          where: { id: projectId },
          data: { status: 'draft' },
        })
      }
    } catch {
      // Ignore reset errors
    }
    return NextResponse.json({ error: '架构生成失败，请重试' }, { status: 500 })
  }
}
