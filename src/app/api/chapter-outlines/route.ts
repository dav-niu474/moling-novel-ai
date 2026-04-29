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
    const outlines = await db.chapterOutline.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    })
    return NextResponse.json(outlines)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chapter outlines' }, { status: 500 })
  }
}
