import { aiChat } from '@/lib/ai'
import { refinePrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'

// Map frontend actions to refinePrompt actions
// refinePrompt supports: 'polish' | 'expand' | 'deAI' | 'strengthen'
// Frontend sends: 'polish' | 'expand' | 'de-ai' | 'conflict' | 'detail' | 'dialogue'
function mapAction(action: string): { promptAction: 'polish' | 'expand' | 'deAI' | 'strengthen'; customSystem?: string; customUser?: string } {
  switch (action) {
    case 'polish':
      return { promptAction: 'polish' }
    case 'expand':
      return { promptAction: 'expand' }
    case 'de-ai':
      return { promptAction: 'deAI' }
    case 'conflict':
      return { promptAction: 'strengthen' }
    case 'detail':
      return { promptAction: 'expand' }
    case 'dialogue':
      return {
        promptAction: 'polish',
        customSystem: `你是一位资深网文编辑，擅长完善人物对话。

你的任务是：优化文本中的人物对话，让每个角色的说话方式更有辨识度和个性，增强对话的潜台词和言外之意。

重点关注：
1. 每个角色的说话方式要有独特性（语气、用词、节奏）
2. 对话要推动情节而非重复已知信息
3. 增加潜台词和言外之意，让对话有层次感
4. 对话要有冲突和张力，不能一团和气
5. 适当加入肢体语言和微表情来补充对话
6. 保持网文风格的快节奏和可读性

规则：
1. 只修改需要修改的地方，保留原文的精华
2. 不改变核心情节和人物性格
3. 直接输出修改后的完整文本，不要解释修改了什么`,
        customUser: `请完善以下文本中的对话：\n\n`,
      }
    default:
      return { promptAction: 'polish' }
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, chapterNumber, action, content } = await request.json()
    if (!content || !action) {
      return NextResponse.json({ error: 'content and action are required' }, { status: 400 })
    }

    const { promptAction, customSystem, customUser } = mapAction(action)

    let refinedText: string

    if (customSystem && customUser) {
      // Use custom prompts for actions not natively supported by refinePrompt
      refinedText = await aiChat([
        { role: 'system', content: customSystem },
        { role: 'user', content: customUser + content },
      ])
    } else {
      // Use standard refinePrompt
      const prompts = refinePrompt({
        text: content,
        action: promptAction,
        context: projectId ? `项目ID: ${projectId}` : undefined,
      })

      refinedText = await aiChat([
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ])
    }

    return NextResponse.json({ content: refinedText })
  } catch (error) {
    console.error('Refinement failed:', error)
    return NextResponse.json({ error: '文本润色失败，请重试' }, { status: 500 })
  }
}
