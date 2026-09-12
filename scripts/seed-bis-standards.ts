import { prisma } from '../src/lib/prisma'

/**
 * =============================================================================
 * SYNTHETIC DEMO BIS STANDARDS DATASET (VERIQO PS107)
 * =============================================================================
 * NOTICE & DISCLAIMER:
 * This is an explicitly SYNTHETIC / DEMO dataset curated solely for development,
 * local testing, and architecture verification of the VeriQO PS107 Bureau of
 * Indian Standards (BIS) knowledge retrieval service.
 *
 * All records in this dataset are sample placeholders. This dataset does NOT
 * contain authoritative technical specifications, actual laboratory registries,
 * verified QCO gazette citations, or legal compliance determinations.
 *
 * For authoritative and legally binding standard specifications, consult the
 * official Gazette of India and the Bureau of Indian Standards portal:
 * https://www.bis.gov.in
 * =============================================================================
 */

export interface DemoBisStandardItem {
  standardNumber: string
  title: string
  description: string
  category: string
  productCategory: string
  isMandatory: boolean
  qcoReference: string | null
  effectiveDate: Date | null
  certificationScheme: string
  keyRequirements: Record<string, any>
  recognizedLabs: string[]
}

export const DEMO_BIS_STANDARDS: DemoBisStandardItem[] = [
  {
    standardNumber: 'IS 14543',
    title: 'DEMO: Packaged Drinking Water Specification [Sample Record]',
    description:
      'DEMO RECORD — Sample summary for prototype retrieval testing. Consult official BIS publication for authorized standard text.',
    category: 'Food & Beverages',
    productCategory: 'Packaged Drinking Water',
    isMandatory: true,
    qcoReference: 'DEMO QCO — verify against current official BIS gazette',
    effectiveDate: null,
    certificationScheme: 'ISI',
    keyRequirements: {
      notice: 'DEMO — verify against current official BIS source',
      requirements: [
        'DEMO testing parameter — consult official standard document for certified technical thresholds',
      ],
    },
    recognizedLabs: [
      'DEMO LAB — verify against official BIS portal (bis.gov.in) for recognized testing facilities',
    ],
  },
  {
    standardNumber: 'IS 10500',
    title: 'DEMO: Drinking Water Specification [Sample Record]',
    description:
      'DEMO RECORD — Sample summary for prototype retrieval testing. Consult official BIS publication for authorized standard text.',
    category: 'Water & Environment',
    productCategory: 'Potable Drinking Water',
    isMandatory: false,
    qcoReference: null,
    effectiveDate: null,
    certificationScheme: 'ISI',
    keyRequirements: {
      notice: 'DEMO — verify against current official BIS source',
      requirements: [
        'DEMO testing parameter — consult official standard document for certified technical thresholds',
      ],
    },
    recognizedLabs: [
      'DEMO LAB — verify against official BIS portal (bis.gov.in) for recognized testing facilities',
    ],
  },
  {
    standardNumber: 'IS 15820',
    title: 'DEMO: Gold Artefacts Hallmarking Requirements [Sample Record]',
    description:
      'DEMO RECORD — Sample summary for prototype retrieval testing. Consult official BIS publication for authorized standard text.',
    category: 'Precious Metals & Jewellery',
    productCategory: 'Gold Jewellery',
    isMandatory: true,
    qcoReference: 'DEMO QCO — verify against current official BIS gazette',
    effectiveDate: null,
    certificationScheme: 'Hallmarking',
    keyRequirements: {
      notice: 'DEMO — verify against current official BIS source',
      requirements: [
        'DEMO hallmarking parameter — consult official standard document for certified technical thresholds',
      ],
    },
    recognizedLabs: [
      'DEMO LAB — verify against official BIS portal (bis.gov.in) for recognized testing facilities',
    ],
  },
  {
    standardNumber: 'IS 13252 (Part 1)',
    title: 'DEMO: Information Technology Equipment Safety [Sample Record]',
    description:
      'DEMO RECORD — Sample summary for prototype retrieval testing. Consult official BIS publication for authorized standard text.',
    category: 'Electronics & IT',
    productCategory: 'Laptops, Mobile Phones, Power Adapters',
    isMandatory: true,
    qcoReference: 'DEMO QCO — verify against current official BIS gazette',
    effectiveDate: null,
    certificationScheme: 'CRS',
    keyRequirements: {
      notice: 'DEMO — verify against current official BIS source',
      requirements: [
        'DEMO safety parameter — consult official standard document for certified technical thresholds',
      ],
    },
    recognizedLabs: [
      'DEMO LAB — verify against official BIS portal (bis.gov.in) for recognized testing facilities',
    ],
  },
  {
    standardNumber: 'IS 9873 (Part 1)',
    title: 'DEMO: Safety Aspects Related to Toys [Sample Record]',
    description:
      'DEMO RECORD — Sample summary for prototype retrieval testing. Consult official BIS publication for authorized standard text.',
    category: 'Toys & Children Products',
    productCategory: 'Children Toys',
    isMandatory: true,
    qcoReference: 'DEMO QCO — verify against current official BIS gazette',
    effectiveDate: null,
    certificationScheme: 'ISI',
    keyRequirements: {
      notice: 'DEMO — verify against current official BIS source',
      requirements: [
        'DEMO toy safety parameter — consult official standard document for certified technical thresholds',
      ],
    },
    recognizedLabs: [
      'DEMO LAB — verify against official BIS portal (bis.gov.in) for recognized testing facilities',
    ],
  },
]

export async function seedBisStandards() {
  console.log('=================================================================')
  console.log('  Seeding SYNTHETIC DEMO BIS Standards Registry')
  console.log('=================================================================\n')

  let createdCount = 0
  let updatedCount = 0

  for (const item of DEMO_BIS_STANDARDS) {
    try {
      const existing = await (prisma as any).bisStandard.findUnique({
        where: { standardNumber: item.standardNumber },
      })

      if (existing) {
        await (prisma as any).bisStandard.update({
          where: { standardNumber: item.standardNumber },
          data: {
            title: item.title,
            description: item.description,
            category: item.category,
            productCategory: item.productCategory,
            isMandatory: item.isMandatory,
            qcoReference: item.qcoReference,
            effectiveDate: item.effectiveDate,
            certificationScheme: item.certificationScheme,
            keyRequirements: item.keyRequirements,
            recognizedLabs: item.recognizedLabs,
          },
        })
        updatedCount++
        console.log(`  [UPDATE] Standard: ${item.standardNumber} - ${item.title.substring(0, 45)}...`)
      } else {
        await (prisma as any).bisStandard.create({
          data: {
            standardNumber: item.standardNumber,
            title: item.title,
            description: item.description,
            category: item.category,
            productCategory: item.productCategory,
            isMandatory: item.isMandatory,
            qcoReference: item.qcoReference,
            effectiveDate: item.effectiveDate,
            certificationScheme: item.certificationScheme,
            keyRequirements: item.keyRequirements,
            recognizedLabs: item.recognizedLabs,
          },
        })
        createdCount++
        console.log(`  [INSERT] Standard: ${item.standardNumber} - ${item.title.substring(0, 45)}...`)
      }
    } catch (err: any) {
      console.warn(`  [SKIP/ERR] Could not seed ${item.standardNumber}: ${err.message}`)
    }
  }

  console.log(`\nSeed completed: ${createdCount} created, ${updatedCount} updated.`)
}

// Auto-run if executed directly via CLI
if (require.main === module) {
  seedBisStandards()
    .catch((err) => {
      console.error('Seed execution error:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
