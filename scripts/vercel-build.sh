#!/bin/bash
# Vercel build script for Neon PostgreSQL
# This script ensures the database schema is pushed before building the app

set -e

echo "🔧 Starting Vercel build with Neon PostgreSQL setup..."

# Set DIRECT_URL for Prisma migrations from the Neon env vars
# The Neon integration sets these with the store prefix (e.g., moling_)
if [ -n "$moling_DATABASE_URL_UNPOOLED" ]; then
  export DIRECT_URL="$moling_DATABASE_URL_UNPOOLED"
  echo "✅ DIRECT_URL set from moling_DATABASE_URL_UNPOOLED"
elif [ -n "$moling_POSTGRES_URL_NON_POOLING" ]; then
  export DIRECT_URL="$moling_POSTGRES_URL_NON_POOLING"
  echo "✅ DIRECT_URL set from moling_POSTGRES_URL_NON_POOLING"
elif [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DIRECT_URL="$POSTGRES_URL_NON_POOLING"
  echo "✅ DIRECT_URL set from POSTGRES_URL_NON_POOLING"
elif [ -n "$DIRECT_URL" ]; then
  echo "✅ DIRECT_URL already set"
else
  echo "⚠️  DIRECT_URL not found, using DATABASE_URL as fallback"
  export DIRECT_URL="$DATABASE_URL"
fi

# For runtime queries, use pooled connection
if [ -n "$moling_POSTGRES_PRISMA_URL" ]; then
  export DATABASE_URL="$moling_POSTGRES_PRISMA_URL"
  echo "✅ DATABASE_URL set to pooled connection (moling_POSTGRES_PRISMA_URL)"
elif [ -n "$POSTGRES_PRISMA_URL" ]; then
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  echo "✅ DATABASE_URL set to pooled connection (POSTGRES_PRISMA_URL)"
fi

echo "📦 Running prisma db push to create/update database schema..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "⚠️  prisma db push failed, continuing with build..."
  echo "   The database schema may need manual setup"
}

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🏗️  Building Next.js app..."
npx next build

echo "✅ Build complete!"
