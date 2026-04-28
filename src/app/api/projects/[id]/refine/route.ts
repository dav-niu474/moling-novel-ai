import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai';
import { refinePrompt } from '@/lib/prompts';

// POST /api/projects/[id]/refine - Refine text using AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, action, context } = body;

    if (!text || !action) {
      return NextResponse.json(
        { success: false, error: '请提供文本和操作类型' },
        { status: 400 }
      );
    }

    const validActions = ['polish', 'expand', 'deAI', 'strengthen'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `无效的操作类型，支持：${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const prompts = refinePrompt({
      text,
      action: action as 'polish' | 'expand' | 'deAI' | 'strengthen',
      context: context || `项目ID: ${id}`,
    });

    const refinedText = await aiChat([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        original: text,
        refined: refinedText,
        action,
      },
    });
  } catch (error) {
    console.error('Refinement failed:', error);
    return NextResponse.json(
      { success: false, error: '文本润色失败，请重试' },
      { status: 500 }
    );
  }
}
