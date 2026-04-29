import { PrismaClient } from '@prisma/client'

/**
 * Resolve database URLs for Prisma on Vercel + Neon PostgreSQL.
 *
 * On Vercel, the Neon PostgreSQL integration sets env vars like:
 *   - POSTGRES_PRISMA_URL (pooled, for runtime queries - has pgbouncer=true)
 *   - POSTGRES_URL_NON_POOLING (direct, for migrations)
 *   - POSTGRES_URL (standard connection)
 *   - Or with a store prefix: {STORE}_POSTGRES_PRISMA_URL
 *
 * Prisma expects: DATABASE_URL (pooled) and DIRECT_URL (direct)
 * This module maps Neon's env vars to what Prisma expects.
 */

/**
 * Find the first PostgreSQL URL from a list of env var names
 */
function findPostgresUrl(varNames: string[]): string | undefined {
  for (const varName of varNames) {
    const value = process.env[varName]
    if (value && (value.startsWith('postgresql://') || value.startsWith('postgres://'))) {
      return value
    }
  }
  return undefined
}

function resolveDatabaseUrls() {
  // 1. If DATABASE_URL is already a PostgreSQL URL, it's properly configured
  const currentDbUrl = process.env.DATABASE_URL
  if (currentDbUrl && (currentDbUrl.startsWith('postgresql://') || currentDbUrl.startsWith('postgres://'))) {
    // Ensure DIRECT_URL is also set (fallback to DATABASE_URL if not)
    if (!process.env.DIRECT_URL) {
      process.env.DIRECT_URL = process.env.DATABASE_URL
    }
    return
  }

  // 2. Try Neon PostgreSQL env vars with various naming patterns
  // Common Neon store prefixes (empty string = no prefix)
  const storePrefixes = ['', 'NEON_', 'MOLING_', 'moling_']

  // Pooled connection candidates (for runtime queries)
  const pooledVarNames: string[] = []
  for (const prefix of storePrefixes) {
    pooledVarNames.push(
      `${prefix}POSTGRES_PRISMA_URL`,
      `${prefix}POSTGRES_URL`,
      `${prefix}DATABASE_URL`,
    )
  }

  // Direct connection candidates (for migrations)
  const directVarNames: string[] = []
  for (const prefix of storePrefixes) {
    directVarNames.push(
      `${prefix}POSTGRES_URL_NON_POOLING`,
      `${prefix}POSTGRES_URL_UNPOOLED`,
      `${prefix}DIRECT_URL`,
    )
  }

  const pooledUrl = findPostgresUrl(pooledVarNames)
  const directUrl = findPostgresUrl(directVarNames)

  if (pooledUrl) {
    process.env.DATABASE_URL = pooledUrl
    process.env.DIRECT_URL = directUrl || pooledUrl
  } else {
    // No PostgreSQL URL found - log available env vars for debugging
    const availableDbVars = Object.keys(process.env).filter(
      k => k.includes('POSTGRES') || k.includes('NEON') || k.includes('DATABASE')
    )
    console.error('[db] ERROR: No PostgreSQL URL found in environment variables.')
    console.error('[db] Available DB-related env vars:', availableDbVars.length > 0 ? availableDbVars.join(', ') : 'NONE')
  }
}

// Resolve env vars before creating PrismaClient
resolveDatabaseUrls()

// Log for debugging (masked URL)
const dbUrl = process.env.DATABASE_URL
if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
  const masked = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  console.log(`[db] DATABASE_URL: ${masked}`)
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
