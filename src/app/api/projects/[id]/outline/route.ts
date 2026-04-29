import { db, ensureDbInitialized } from '@/lib/db'
import { aiChatStreamCollect, parseAIJSON } from '@/lib/ai'
import { outlinePrompt } from '@/lib/prompts'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60;

// POST /api/projects/[id]/outline - Generate chapter outlines using AI
// Uses streaming internally to avoid Vercel timeout, but saves to DB before responding
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let projectId: string | undefined;
  try {
    await ensureDbInitialized()
    const { id } = await params;
    projectId = id;

    // Get project with characters and world settings
    const project = await db.project.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
    }

    if (!project.coreSeed) {
      return NextResponse.json({ success: false, error: '请先生成小说架构' }, { status: 400 });
    }

    // Update status
    await db.project.update({
      where: { id },
      data: { status: 'outlining' },
    });

    // Prepare context
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n');

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}（${ws.category}）：${ws.description}`)
      .join('\n');

    const effectiveChapterCount = Math.min(project.chapterCount, 10);
    const outlineMaxTokens = Math.min(Math.max(effectiveChapterCount * 500, 4096), 16384);

    const prompts = outlinePrompt({
      title: project.title,
      genre: project.genre,
      chapterCount: effectiveChapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed: project.coreSeed,
      characters: charactersSummary || '暂无角色信息',
      worldSettings: worldSettingsSummary || '暂无世界设定',
      plotStructure: `架构核心种子：${project.coreSeed}`,
    });

    // Use streaming internally but collect full response before saving
    const resultText = await aiChatStreamCollect([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ], { maxTokens: outlineMaxTokens });

    // Parse the AI response
    let outlines;
    try {
      outlines = parseAIJSON<Array<{
        chapterNumber: number;
        title: string;
        summary: string;
        keyPoints: string[] | string;
        foreshadowing: string[] | string;
        emotionBeat: string;
        conflicts: Array<{ type: string; description: string }> | string;
      }>>(resultText);
    } catch (parseError) {
      console.error('Failed to parse outline JSON:', parseError);
      await db.project.update({ where: { id }, data: { status: 'architecting' } });
      return NextResponse.json({ success: false, error: 'AI生成的大纲格式无法解析，请重试' }, { status: 500 });
    }

    if (!Array.isArray(outlines) || outlines.length === 0) {
      await db.project.update({ where: { id }, data: { status: 'architecting' } });
      return NextResponse.json({ success: false, error: 'AI未生成有效大纲，请重试' }, { status: 500 });
    }

    // Save outlines to database
    await db.$transaction(async (tx) => {
      await tx.chapterOutline.deleteMany({ where: { projectId: id } });
      for (const outline of outlines) {
        await tx.chapterOutline.create({
          data: {
            projectId: id,
            chapterNumber: outline.chapterNumber,
            title: outline.title || `第${outline.chapterNumber}章`,
            summary: outline.summary || '',
            keyPoints: typeof outline.keyPoints === 'string' ? outline.keyPoints : JSON.stringify(outline.keyPoints || []),
            foreshadowing: typeof outline.foreshadowing === 'string' ? outline.foreshadowing : JSON.stringify(outline.foreshadowing || []),
            emotionBeat: outline.emotionBeat || '',
            conflicts: typeof outline.conflicts === 'string' ? outline.conflicts : JSON.stringify(outline.conflicts || []),
          },
        });
      }
      await tx.project.update({ where: { id }, data: { status: 'outlining' } });
    });

    // Fetch saved outlines
    const savedOutlines = await db.chapterOutline.findMany({
      where: { projectId: id },
      orderBy: { chapterNumber: 'asc' },
    });

    return NextResponse.json(savedOutlines);
  } catch (error) {
    console.error('Outline generation failed:', error);
    if (projectId) {
      try { await db.project.update({ where: { id: projectId }, data: { status: 'architecting' } }); } catch {}
    }
    return NextResponse.json({ error: '大纲生成失败，请重试' }, { status: 500 });
  }
}
