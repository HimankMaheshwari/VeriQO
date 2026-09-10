/**
 * VeriQO Seed Script
 * Creates one user per role for testing.
 * Does NOT create fake products, legal rules, or compliance data.
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding VeriQO database…')

  const password = await bcrypt.hash('Test@1234', 12)

  const users = [
    {
      name: 'Priya Sharma',
      email: 'consumer@veriQO.test',
      role: 'CONSUMER' as const,
    },
    {
      name: 'Inspector Rajesh Kumar',
      email: 'officer@veriQO.test',
      role: 'AUTHORITY_OFFICER' as const,
    },
    {
      name: 'Supt. Anita Mehta',
      email: 'senior@veriQO.test',
      role: 'SENIOR_AUTHORITY' as const,
    },
    {
      name: 'System Administrator',
      email: 'admin@veriQO.test',
      role: 'ADMIN' as const,
    },
  ]

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        hashedPassword: password,
        role: user.role,
      },
    })
    console.log(`  ✅ ${created.role}: ${created.email}`)
  }

  console.log('')
  console.log('✅ Seed complete.')
  console.log('')
  console.log('Seed credentials (all use password: Test@1234):')
  console.log('  CONSUMER:          consumer@veriQO.test')
  console.log('  AUTHORITY_OFFICER: officer@veriQO.test')
  console.log('  SENIOR_AUTHORITY:  senior@veriQO.test')
  console.log('  ADMIN:             admin@veriQO.test')
  console.log('')
  console.log('NOTE: No products, legal rules, or compliance data created.')
  console.log('Products are identified from real uploads (Phase 2).')
  console.log('Legal rules are sourced from official documents (Phase 3).')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
