import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

// GET /api/projects/[id]/export - Export novel in TXT or Markdown format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'txt';

    if (!['txt', 'md'].includes(format)) {
      return NextResponse.json(
        { success: false, error: '不支持的格式，请使用 txt 或 md' },
        { status: 400 }
      );
    }

    // Get project with all content
    const project = await db.project.findUnique({
      where: { id },
      include: {
        chapterOutlines: { orderBy: { chapterNumber: 'asc' } },
        chapterContents: { orderBy: { chapterNumber: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // Build content map
    const contentMap = new Map<number, string>();
    for (const content of project.chapterContents) {
      contentMap.set(content.chapterNumber, content.content);
    }

    let output = '';

    if (format === 'md') {
      output += `# ${project.title}\n\n`;
      output += `> ${project.genre}${project.description ? ` | ${project.description}` : ''}\n\n`;
      output += `---\n\n`;

      for (const outline of project.chapterOutlines) {
        const content = contentMap.get(outline.chapterNumber);
        output += `## 第${outline.chapterNumber}章 ${outline.title}\n\n`;
        if (content) {
          output += `${content}\n\n`;
        } else {
          output += `*（该章节尚未生成）*\n\n`;
        }
        output += `---\n\n`;
      }
    } else {
      // TXT format
      output += `${project.title}\n`;
      output += `${project.genre}${project.description ? ` | ${project.description}` : ''}\n`;
      output += `${'='.repeat(40)}\n\n`;

      for (const outline of project.chapterOutlines) {
        const content = contentMap.get(outline.chapterNumber);
        output += `第${outline.chapterNumber}章 ${outline.title}\n`;
        output += `${'-'.repeat(30)}\n`;
        if (content) {
          output += `${content}\n\n`;
        } else {
          output += `（该章节尚未生成）\n\n`;
        }
      }
    }

    const contentType = format === 'md' ? 'text/markdown' : 'text/plain';
    const filename = `${project.title}.${format}`;

    return new Response(output, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
