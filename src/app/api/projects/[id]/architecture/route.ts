import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiChat, parseAIJSON } from '@/lib/ai';
import { architecturePrompt } from '@/lib/prompts';

// POST /api/projects/[id]/architecture - Generate novel architecture using AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { coreSeed } = body;

    // Get project
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // Update status to architecting
    await db.project.update({
      where: { id },
      data: { status: 'architecting' },
    });

    // Generate architecture using AI
    const prompts = architecturePrompt({
      title: project.title,
      genre: project.genre,
      description: project.description,
      chapterCount: project.chapterCount,
      wordsPerChapter: project.wordsPerChapter,
      coreSeed: coreSeed || project.coreSeed || undefined,
    });

    const resultText = await aiChat([
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ]);

    // Parse the AI response
    let architecture;
    try {
      architecture = parseAIJSON<{
        coreSeed: string;
        characters: Array<{
          name: string;
          role: string;
          personality: string;
          motivation: string;
          arc: string;
          relationships: Record<string, string>;
          appearance: string;
          background: string;
        }>;
        worldSettings: Array<{
          category: string;
          name: string;
          description: string;
          rules: string;
        }>;
        plotStructure: {
          setup: string;
          risingAction: string;
          midpoint: string;
          fallingAction: string;
          climax: string;
          resolution: string;
        };
      }>(resultText);
    } catch (parseError) {
      console.error('Failed to parse architecture JSON:', parseError);
      console.error('Raw AI response:', resultText);
      await db.project.update({ where: { id }, data: { status: 'draft' } });
      return NextResponse.json(
        { success: false, error: 'AI生成的架构格式无法解析，请重试' },
        { status: 500 }
      );
    }

    // Save to database in a transaction
    await db.$transaction(async (tx) => {
      // Update project core seed and status
      await tx.project.update({
        where: { id },
        data: {
          coreSeed: architecture.coreSeed,
          status: 'architecting',
        },
      });

      // Delete existing characters and world settings (regenerating)
      await tx.character.deleteMany({ where: { projectId: id } });
      await tx.worldSetting.deleteMany({ where: { projectId: id } });

      // Save characters
      if (architecture.characters && architecture.characters.length > 0) {
        await tx.character.createMany({
          data: architecture.characters.map((char, index) => ({
            projectId: id,
            name: char.name,
            role: char.role || 'supporting',
            personality: char.personality,
            motivation: char.motivation,
            arc: char.arc,
            relationships: typeof char.relationships === 'string'
              ? char.relationships
              : JSON.stringify(char.relationships || {}),
            appearance: char.appearance,
            background: char.background,
            order: index,
          })),
        });
      }

      // Save world settings
      if (architecture.worldSettings && architecture.worldSettings.length > 0) {
        await tx.worldSetting.createMany({
          data: architecture.worldSettings.map((ws, index) => ({
            projectId: id,
            category: ws.category || 'general',
            name: ws.name,
            description: ws.description,
            rules: ws.rules,
            order: index,
          })),
        });
      }
    });

    // Fetch updated project with related data
    const updatedProject = await db.project.findUnique({
      where: { id },
      include: {
        characters: { orderBy: { order: 'asc' } },
        worldSettings: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        coreSeed: architecture.coreSeed,
        plotStructure: architecture.plotStructure,
        characters: updatedProject?.characters,
        worldSettings: updatedProject?.worldSettings,
      },
    });
  } catch (error) {
    console.error('Architecture generation failed:', error);
    // Try to reset status
    try {
      const { id } = await params;
      await db.project.update({
        where: { id },
        data: { status: 'draft' },
      });
    } catch {
      // Ignore reset errors
    }
    return NextResponse.json(
      { success: false, error: '架构生成失败，请重试' },
      { status: 500 }
    );
  }
}
