import { db } from '@/lib/db'
import { aiChat, parseAIJSON } from '@/lib/ai'
import { worldviewPrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Get project with existing world settings
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        worldSettings: { orderBy: { order: 'asc' } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // Prepare existing settings summary for context
    const existingSettings = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
      .join('\n')

    // Generate world settings using AI
    const prompts = worldviewPrompt({
      genre: project.genre,
      existingSettings,
      focusArea: project.coreSeed || undefined,
    })

    const resultText = await aiChat([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ])

    // Parse the AI response - expect an array of world setting objects
    let worldSettings
    try {
      worldSettings = parseAIJSON<
        Array<{
          category: string
          name: string
          description: string
          rules: string
        }>
      >(resultText)
    } catch (parseError) {
      console.error('Failed to parse world settings JSON:', parseError)
      console.error('Raw AI response:', resultText)
      return NextResponse.json(
        { error: 'AI生成的世界观格式无法解析，请重试' },
        { status: 500 }
      )
    }

    if (!Array.isArray(worldSettings) || worldSettings.length === 0) {
      return NextResponse.json(
        { error: 'AI未生成有效世界观设定，请重试' },
        { status: 500 }
      )
    }

    // Get current max order to append after existing settings
    const maxOrder = project.worldSettings.length > 0
      ? Math.max(...project.worldSettings.map((ws) => ws.order))
      : -1

    // Save world settings to database
    const savedSettings = await db.$transaction(async (tx) => {
      const created = []
      for (let i = 0; i < worldSettings.length; i++) {
        const ws = worldSettings[i]
        const setting = await tx.worldSetting.create({
          data: {
            projectId,
            category: ws.category || 'general',
            name: ws.name,
            description: ws.description || '',
            rules: ws.rules || '',
            order: maxOrder + 1 + i,
          },
        })
        created.push(setting)
      }
      return created
    })

    return NextResponse.json(savedSettings)
  } catch (error) {
    console.error('World setting generation failed:', error)
    return NextResponse.json({ error: '世界观生成失败，请重试' }, { status: 500 })
  }
}
