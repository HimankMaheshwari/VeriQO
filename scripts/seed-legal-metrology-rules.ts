/**
 * Seeder Script for Official Indian Legal Metrology Rules
 *
 * Populates LegalRule and RuleVersion records based on verified statutory sources.
 * Run with: npx tsx scripts/seed-legal-metrology-rules.ts
 */

import { prisma } from '../src/lib/prisma'
import { VERIFIED_STATUTORY_RULES } from '../src/lib/rules/seed/legal-rules-data'

async function seedLegalMetrologyRules() {
  console.log('\n======================================================')
  console.log('  SEEDING VERIFIED INDIAN LEGAL METROLOGY RULES')
  console.log('======================================================\n')

  // 1. Ensure an Admin user exists for audit attribution
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  })

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'legal.admin@veriQO.gov.in',
        name: 'Legal Metrology System Administrator',
        hashedPassword: 'SYSTEM_SEEDED_ACCOUNT_NO_LOGIN',
        role: 'ADMIN',
      },
    })
    console.log(`Created system admin account for rule audit attribution: ${adminUser.email}`)
  }

  let rulesCreated = 0
  let versionsCreated = 0

  for (const ruleData of VERIFIED_STATUTORY_RULES) {
    console.log(`Processing Rule: ${ruleData.ruleNumber} — ${ruleData.title}`)

    // Upsert LegalRule
    const rule = await prisma.legalRule.upsert({
      where: { ruleNumber: ruleData.ruleNumber },
      update: {
        title: ruleData.title,
        requirement: ruleData.requirement,
        applicability: ruleData.applicability,
        ruleCategory: ruleData.ruleCategory,
        defaultSeverity: ruleData.defaultSeverity,
        productCategoryId: ruleData.productCategoryId,
        sourceDocument: ruleData.sourceDocument,
        sourceReference: ruleData.sourceReference,
        effectiveDate: ruleData.effectiveDate,
        expiryDate: ruleData.expiryDate,
        conditions: ruleData.conditions as any,
        exceptions: ruleData.exceptions as any,
        isActive: true,
      },
      create: {
        ruleNumber: ruleData.ruleNumber,
        title: ruleData.title,
        requirement: ruleData.requirement,
        applicability: ruleData.applicability,
        ruleCategory: ruleData.ruleCategory,
        defaultSeverity: ruleData.defaultSeverity,
        productCategoryId: ruleData.productCategoryId,
        sourceDocument: ruleData.sourceDocument,
        sourceReference: ruleData.sourceReference,
        effectiveDate: ruleData.effectiveDate,
        expiryDate: ruleData.expiryDate,
        conditions: ruleData.conditions as any,
        exceptions: ruleData.exceptions as any,
        isActive: true,
      },
    })
    rulesCreated++

    // Clean up existing versions for this rule to re-seed cleanly
    await prisma.ruleVersion.deleteMany({
      where: { ruleId: rule.id },
    })

    // Seed historical RuleVersions
    for (const version of ruleData.versions) {
      await prisma.ruleVersion.create({
        data: {
          ruleId: rule.id,
          versionNumber: version.versionNumber,
          changeDescription: version.changeDescription,
          changedById: adminUser.id,
          effectiveDate: version.effectiveDate,
          snapshot: {
            ...version.snapshot,
            ruleNumber: ruleData.ruleNumber,
            title: version.snapshot.title ?? ruleData.title,
            requirement: version.snapshot.requirement ?? ruleData.requirement,
            conditions: version.snapshot.conditions ?? ruleData.conditions,
            exceptions: version.snapshot.exceptions ?? ruleData.exceptions,
            defaultSeverity: version.snapshot.defaultSeverity ?? ruleData.defaultSeverity,
            sourceDocument: ruleData.sourceDocument,
            sourceReference: ruleData.sourceReference,
            remediationGuidance: ruleData.remediationGuidance,
            effectiveDate: version.effectiveDate,
            expiryDate: version.expiryDate ?? null,
          },
        },
      })
      versionsCreated++
      console.log(`  └─ Seeded RuleVersion v${version.versionNumber} (Effective: ${version.effectiveDate.toISOString().slice(0, 10)})`)
    }
  }

  console.log('\n======================================================')
  console.log(`  SEED COMPLETE: ${rulesCreated} LegalRules, ${versionsCreated} RuleVersions`)
  console.log('======================================================\n')
}

seedLegalMetrologyRules()
  .catch((err) => {
    console.error('Failed to seed legal metrology rules:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
