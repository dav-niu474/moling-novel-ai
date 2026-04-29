import { PrismaClient } from '@prisma/client'

/**
 * Resolve database URLs for Prisma on Vercel + Neon PostgreSQL.
 *
 * Key insight: In Vercel serverless, we MUST use the POOLED connection URL
 * for runtime queries (DATABASE_URL) because:
 * - Serverless functions create many short-lived connections
 * - Direct connections will exhaust the database's connection limit
 * - The pooler endpoint (-pooler) handles connection reuse
 *
 * On Vercel, Neon sets env vars like:
 *   - DATABASE_URL → direct (non-pooled) connection
 *   - {STORE}_POSTGRES_PRISMA_URL → pooled connection (for Prisma runtime)
 *   - {STORE}_POSTGRES_URL_NON_POOLING → direct connection (for migrations)
 *   - {STORE}_DATABASE_URL_UNPOOLED → direct connection (alternative name)
 */

function findEnvUrl(varNames: string[]): { name: string; url: string } | undefined {
  for (const varName of varNames) {
    const value = process.env[varName]
    if (value && (value.startsWith('postgresql://') || value.startsWith('postgres://'))) {
      return { name: varName, url: value }
    }
  }
  return undefined
}

function resolveDatabaseUrls() {
  // Scan for all available Neon PostgreSQL URLs
  const allEnvKeys = Object.keys(process.env)
  const dbRelatedKeys = allEnvKeys.filter(
    k => k.includes('POSTGRES') || k.includes('NEON') || k.includes('DATABASE')
  )

  // Find pooled connection URL (priority order)
  const pooledResult = findEnvUrl([
    'POSTGRES_PRISMA_URL',
    'moling_POSTGRES_PRISMA_URL',
    'MOLING_POSTGRES_PRISMA_URL',
  ])

  // Also search all env vars for any key containing "PRISMA_URL"
  const pooledFromScan = !pooledResult
    ? findEnvUrl(dbRelatedKeys.filter(k => k.includes('PRISMA')))
    : null

  // Find direct (non-pooled) connection URL (priority order)
  const directResult = findEnvUrl([
    'POSTGRES_URL_NON_POOLING',
    'moling_POSTGRES_URL_NON_POOLING',
    'MOLING_POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'moling_DATABASE_URL_UNPOOLED',
    'MOLING_DATABASE_URL_UNPOOLED',
  ])

  const directFromScan = !directResult
    ? findEnvUrl(dbRelatedKeys.filter(k => k.includes('NON_POOLING') || k.includes('UNPOOLED')))
    : null

  // Use pooled URL for DATABASE_URL (critical for Vercel serverless)
  const pooled = pooledResult || pooledFromScan
  const direct = directResult || directFromScan

  if (pooled) {
    process.env.DATABASE_URL = pooled.url
  } else {
    const currentUrl = process.env.DATABASE_URL
    if (currentUrl && (currentUrl.startsWith('postgresql://') || currentUrl.startsWith('postgres://'))) {
      const isPooled = currentUrl.includes('-pooler.')
      if (!isPooled) {
        console.warn('[db] WARNING: DATABASE_URL is a DIRECT connection, not pooled. May cause connection exhaustion in serverless.')
      }
    }
  }

  // Use direct URL for DIRECT_URL (for Prisma migrations and interactive transactions)
  if (direct) {
    process.env.DIRECT_URL = direct.url
  } else if (!process.env.DIRECT_URL || !process.env.DIRECT_URL.startsWith('postgresql')) {
    process.env.DIRECT_URL = process.env.DATABASE_URL
  }
}

// Resolve env vars before creating PrismaClient
resolveDatabaseUrls()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ---- Auto-initialize database on first query ----
let dbInitialized = false
let dbInitPromise: Promise<void> | null = null

/**
 * Ensure database tables exist before running queries.
 * This runs automatically on the first database operation.
 * It's a safety net in case `prisma db push` didn't run during build.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    try {
      // Quick check: try a simple query to see if tables exist
      await db.$queryRaw`SELECT 1 FROM "AISettings" LIMIT 1`
      dbInitialized = true
    } catch {
      // Tables don't exist - auto-create them
      console.log('[db] Tables not found, auto-initializing database schema...')
      try {
        await initializeDatabase()
        dbInitialized = true
        console.log('[db] Database auto-initialized successfully')
      } catch (initError) {
        console.error('[db] Failed to auto-initialize database:', initError)
        throw initError
      }
    }
  })()

  return dbInitPromise
}

async function initializeDatabase(): Promise<void> {
  // Drop old tables if they have wrong schema
  const dropTables = [
    'DROP TABLE IF EXISTS "ChapterContent" CASCADE',
    'DROP TABLE IF EXISTS "ChapterOutline" CASCADE',
    'DROP TABLE IF EXISTS "PromptTemplate" CASCADE',
    'DROP TABLE IF EXISTS "WorldSetting" CASCADE',
    'DROP TABLE IF EXISTS "Character" CASCADE',
    'DROP TABLE IF EXISTS "AISettings" CASCADE',
    'DROP TABLE IF EXISTS "Project" CASCADE',
  ]
  for (const sql of dropTables) {
    try { await db.$executeRawUnsafe(sql) } catch { /* ignore */ }
  }

  // Create tables
  await db.$executeRawUnsafe(`
    CREATE TABLE "Project" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" TEXT NOT NULL, "genre" TEXT NOT NULL,
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
    CREATE TABLE "Character" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" TEXT NOT NULL, "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'supporting',
      "personality" TEXT NOT NULL DEFAULT '', "motivation" TEXT NOT NULL DEFAULT '',
      "arc" TEXT NOT NULL DEFAULT '', "relationships" TEXT NOT NULL DEFAULT '',
      "appearance" TEXT NOT NULL DEFAULT '', "background" TEXT NOT NULL DEFAULT '',
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE TABLE "WorldSetting" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general', "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '', "rules" TEXT NOT NULL DEFAULT '',
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE TABLE "ChapterOutline" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" TEXT NOT NULL, "chapterNumber" INTEGER NOT NULL,
      "title" TEXT NOT NULL DEFAULT '', "summary" TEXT NOT NULL DEFAULT '',
      "keyPoints" TEXT NOT NULL DEFAULT '', "foreshadowing" TEXT NOT NULL DEFAULT '',
      "emotionBeat" TEXT NOT NULL DEFAULT '', "conflicts" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ChapterOutline_projectId_chapterNumber_key" UNIQUE ("projectId", "chapterNumber")
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE TABLE "ChapterContent" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" TEXT NOT NULL, "chapterNumber" INTEGER NOT NULL,
      "content" TEXT NOT NULL DEFAULT '',
      "wordCount" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'draft',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("projectId", "chapterNumber") REFERENCES "ChapterOutline"("projectId", "chapterNumber") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ChapterContent_projectId_chapterNumber_key" UNIQUE ("projectId", "chapterNumber")
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE TABLE "PromptTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" TEXT NOT NULL, "name" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general', "content" TEXT NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false, "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE TABLE "AISettings" (
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
  for (const sql of [
    'CREATE INDEX IF NOT EXISTS "Character_projectId_idx" ON "Character"("projectId")',
    'CREATE INDEX IF NOT EXISTS "WorldSetting_projectId_idx" ON "WorldSetting"("projectId")',
    'CREATE INDEX IF NOT EXISTS "ChapterOutline_projectId_idx" ON "ChapterOutline"("projectId")',
    'CREATE INDEX IF NOT EXISTS "ChapterContent_projectId_idx" ON "ChapterContent"("projectId")',
    'CREATE INDEX IF NOT EXISTS "PromptTemplate_projectId_idx" ON "PromptTemplate"("projectId")',
  ]) {
    await db.$executeRawUnsafe(sql)
  }

  // Seed default AI settings
  await db.$executeRawUnsafe(`
    INSERT INTO "AISettings" ("id", "provider", "apiKey", "baseUrl", "model", "temperature", "maxTokens")
    VALUES (gen_random_uuid(), 'nvidia', '', 'https://integrate.api.nvidia.com/v1', 'meta/llama-3.3-70b-instruct', 0.7, 8192)
  `)
}
