/**
 * Seed Script: SIH 2026 PS107 — Indian Standards & BIS Services Demo Dataset
 *
 * Populates the database with verified DEMO records for:
 * 1. Indian Standards (IS 10500:2012, IS 1293:2019, IS 9873:2019, IS 13252:2010)
 * 2. Standard Clauses (Organoleptic, Chemical, Toxic Limits, Marking, Safety)
 * 3. BIS Licenses (ISI CML, CRS Registration, Hallmarking HUID)
 * 4. Quality Control Orders (Toys QCO, Plugs QCO)
 *
 * NOTE: All records are strictly marked as DEMO records (isDemoRecord: true).
 * Run: npx tsx scripts/seed-ps107-demo-data.ts
 */

import { PrismaClient } from '@prisma/client'
import { DEMO_STANDARDS, DEMO_LICENSES, DEMO_QCOS } from '../src/lib/bis/mock-data'

const prisma = new PrismaClient()

async function main() {
  console.log('─────────────────────────────────────────────────────────────')
  console.log('VeriQO PS107: Seeding Indian Standards & BIS Services Demo Data')
  console.log('Notice: All records are simulated DEMO/TEST data for hackathon evaluation.')
  console.log('─────────────────────────────────────────────────────────────')

  // 1. Seed Indian Standards & Clauses
  for (const std of DEMO_STANDARDS) {
    const existing = await prisma.bisStandard.findUnique({
      where: { standardNumber: std.standardNumber },
    })

    const standardRecord = existing
      ? await prisma.bisStandard.update({
          where: { id: existing.id },
          data: {
            title: std.title,
            description: std.description,
            edition: std.edition,
            year: std.year,
            status: std.status,
            division: std.division,
            icsCode: std.icsCode,
            isMandatory: std.isMandatory,
            mandatedByQco: std.mandatedByQco,
          },
        })
      : await prisma.bisStandard.create({
          data: {
            standardNumber: std.standardNumber,
            title: std.title,
            description: std.description,
            edition: std.edition,
            year: std.year,
            status: std.status,
            division: std.division,
            icsCode: std.icsCode,
            isMandatory: std.isMandatory,
            mandatedByQco: std.mandatedByQco,
          },
        })

    console.log(`[Standard] Upserted: ${standardRecord.standardNumber} (${standardRecord.title.slice(0, 40)}...)`)

    // Upsert clauses for this standard
    for (const clause of std.clauses) {
      const existingClause = await prisma.bisStandardClause.findFirst({
        where: {
          standardId: standardRecord.id,
          clauseNumber: clause.clauseNumber,
        },
      })

      if (existingClause) {
        await prisma.bisStandardClause.update({
          where: { id: existingClause.id },
          data: {
            title: clause.title,
            content: clause.content,
            isMandatory: clause.isMandatory,
            clauseType: clause.clauseType,
            limits: clause.limits as any,
            orderIndex: clause.orderIndex,
          },
        })
      } else {
        await prisma.bisStandardClause.create({
          data: {
            standardId: standardRecord.id,
            clauseNumber: clause.clauseNumber,
            title: clause.title,
            content: clause.content,
            isMandatory: clause.isMandatory,
            clauseType: clause.clauseType,
            limits: clause.limits as any,
            orderIndex: clause.orderIndex,
          },
        })
      }
    }
    console.log(`  └─ Upserted ${std.clauses.length} clauses for ${standardRecord.standardNumber}`)
  }

  // 2. Seed BIS Licenses (CML, CRS, HUID)
  for (const lic of DEMO_LICENSES) {
    let linkedStandardId: string | null = null
    if (lic.standardNumber) {
      const std = await prisma.bisStandard.findUnique({
        where: { standardNumber: lic.standardNumber },
        select: { id: true },
      })
      if (std) linkedStandardId = std.id
    }

    const existingLic = await prisma.bisLicense.findUnique({
      where: { licenseNumber: lic.licenseNumber },
    })

    if (existingLic) {
      await prisma.bisLicense.update({
        where: { id: existingLic.id },
        data: {
          licenseType: lic.licenseType,
          status: lic.status,
          standardId: linkedStandardId,
          standardNumber: lic.standardNumber,
          licenseeName: lic.licenseeName ?? 'Demo Licensee',
          brandName: lic.brandName,
          factoryAddress: lic.factoryAddress,
          validFrom: lic.validFrom ? new Date(lic.validFrom) : null,
          validUntil: lic.validUntil ? new Date(lic.validUntil) : null,
          productCategory: lic.productCategory,
          varietyDescription: lic.varietyDescription,
          isDemoRecord: true,
          metadata: lic.details as any,
        },
      })
    } else {
      await prisma.bisLicense.create({
        data: {
          licenseType: lic.licenseType,
          licenseNumber: lic.licenseNumber,
          status: lic.status,
          standardId: linkedStandardId,
          standardNumber: lic.standardNumber,
          licenseeName: lic.licenseeName ?? 'Demo Licensee',
          brandName: lic.brandName,
          factoryAddress: lic.factoryAddress,
          validFrom: lic.validFrom ? new Date(lic.validFrom) : null,
          validUntil: lic.validUntil ? new Date(lic.validUntil) : null,
          productCategory: lic.productCategory,
          varietyDescription: lic.varietyDescription,
          isDemoRecord: true,
          metadata: lic.details as any,
        },
      })
    }

    console.log(`[License] Upserted: ${lic.licenseType} -> ${lic.licenseNumber} (${lic.licenseeName})`)
  }

  // 3. Seed Quality Control Orders (QCO)
  for (const qco of DEMO_QCOS) {
    let linkedStandardId: string | null = null
    if (qco.standardNumber) {
      const std = await prisma.bisStandard.findUnique({
        where: { standardNumber: qco.standardNumber },
        select: { id: true },
      })
      if (std) linkedStandardId = std.id
    }

    const existingQco = await prisma.qualityControlOrder.findUnique({
      where: { orderNumber: qco.orderNumber },
    })

    if (existingQco) {
      await prisma.qualityControlOrder.update({
        where: { id: existingQco.id },
        data: {
          orderTitle: qco.orderTitle,
          ministry: qco.ministry,
          notifiedDate: new Date(qco.notifiedDate),
          effectiveDate: new Date(qco.effectiveDate),
          status: qco.status,
          standardId: linkedStandardId,
          applicableProducts: qco.applicableProducts,
          hsCodes: qco.hsCodes as any,
          isExemptionApplicable: qco.isExemptionApplicable,
          exemptionDetails: qco.exemptionDetails,
          gazetteUrl: qco.gazetteUrl,
          isDemoRecord: true,
        },
      })
    } else {
      await prisma.qualityControlOrder.create({
        data: {
          orderTitle: qco.orderTitle,
          orderNumber: qco.orderNumber,
          ministry: qco.ministry,
          notifiedDate: new Date(qco.notifiedDate),
          effectiveDate: new Date(qco.effectiveDate),
          status: qco.status,
          standardId: linkedStandardId,
          applicableProducts: qco.applicableProducts,
          hsCodes: qco.hsCodes as any,
          isExemptionApplicable: qco.isExemptionApplicable,
          exemptionDetails: qco.exemptionDetails,
          gazetteUrl: qco.gazetteUrl,
          isDemoRecord: true,
        },
      })
    }

    console.log(`[QCO] Upserted: ${qco.orderNumber} -> ${qco.orderTitle.slice(0, 40)}...`)
  }

  console.log('─────────────────────────────────────────────────────────────')
  console.log('✅ PS107 Demo Data successfully seeded into database.')
  console.log('─────────────────────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('Error seeding PS107 demo data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
