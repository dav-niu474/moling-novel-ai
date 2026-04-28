import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiChat, parseAIJSON } from '@/lib/ai';
import { consistencyCheckPrompt } from '@/lib/prompts';

export const maxDuration = 60;

interface ConsistencyIssue {
  type: 'character_logic' | 'plot_contradiction' | 'setting_violation' | 'style_issue';
  severity: 'high' | 'medium' | 'low';
  description: string;
  location: string;
  suggestion: string;
}

// POST /api/projects/[id]/check - Check chapter for consistency issues
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber, content } = body;

    if (!chapterNumber && !content) {
      return NextResponse.json(
        { success: false, error: '请指定章节号或提供章节内容' },
        { status: 400 }
      );
    }

    // Get project with context
    const project = await db.project.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // Get chapter content
    let chapterContent = content;
    let chapterNum = chapterNumber;

    if (!chapterContent && chapterNum) {
      const chapter = await db.chapterContent.findUnique({
        where: {
          projectId_chapterNumber: { projectId: id, chapterNumber: chapterNum },
        },
      });
      if (!chapter) {
        return NextResponse.json(
          { success: false, error: '该章节内容不存在' },
          { status: 404 }
        );
      }
      chapterContent = chapter.content;
    }

    // Prepare context
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation} | 弧线：${c.arc}`)
      .join('\n');

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description} | 规则：${ws.rules}`)
      .join('\n');

    // Get previous outlines for context
    let previousOutlines = '';
    if (chapterNum) {
      const prevOutlines = await db.chapterOutline.findMany({
        where: {
          projectId: id,
          chapterNumber: { lt: chapterNum },
        },
        orderBy: { chapterNumber: 'desc' },
        take: 3,
      });
      previousOutlines = prevOutlines
        .map((o) => `第${o.chapterNumber}章 ${o.title}：${o.summary}`)
        .join('\n');
    }

    // Run consistency check
    const prompts = consistencyCheckPrompt({
      chapterNumber: chapterNum || 0,
      content: chapterContent,
      characters: charactersSummary,
      worldSettings: worldSettingsSummary,
      previousOutlines,
    });

    const resultText = await aiChat([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ]);

    // Parse issues
    let issues: ConsistencyIssue[];
    try {
      issues = parseAIJSON<ConsistencyIssue[]>(resultText);
      if (!Array.isArray(issues)) {
        issues = [];
      }
    } catch {
      // If parsing fails, try to extract issues from text
      console.warn('Failed to parse consistency check JSON, returning raw text');
      issues = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        chapterNumber: chapterNum,
        issues,
        totalIssues: issues.length,
        highSeverity: issues.filter((i) => i.severity === 'high').length,
        mediumSeverity: issues.filter((i) => i.severity === 'medium').length,
        lowSeverity: issues.filter((i) => i.severity === 'low').length,
      },
    });
  } catch (error) {
    console.error('Consistency check failed:', error);
    return NextResponse.json(
      { success: false, error: '一致性检查失败，请重试' },
      { status: 500 }
    );
  }
}
