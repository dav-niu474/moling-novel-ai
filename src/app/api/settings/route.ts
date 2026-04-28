import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings - Get current AI settings (mask apiKey)
export async function GET() {
  try {
    let settings = await db.aISettings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await db.aISettings.create({
        data: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 4096,
        },
      });
    }

    // Mask the API key for security
    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : '';

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        apiKey: maskedApiKey,
        hasApiKey: !!settings.apiKey,
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
    const { apiKey, baseUrl, model, temperature, maxTokens } = body;

    // Get or create settings
    let settings = await db.aISettings.findFirst();

    const updateData: Record<string, unknown> = {};
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        return NextResponse.json(
          { success: false, error: 'temperature 必须在 0-2 之间' },
          { status: 400 }
        );
      }
      updateData.temperature = temperature;
    }
    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens < 1) {
        return NextResponse.json(
          { success: false, error: 'maxTokens 必须为正整数' },
          { status: 400 }
        );
      }
      updateData.maxTokens = maxTokens;
    }

    if (settings) {
      settings = await db.aISettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await db.aISettings.create({
        data: {
          apiKey: (apiKey as string) || '',
          baseUrl: (baseUrl as string) || 'https://api.openai.com/v1',
          model: (model as string) || 'gpt-4o-mini',
          temperature: (temperature as number) ?? 0.7,
          maxTokens: (maxTokens as number) ?? 4096,
        },
      });
    }

    // Mask the API key in response
    const maskedApiKey = settings.apiKey
      ? settings.apiKey.slice(0, 4) + '****' + settings.apiKey.slice(-4)
      : '';

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        apiKey: maskedApiKey,
        hasApiKey: !!settings.apiKey,
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
