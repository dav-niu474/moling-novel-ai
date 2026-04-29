import { db, ensureDbInitialized } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await ensureDbInitialized()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const characters = await db.character.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(characters)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { projectId, name, role, personality, motivation, arc, relationships, appearance, background } = body
    if (!projectId || !name) {
      return NextResponse.json({ error: 'projectId and name are required' }, { status: 400 })
    }
    const count = await db.character.count({ where: { projectId } })
    const character = await db.character.create({
      data: {
        projectId,
        name,
        role: role || 'supporting',
        personality: personality || '',
        motivation: motivation || '',
        arc: arc || '',
        relationships: typeof relationships === 'string'
          ? relationships
          : JSON.stringify(relationships || {}),
        appearance: appearance || '',
        background: background || '',
        order: count,
      },
    })
    return NextResponse.json(character)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
  }
}
