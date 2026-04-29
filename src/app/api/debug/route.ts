import { NextResponse } from 'next/server'

// Debug endpoint to check database env var availability on Vercel
// REMOVE THIS IN PRODUCTION
export async function GET() {
  const envVars: Record<string, string> = {}

  // Check all database-related env vars
  const dbVarNames = [
    'DATABASE_URL',
    'DIRECT_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL_UNPOOLED',
    'NEON_DATABASE_URL',
    'MOLING_POSTGRES_URL',
    'MOLING_POSTGRES_PRISMA_URL',
    'MOLING_POSTGRES_URL_NON_POOLING',
    'moling_POSTGRES_URL',
    'moling_POSTGRES_PRISMA_URL',
    'POSTGRES_USER',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'POSTGRES_DATABASE',
  ]

  for (const varName of dbVarNames) {
    const value = process.env[varName]
    if (value) {
      // Mask sensitive parts
      if (value.startsWith('postgresql://') || value.startsWith('postgres://')) {
        envVars[varName] = value.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      } else if (value.length > 20) {
        envVars[varName] = value.slice(0, 4) + '****' + value.slice(-4)
      } else {
        envVars[varName] = 'SET (short value)'
      }
    } else {
      envVars[varName] = 'NOT SET'
    }
  }

  // Also find all env vars containing POSTGRES, NEON, or DATABASE
  const allEnvKeys = Object.keys(process.env).filter(
    k => k.includes('POSTGRES') || k.includes('NEON') || k.includes('DATABASE')
  )

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    checkedVars: envVars,
    allDbRelatedKeys: allEnvKeys,
  })
}
