import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProviderConfig, AI_PROVIDERS } from '@/lib/ai-provider';

// GET /api/settings - Get current AI settings (mask apiKey)
export async function GET() {
  try {
    let settings = await db.aISettings.findFirst();

    if (!settings) {
      settings = await db.aISettings.create({
        data: {
          provider: 'nvidia',
          apiKey: '',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          model: 'deepseek-ai/deepseek-r1',
          temperature: 0.7,
          maxTokens: 8192,
        },
      });
    }

    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : '';

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update AI settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider: rawProvider, apiKey, baseUrl: rawBaseUrl, model: rawModel, temperature, maxTokens } = body;

    // Validate and auto-fill provider config
    const provider = rawProvider || 'nvidia';
    const providerConfig = getProviderConfig(provider);

    let baseUrl = rawBaseUrl;
    let model = rawModel;

    if (providerConfig && provider !== 'custom' && provider !== 'builtin') {
      if (!baseUrl) baseUrl = providerConfig.baseUrl;
      if (providerConfig.models.length > 0 && model) {
        const modelExists = providerConfig.models.some((m) => m.id === model);
        if (!modelExists) model = providerConfig.defaultModel;
      } else if (!model) {
        model = providerConfig.defaultModel;
      }
    }

    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        return NextResponse.json(
          { success: false, error: 'temperature 必须在 0-2 之间' },
          { status: 400 }
        );
      }
    }

    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens < 1) {
        return NextResponse.json(
          { success: false, error: 'maxTokens 必须为正整数' },
          { status: 400 }
        );
      }
    }

    let settings = await db.aISettings.findFirst();

    const updateData: Record<string, unknown> = {
      provider,
      baseUrl: baseUrl || providerConfig?.baseUrl || '',
      model: model || providerConfig?.defaultModel || '',
    };
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (apiKey && !apiKey.includes('****')) updateData.apiKey = apiKey;

    if (settings) {
      settings = await db.aISettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await db.aISettings.create({
        data: {
          provider,
          apiKey: (apiKey as string) || '',
          baseUrl: (baseUrl as string) || providerConfig?.baseUrl || '',
          model: (model as string) || providerConfig?.defaultModel || '',
          temperature: (temperature as number) ?? 0.7,
          maxTokens: (maxTokens as number) ?? 8192,
        },
      });
    }

    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : '';

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { success: false, error: '更新设置失败' },
      { status: 500 }
    );
  }
}
