import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            characters: true,
            chapterContents: true,
          },
        },
      },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, genre, description, chapterCount, wordsPerChapter } = body

    if (!title || !genre) {
      return NextResponse.json({ error: 'Title and genre are required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        title,
        genre,
        description: description || '',
        chapterCount: chapterCount || 30,
        wordsPerChapter: wordsPerChapter || 3000,
        status: 'draft',
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
