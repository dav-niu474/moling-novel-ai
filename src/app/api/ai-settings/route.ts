import { db } from '@/lib/db'
import { getProviderConfig, AI_PROVIDERS } from '@/lib/ai-provider'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let settings = await db.aISettings.findFirst()

    if (!settings) {
      // Create default settings with NVIDIA as default provider
      settings = await db.aISettings.create({
        data: {
          provider: 'nvidia',
          apiKey: '',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          model: 'deepseek-ai/deepseek-v4-flash',
          temperature: 0.7,
          maxTokens: 8192,
        },
      })
    }

    // Mask the API key for security
    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : ''

    return NextResponse.json({
      ...settings,
      apiKey: maskedApiKey,
      hasApiKey: !!settings.apiKey,
      providers: AI_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        models: p.models,
        defaultModel: p.defaultModel,
        apiKeyPrefix: p.apiKeyPrefix,
        description: p.description,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch AI settings:', error)
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const existing = await db.aISettings.findFirst()

    // Validate provider and auto-fill base URL / model
    const provider = body.provider || 'nvidia'
    const providerConfig = getProviderConfig(provider)

    let baseUrl = body.baseUrl
    let model = body.model

    // Auto-fill base URL based on provider (unless custom)
    if (providerConfig && provider !== 'custom' && provider !== 'builtin') {
      if (!baseUrl || baseUrl === '') {
        baseUrl = providerConfig.baseUrl
      }
      // Auto-fill model if switching provider and current model is not valid for new provider
      if (providerConfig.models.length > 0 && model) {
        const modelExists = providerConfig.models.some((m) => m.id === model)
        if (!modelExists) {
          model = providerConfig.defaultModel
        }
      } else if (!model) {
        model = providerConfig.defaultModel
      }
    }

    // Validate temperature
    const temperature = body.temperature
    if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
      return NextResponse.json(
        { error: 'temperature 必须在 0-2 之间' },
        { status: 400 }
      )
    }

    // Validate maxTokens
    const maxTokens = body.maxTokens
    if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens < 1)) {
      return NextResponse.json(
        { error: 'maxTokens 必须为正整数' },
        { status: 400 }
      )
    }

    const updateData = {
      provider,
      apiKey: body.apiKey !== undefined ? body.apiKey : undefined,
      baseUrl: baseUrl || providerConfig?.baseUrl || '',
      model: model || providerConfig?.defaultModel || '',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens || 8192,
    }

    let settings
    if (existing) {
      // Only update apiKey if a new one is provided (not masked)
      const dataToUpdate: Record<string, unknown> = {
        provider: updateData.provider,
        baseUrl: updateData.baseUrl,
        model: updateData.model,
        temperature: updateData.temperature,
        maxTokens: updateData.maxTokens,
      }
      if (updateData.apiKey && !updateData.apiKey.includes('****')) {
        dataToUpdate.apiKey = updateData.apiKey
      }

      settings = await db.aISettings.update({
        where: { id: existing.id },
        data: dataToUpdate,
      })
    } else {
      settings = await db.aISettings.create({
        data: {
          provider: updateData.provider,
          apiKey: (updateData.apiKey as string) || '',
          baseUrl: updateData.baseUrl,
          model: updateData.model,
          temperature: updateData.temperature as number,
          maxTokens: updateData.maxTokens as number,
        },
      })
    }

    // Mask the API key in response
    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : ''

    return NextResponse.json({
      ...settings,
      apiKey: maskedApiKey,
      hasApiKey: !!settings.apiKey,
      providers: AI_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        models: p.models,
        defaultModel: p.defaultModel,
        apiKeyPrefix: p.apiKeyPrefix,
        description: p.description,
      })),
    })
  } catch (error) {
    console.error('Failed to update AI settings:', error)
    return NextResponse.json({ error: '更新设置失败' }, { status: 500 })
  }
}
