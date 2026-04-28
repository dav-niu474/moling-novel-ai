import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Fix: Ensure DATABASE_URL points to PostgreSQL, not stale SQLite value from system env
// The system env may have an old DATABASE_URL=file:... from a previous SQLite setup
// Next.js loads .env values, but system env vars take precedence
if (process.env.DATABASE_URL?.startsWith('file:')) {
  // Try to read from .env file directly if system env has wrong value
  try {
    const envPath = join(process.cwd(), '.env')
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8')
      const match = envContent.match(/DATABASE_URL\s*=\s*["']?(postgresql:\/\/[^"'\s]+)["']?/)
      if (match) {
        process.env.DATABASE_URL = match[1]
      }
    }
  } catch {
    // If we can't read .env, let Prisma use whatever is set
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
