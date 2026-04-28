import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Ensure AI settings exist with a working default
  const existing = await prisma.aISettings.findFirst()
  
  if (!existing) {
    await prisma.aISettings.create({
      data: {
        provider: 'nvidia',
        apiKey: process.env.NVIDIA_API_KEY || '',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        model: 'meta/llama-3.3-70b-instruct',
        temperature: 0.7,
        maxTokens: 8192,
      },
    })
    console.log('✅ Created default AI settings')
  } else {
    // Update model if it's an old/deprecated one
    const deprecatedModels = ['deepseek-ai/deepseek-r1', 'deepseek-ai/deepseek-r1-distill-llama-70b']
    if (deprecatedModels.includes(existing.model)) {
      await prisma.aISettings.update({
        where: { id: existing.id },
        data: { model: 'meta/llama-3.3-70b-instruct' },
      })
      console.log('✅ Updated deprecated model to meta/llama-3.3-70b-instruct')
    } else {
      console.log('✅ AI settings already configured')
    }
  }

  console.log('🌱 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
