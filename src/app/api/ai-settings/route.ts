import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await db.aISettings.findFirst()
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const existing = await db.aISettings.findFirst()

    let settings
    if (existing) {
      settings = await db.aISettings.update({
        where: { id: existing.id },
        data: {
          apiKey: body.apiKey,
          baseUrl: body.baseUrl,
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
        },
      })
    } else {
      settings = await db.aISettings.create({
        data: {
          apiKey: body.apiKey || '',
          baseUrl: body.baseUrl || 'https://api.openai.com/v1',
          model: body.model || 'gpt-4o-mini',
          temperature: body.temperature ?? 0.7,
          maxTokens: body.maxTokens || 4096,
        },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 })
  }
}
