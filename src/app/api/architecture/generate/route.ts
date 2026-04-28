import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { projectId, coreSeed } = await request.json()
    if (!projectId || !coreSeed) {
      return NextResponse.json({ error: 'projectId and coreSeed are required' }, { status: 400 })
    }

    // Update project coreSeed and status
    await db.project.update({
      where: { id: projectId },
      data: { coreSeed, status: 'architecting' },
    })

    // Demo: return empty - AI architecture generation would happen here
    // In production, this would use the AI SDK to generate architecture
    return NextResponse.json({ error: 'AI architecture generation not configured' }, { status: 501 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate architecture' }, { status: 500 })
  }
}
