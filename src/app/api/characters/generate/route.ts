import { db, ensureDbInitialized } from '@/lib/db'
import { aiChat, parseAIJSON } from '@/lib/ai'
import { characterDesignPrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const { projectId } = await request.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Get project with existing characters
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        characters: { orderBy: { order: 'asc' } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // Prepare existing characters summary for context
    const existingCharacters = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality}`)
      .join('\n')

    // Generate characters using AI
    const prompts = characterDesignPrompt({
      genre: project.genre,
      existingCharacters,
      characterConcept: project.coreSeed || undefined,
    })

    const resultText = await aiChat([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ])

    // Parse the AI response - expect an array of character objects
    let characters
    try {
      characters = parseAIJSON<
        Array<{
          name: string
          role: string
          personality: string
          motivation: string
          arc: string
          relationships: Record<string, string> | string
          appearance: string
          background: string
        }>
      >(resultText)
    } catch (parseError) {
      console.error('Failed to parse characters JSON:', parseError)
      console.error('Raw AI response:', resultText)
      return NextResponse.json(
        { error: 'AI生成的角色格式无法解析，请重试' },
        { status: 500 }
      )
    }

    if (!Array.isArray(characters) || characters.length === 0) {
      return NextResponse.json(
        { error: 'AI未生成有效角色，请重试' },
        { status: 500 }
      )
    }

    // Get current max order to append after existing characters
    const maxOrder = project.characters.length > 0
      ? Math.max(...project.characters.map((c) => c.order))
      : -1

    // Save characters to database
    const savedCharacters = await db.$transaction(async (tx) => {
      const created = []
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i]
        const character = await tx.character.create({
          data: {
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
            order: maxOrder + 1 + i,
          },
        })
        created.push(character)
      }
      return created
    })

    return NextResponse.json(savedCharacters)
  } catch (error) {
    console.error('Character generation failed:', error)
    return NextResponse.json({ error: '角色生成失败，请重试' }, { status: 500 })
  }
}
