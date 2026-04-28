import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    const contents = await db.chapterContent.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    })
    return NextResponse.json(contents)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chapter contents' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { projectId, chapterNumber, content, wordCount, status } = body
    if (!projectId || !chapterNumber) {
      return NextResponse.json({ error: 'projectId and chapterNumber are required' }, { status: 400 })
    }

    // Upsert chapter content
    const existing = await db.chapterContent.findUnique({
      where: { projectId_chapterNumber: { projectId, chapterNumber } },
    })

    if (existing) {
      const finalContent = content ?? existing.content
      const updated = await db.chapterContent.update({
        where: { id: existing.id },
        data: {
          content: finalContent,
          wordCount: wordCount ?? finalContent.length,
          status: status ?? existing.status,
        },
      })
      return NextResponse.json(updated)
    } else {
      // Need to check if outline exists for this chapter
      const outline = await db.chapterOutline.findUnique({
        where: { projectId_chapterNumber: { projectId, chapterNumber } },
      })

      const contentValue = content || ''
      const wordCountValue = wordCount || contentValue.length
      const statusValue = status || 'draft'

      if (outline) {
        const created = await db.chapterContent.create({
          data: {
            projectId,
            chapterNumber,
            content: contentValue,
            wordCount: wordCountValue,
            status: statusValue,
          },
        })
        return NextResponse.json(created)
      } else {
        // Create outline first, then content
        await db.chapterOutline.create({
          data: {
            projectId,
            chapterNumber,
            title: `第${chapterNumber}章`,
          },
        })
        const created = await db.chapterContent.create({
          data: {
            projectId,
            chapterNumber,
            content: contentValue,
            wordCount: wordCountValue,
            status: statusValue,
          },
        })
        return NextResponse.json(created)
      }
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update chapter content' }, { status: 500 })
  }
}
