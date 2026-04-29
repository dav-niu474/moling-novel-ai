import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const maxDuration = 60

// POST /api/setup - Initialize database schema
// This endpoint runs Prisma migrations to set up the database
export async function POST() {
  try {
    console.log('[setup] Starting database setup...')

    // Test database connection first
    console.log('[setup] Testing database connection...')
    await db.$queryRaw`SELECT 1`
    console.log('[setup] Database connection successful')

    // Try to create tables using raw SQL as a fallback
    // This ensures the schema exists even if prisma db push failed during build
    console.log('[setup] Checking/creating database tables...')

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "genre" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "chapterCount" INTEGER NOT NULL DEFAULT 30,
        "wordsPerChapter" INTEGER NOT NULL DEFAULT 3000,
        "coreSeed" TEXT NOT NULL DEFAULT '',
        "status" TEXT NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Character" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'supporting',
        "personality" TEXT NOT NULL DEFAULT '',
        "motivation" TEXT NOT NULL DEFAULT '',
        "arc" TEXT NOT NULL DEFAULT '',
        "relationships" TEXT NOT NULL DEFAULT '',
        "appearance" TEXT NOT NULL DEFAULT '',
        "background" TEXT NOT NULL DEFAULT '',
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WorldSetting" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "rules" TEXT NOT NULL DEFAULT '',
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChapterOutline" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" TEXT NOT NULL,
        "chapterNumber" INTEGER NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "summary" TEXT NOT NULL DEFAULT '',
        "keyPoints" TEXT NOT NULL DEFAULT '',
        "foreshadowing" TEXT NOT NULL DEFAULT '',
        "emotionBeat" TEXT NOT NULL DEFAULT '',
        "conflicts" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ChapterOutline_projectId_chapterNumber_key" UNIQUE ("projectId", "chapterNumber")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChapterContent" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" TEXT NOT NULL,
        "chapterNumber" INTEGER NOT NULL,
        "content" TEXT NOT NULL DEFAULT '',
        "wordCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("projectId", "chapterNumber") REFERENCES "ChapterOutline"("projectId", "chapterNumber") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ChapterContent_projectId_chapterNumber_key" UNIQUE ("projectId", "chapterNumber")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PromptTemplate" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "content" TEXT NOT NULL,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AISettings" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider" TEXT NOT NULL DEFAULT 'nvidia',
        "apiKey" TEXT NOT NULL DEFAULT '',
        "baseUrl" TEXT NOT NULL DEFAULT 'https://integrate.api.nvidia.com/v1',
        "model" TEXT NOT NULL DEFAULT 'meta/llama-3.3-70b-instruct',
        "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
        "maxTokens" INTEGER NOT NULL DEFAULT 8192,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "Character_projectId_idx" ON "Character"("projectId");',
      'CREATE INDEX IF NOT EXISTS "WorldSetting_projectId_idx" ON "WorldSetting"("projectId");',
      'CREATE INDEX IF NOT EXISTS "ChapterOutline_projectId_idx" ON "ChapterOutline"("projectId");',
      'CREATE INDEX IF NOT EXISTS "ChapterContent_projectId_idx" ON "ChapterContent"("projectId");',
      'CREATE INDEX IF NOT EXISTS "PromptTemplate_projectId_idx" ON "PromptTemplate"("projectId");',
    ]

    for (const sql of indexes) {
      await db.$executeRawUnsafe(sql)
    }

    // Seed default AI settings if not exist
    const existingSettings = await db.aISettings.findFirst()
    if (!existingSettings) {
      await db.aISettings.create({
        data: {
          provider: 'nvidia',
          apiKey: '',
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          model: 'meta/llama-3.3-70b-instruct',
          temperature: 0.7,
          maxTokens: 8192,
        },
      })
      console.log('[setup] Created default AI settings')
    }

    console.log('[setup] Database setup complete!')

    return NextResponse.json({
      success: true,
      message: 'Database schema created/verified successfully',
    })
  } catch (error: any) {
    console.error('[setup] Database setup failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
      details: error?.message || String(error),
      code: error?.code,
    }, { status: 500 })
  }
}

// GET /api/setup - Check database status
export async function GET() {
  try {
    // Check if tables exist by trying a simple query
    const tables = await db.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `) as Array<{ table_name: string }>

    const tableNames = tables.map(t => t.table_name)
    const requiredTables = ['Project', 'Character', 'WorldSetting', 'ChapterOutline', 'ChapterContent', 'PromptTemplate', 'AISettings']
    const missingTables = requiredTables.filter(t => !tableNames.includes(t))

    return NextResponse.json({
      connected: true,
      tables: tableNames,
      requiredTables,
      missingTables,
      needsSetup: missingTables.length > 0,
    })
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error?.message || String(error),
      needsSetup: true,
    }, { status: 500 })
  }
}
