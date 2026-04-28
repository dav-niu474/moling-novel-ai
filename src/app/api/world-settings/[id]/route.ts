import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.worldSetting.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'World setting not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete world setting' }, { status: 500 })
  }
}
