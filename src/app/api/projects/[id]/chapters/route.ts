import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { aiChatStreamCollect } from '@/lib/ai';
import { chapterWritingPrompt } from '@/lib/prompts';

export const maxDuration = 60;

// POST /api/projects/[id]/chapters - Generate chapter content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber } = body;

    if (!chapterNumber || typeof chapterNumber !== 'number') {
      return NextResponse.json(
        { success: false, error: '请指定章节号' },
        { status: 400 }
      );
    }

    // Get project with all context
    const project = await db.project.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
        chapterOutlines: {
          where: { chapterNumber },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    const outline = project.chapterOutlines[0];
    if (!outline) {
      return NextResponse.json(
        { success: false, error: '该章节没有大纲，请先生成大纲' },
        { status: 400 }
      );
    }

    // Get previous chapter summary for context
    let previousChapterSummary = '';
    if (chapterNumber > 1) {
      const prevOutline = await db.chapterOutline.findUnique({
        where: {
          projectId_chapterNumber: { projectId: id, chapterNumber: chapterNumber - 1 },
        },
      });
      if (prevOutline) {
        previousChapterSummary = prevOutline.summary;
      }
    }

    // Prepare character context
    const charactersSummary = project.characters
      .map((c) => `${c.name}（${c.role}）：${c.personality} | 动机：${c.motivation}`)
      .join('\n');

    const worldSettingsSummary = project.worldSettings
      .map((ws) => `${ws.name}：${ws.description}`)
      .join('\n');

    // Generate chapter content
    const prompts = chapterWritingPrompt({
      title: project.title,
      genre: project.genre,
      chapterNumber,
      chapterTitle: outline.title,
      chapterSummary: outline.summary,
      keyPoints: outline.keyPoints,
      foreshadowing: outline.foreshadowing,
      emotionBeat: outline.emotionBeat,
      conflicts: outline.conflicts,
      characters: charactersSummary,
      worldSettings: worldSettingsSummary,
      previousChapterSummary,
      wordsPerChapter: project.wordsPerChapter,
    });

    const fullContent = await aiChatStreamCollect([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ]);

    // Save to database
    const wordCount = fullContent.length;
    await db.chapterContent.upsert({
      where: {
        projectId_chapterNumber: { projectId: id, chapterNumber },
      },
      create: {
        projectId: id,
        chapterNumber,
        content: fullContent,
        wordCount,
        status: 'generated',
      },
      update: {
        content: fullContent,
        wordCount,
        status: 'generated',
      },
    });

    // Update project status
    await db.project.update({
      where: { id },
      data: { status: 'writing' },
    });

    return NextResponse.json({
      success: true,
      data: {
        chapterNumber,
        content: fullContent,
        wordCount,
        status: 'generated',
      },
    });
  } catch (error) {
    console.error('Chapter generation failed:', error);
    return NextResponse.json(
      { success: false, error: '章节生成失败，请重试' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/chapters - Update chapter content (for manual edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber, content, status } = body;

    if (!chapterNumber || content === undefined) {
      return NextResponse.json(
        { success: false, error: '请指定章节号和内容' },
        { status: 400 }
      );
    }

    // Check if chapter outline exists
    const outline = await db.chapterOutline.findUnique({
      where: {
        projectId_chapterNumber: { projectId: id, chapterNumber },
      },
    });

    if (!outline) {
      return NextResponse.json(
        { success: false, error: '该章节大纲不存在' },
        { status: 404 }
      );
    }

    const wordCount = content.length;

    const chapterContent = await db.chapterContent.upsert({
      where: {
        projectId_chapterNumber: { projectId: id, chapterNumber },
      },
      create: {
        projectId: id,
        chapterNumber,
        content,
        wordCount,
        status: status || 'draft',
      },
      update: {
        content,
        wordCount,
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, data: chapterContent });
  } catch (error) {
    console.error('Failed to update chapter content:', error);
    return NextResponse.json(
      { success: false, error: '更新章节内容失败' },
      { status: 500 }
    );
  }
}
