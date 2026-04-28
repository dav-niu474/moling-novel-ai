import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const settings = await db.worldSetting.findMany({
      where: { projectId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    })
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch world settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, category, name, description, rules } = body
    if (!projectId || !name || !category) {
      return NextResponse.json({ error: 'projectId, name, and category are required' }, { status: 400 })
    }
    const count = await db.worldSetting.count({ where: { projectId, category } })
    const setting = await db.worldSetting.create({
      data: {
        projectId,
        category,
        name,
        description: description || '',
        rules: rules || '',
        order: count,
      },
    })
    return NextResponse.json(setting)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create world setting' }, { status: 500 })
  }
}
