import { db, ensureDbInitialized } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            characters: true,
            chapterContents: true,
          },
        },
      },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    const body = await request.json()

    // Whitelist allowed fields to prevent arbitrary field updates
    const { title, genre, description, chapterCount, wordsPerChapter, coreSeed, status } = body
    const dataToUpdate: Record<string, unknown> = {}
    if (title !== undefined) dataToUpdate.title = title
    if (genre !== undefined) dataToUpdate.genre = genre
    if (description !== undefined) dataToUpdate.description = description
    if (chapterCount !== undefined) dataToUpdate.chapterCount = chapterCount
    if (wordsPerChapter !== undefined) dataToUpdate.wordsPerChapter = wordsPerChapter
    if (coreSeed !== undefined) dataToUpdate.coreSeed = coreSeed
    if (status !== undefined) dataToUpdate.status = status

    const project = await db.project.update({
      where: { id },
      data: dataToUpdate,
    })
    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id } = await params
    await db.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
