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
 *
 * We need to swap:
 *   DATABASE_URL = {STORE}_POSTGRES_PRISMA_URL (pooled, for runtime)
 *   DIRECT_URL = {STORE}_POSTGRES_URL_NON_POOLING (direct, for migrations)
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
    'POSTGRES_PRISMA_URL',              // Neon standard (no prefix)
    'moling_POSTGRES_PRISMA_URL',       // Neon with "moling" store prefix
    'MOLING_POSTGRES_PRISMA_URL',       // Uppercase variant
  ])

  // Also search all env vars for any key containing "PRISMA_URL"
  const pooledFromScan = !pooledResult
    ? findEnvUrl(dbRelatedKeys.filter(k => k.includes('PRISMA')))
    : null

  // Find direct (non-pooled) connection URL (priority order)
  const directResult = findEnvUrl([
    'POSTGRES_URL_NON_POOLING',         // Neon standard
    'moling_POSTGRES_URL_NON_POOLING',  // Neon with "moling" store prefix
    'MOLING_POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',            // Alternative naming
    'moling_DATABASE_URL_UNPOOLED',
    'MOLING_DATABASE_URL_UNPOOLED',
  ])

  // Also search all env vars for any key containing "NON_POOLING" or "UNPOOLED"
  const directFromScan = !directResult
    ? findEnvUrl(dbRelatedKeys.filter(k => k.includes('NON_POOLING') || k.includes('UNPOOLED')))
    : null

  // Use pooled URL for DATABASE_URL (critical for Vercel serverless)
  const pooled = pooledResult || pooledFromScan
  const direct = directResult || directFromScan

  if (pooled) {
    process.env.DATABASE_URL = pooled.url
    console.log(`[db] Using POOLED connection as DATABASE_URL (from ${pooled.name})`)
  } else {
    // Fallback: check if current DATABASE_URL is already a PostgreSQL URL
    const currentUrl = process.env.DATABASE_URL
    if (currentUrl && (currentUrl.startsWith('postgresql://') || currentUrl.startsWith('postgres://'))) {
      // Check if it's a pooler URL (contains "pooler" in hostname)
      const isPooled = currentUrl.includes('-pooler.')
      if (!isPooled) {
        console.warn('[db] WARNING: DATABASE_URL is a DIRECT connection, not pooled.')
        console.warn('[db] This may cause connection exhaustion in serverless environments.')
        console.warn('[db] Please set a pooled connection URL (e.g., POSTGRES_PRISMA_URL)')
      }
    } else {
      console.error('[db] ERROR: No PostgreSQL URL found in environment variables.')
      console.error('[db] Available DB-related env vars:', dbRelatedKeys.length > 0 ? dbRelatedKeys.join(', ') : 'NONE')
    }
  }

  // Use direct URL for DIRECT_URL (for Prisma migrations)
  if (direct) {
    process.env.DIRECT_URL = direct.url
    console.log(`[db] Using DIRECT connection as DIRECT_URL (from ${direct.name})`)
  } else if (!process.env.DIRECT_URL || !process.env.DIRECT_URL.startsWith('postgresql')) {
    // Fallback: use DATABASE_URL as DIRECT_URL
    process.env.DIRECT_URL = process.env.DATABASE_URL
    console.log('[db] DIRECT_URL not found, falling back to DATABASE_URL')
  }
}

// Resolve env vars before creating PrismaClient
resolveDatabaseUrls()

// Log for debugging (masked URL)
const dbUrl = process.env.DATABASE_URL
if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
  const masked = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  const isPooled = dbUrl.includes('-pooler.')
  console.log(`[db] DATABASE_URL: ${masked} (${isPooled ? 'POOLED ✓' : 'DIRECT ⚠️'})`)
} else {
  console.error(`[db] DATABASE_URL is not a PostgreSQL URL: ${dbUrl ? dbUrl.substring(0, 20) + '...' : 'undefined'}`)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
