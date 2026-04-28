import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    // Demo: return empty array - AI generation would happen here
    return NextResponse.json([])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate outlines' }, { status: 500 })
  }
}
