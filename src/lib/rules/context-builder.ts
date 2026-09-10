import { prisma } from '../prisma'
import type { PrismaClient } from '@prisma/client'
import type { RuleEngineContext, ExtractedFieldSnapshot } from './types'
import { parseDateSafe } from './operators'

interface ScanWithRelations {
  id: string
  productId?: string | null
  identifiedProductName?: string | null
  identifiedBrand?: string | null
  identifiedCategory?: string | null
  identifiedManufacturer?: string | null
  identificationConfidence?: number | null
  notes?: string | null
  product?: {
    id: string
    name: string
    brand?: string | null
    category?: string | null
    manufacturer?: string | null
  } | null
  extractedDeclarations?: Array<{
    id: string
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
    confidence: number | null
    detectionStatus: any
    sourceText?: string | null
  }>
  images?: Array<{
    id: string
    storageKey: string
    originalFilename: string
    ocrText?: string | null
  }>
}

export interface RuleEngineContextOptions {
  inspectionId?: string
  packagingDateOverride?: Date | null
  evaluationDate?: Date
  consumerType?: 'RETAIL' | 'INDUSTRIAL' | 'INSTITUTIONAL'
  isIndustrialOrInstitutional?: boolean
  client?: PrismaClient
}

/**
 * Pure function: Builds RuleEngineContext from in-memory objects.
 * Useful for unit testing, simulation, and deterministic execution without DB.
 */
export function buildRuleEngineContextFromData(
  scan: ScanWithRelations,
  options?: RuleEngineContextOptions
): RuleEngineContext {
  const declarations: Record<string, ExtractedFieldSnapshot> = {}

  if (scan.extractedDeclarations) {
    for (const decl of scan.extractedDeclarations) {
      const key = decl.fieldName.trim().toLowerCase()
      declarations[key] = {
        declarationId: decl.id,
        fieldName: decl.fieldName,
        rawValue: decl.rawValue,
        normalizedValue: decl.normalizedValue,
        confidence: decl.confidence ?? 0.5,
        detectionStatus: decl.detectionStatus,
        sourceText: decl.sourceText ?? null,
      }
    }
  }

  // Derive legally relevant packaging or manufacturing date
  let packagingDate: Date | null = options?.packagingDateOverride ?? null

  if (!packagingDate) {
    const candidateKeys = [
      'date_of_packing',
      'date_of_manufacture',
      'manufacturing_date',
      'mfg_date',
      'packing_date',
      'pkd_date',
    ]

    for (const key of candidateKeys) {
      const decl = declarations[key]
      if (decl && decl.detectionStatus !== 'NOT_DETECTED') {
        const raw = decl.normalizedValue || decl.rawValue
        if (raw) {
          const parsed = parseDateSafe(raw)
          if (parsed) {
            packagingDate = parsed
            break
          }
        }
      }
    }
  }

  // Detect industrial/institutional consumer marking
  let isIndustrialOrInstitutional =
    options?.isIndustrialOrInstitutional ??
    (options?.consumerType === 'INDUSTRIAL' || options?.consumerType === 'INSTITUTIONAL'
      ? true
      : undefined)

  if (isIndustrialOrInstitutional === undefined) {
    const combinedTexts = [
      declarations['institutional_industrial']?.rawValue,
      declarations['net_quantity']?.rawValue,
      declarations['product_name']?.rawValue,
      scan.notes,
      ...(scan.images?.map((i) => i.ocrText) || []),
    ]
      .filter(Boolean)
      .join(' ')

    if (
      /\b(for\s+industrial\s+(consumer|use)|institutional\s+(pack|consumer|use)|not\s+for\s+retail\s+sale)\b/i.test(
        combinedTexts
      )
    ) {
      isIndustrialOrInstitutional = true
    } else {
      isIndustrialOrInstitutional = false
    }
  }

  const consumerType: 'RETAIL' | 'INDUSTRIAL' | 'INSTITUTIONAL' =
    options?.consumerType ?? (isIndustrialOrInstitutional ? 'INDUSTRIAL' : 'RETAIL')

  // Resolve product metadata (prioritize identified AI metadata, fallback to linked product)
  const product = {
    name: scan.identifiedProductName || scan.product?.name || null,
    brand: scan.identifiedBrand || scan.product?.brand || null,
    category: scan.identifiedCategory || scan.product?.category || null,
    manufacturer: scan.identifiedManufacturer || scan.product?.manufacturer || null,
    confidence: scan.identificationConfidence ?? 0,
    isIndustrialOrInstitutional,
  }

  const images = (scan.images || []).map((img) => ({
    id: img.id,
    storageKey: img.storageKey,
    originalFilename: img.originalFilename,
    ocrText: img.ocrText,
  }))

  return {
    scanId: scan.id,
    inspectionId: options?.inspectionId,
    product,
    declarations,
    packagingDate,
    consumerType,
    isIndustrialOrInstitutional,
    images,
    evaluatedAt: options?.evaluationDate ?? new Date(),
  }
}

/**
 * Fetches scan data from Prisma and constructs a strongly-typed RuleEngineContext.
 */
export async function buildRuleEngineContextFromDb(
  scanId: string,
  options?: RuleEngineContextOptions
): Promise<RuleEngineContext> {
  const db = options?.client ?? prisma

  const scan = await db.productScan.findUnique({
    where: { id: scanId },
    include: {
      product: true,
      extractedDeclarations: true,
      images: true,
    },
  })

  if (!scan) {
    throw new Error(`ProductScan with ID '${scanId}' not found`)
  }

  return buildRuleEngineContextFromData(scan, options)
}
