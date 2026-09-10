import { prisma } from '../prisma'
import type { PrismaClient } from '@prisma/client'
import { defaultProviderRegistry, ProviderRegistry } from './providers/provider-registry'
import { extractRawListingFromHtml } from './extractor'
import { normalizeOnlineListing } from './normalizer'
import { comparePhysicalVsOnline } from './comparator'
import { buildRuleEngineContextFromDb } from '../rules/context-builder'
import { evaluateOnlineComplianceWithRuleEngine } from './rule-engine-bridge'
import type { OnlineVerificationRunResult } from './types'
import { validateUrlForSsrf } from './security'

export interface VerificationServiceOptions {
  client?: PrismaClient
  providerRegistry?: ProviderRegistry
  skipDatabasePersistence?: boolean
  rulesToEvaluate?: any[]
}

/**
 * Service orchestrating the end-to-end Online / E-commerce Verification pipeline.
 */
export class OnlineVerificationService {
  private db: PrismaClient
  private registry: ProviderRegistry

  constructor(options?: VerificationServiceOptions) {
    this.db = options?.client ?? prisma
    this.registry = options?.providerRegistry ?? defaultProviderRegistry
  }

  async verifyProductOnline(
    scanId: string,
    rawUrl: string,
    options?: VerificationServiceOptions
  ): Promise<OnlineVerificationRunResult> {
    const db = options?.client ?? this.db
    const registry = options?.providerRegistry ?? this.registry

    // 1. SSRF and URL validation
    const { normalizedUrl, hostname } = await validateUrlForSsrf(rawUrl)
    const domain = hostname.replace(/^www\./, '')

    // 2. Resolve Provider
    const provider = registry.resolveProvider(normalizedUrl)

    let fetchResult: any = null
    let fetchError: string | null = null

    try {
      fetchResult = await provider.fetchListing(normalizedUrl)
    } catch (err: any) {
      fetchError = err.message || 'Failed to fetch online listing'
    }

    // 3. Build physical context from scanId
    const physicalContext = await buildRuleEngineContextFromDb(scanId, { client: db })

    if (fetchError || !fetchResult) {
      // Record failed verification session
      if (!options?.skipDatabasePersistence) {
        await db.onlineVerification.create({
          data: {
            scanId,
            sourceUrl: normalizedUrl,
            domain,
            status: 'FAILED',
            errorMessage: fetchError,
            overallMatchStatus: 'UNVERIFIED',
          },
        })
      }

      return {
        scanId,
        url: normalizedUrl,
        domain,
        status: 'FAILED',
        errorMessage: fetchError || 'Fetch failed',
        overallMatchStatus: 'UNVERIFIED',
      }
    }

    // 4. Extract raw listing fields
    const rawListing = extractRawListingFromHtml(fetchResult.htmlContent, normalizedUrl)

    // 5. Deterministic Normalization
    const normalizedListing = normalizeOnlineListing(rawListing)

    // 6. Physical-vs-Online Comparison
    const comparison = comparePhysicalVsOnline(normalizedListing, physicalContext)

    // 7. Optional Rule Engine evaluation
    let ruleEngineEvaluation: any = null
    if (options?.rulesToEvaluate && options.rulesToEvaluate.length > 0) {
      ruleEngineEvaluation = evaluateOnlineComplianceWithRuleEngine(
        comparison,
        physicalContext,
        options.rulesToEvaluate
      )
    }

    // 8. Persist audit trail, snapshot, fields, and discrepancies
    let verificationId: string | undefined

    if (!options?.skipDatabasePersistence) {
      const record = await db.onlineVerification.create({
        data: {
          scanId,
          sourceUrl: normalizedUrl,
          domain,
          status: 'SUCCESS',
          overallMatchStatus: comparison.overallMatchStatus,
          snapshot: {
            create: {
              contentHash: fetchResult.contentHash,
              httpStatus: fetchResult.httpStatus,
              contentType: fetchResult.contentType,
              headers: fetchResult.headers,
              // Cap rawHtml in DB to 500KB to save space
              rawHtml: fetchResult.htmlContent.slice(0, 500 * 1024),
            },
          },
          fields: {
            create: [
              {
                fieldName: 'title',
                rawValue: rawListing.title,
                normalizedValue: normalizedListing.title,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'brand',
                rawValue: rawListing.brand,
                normalizedValue: normalizedListing.brand,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'mrp',
                rawValue: rawListing.mrp,
                normalizedValue: normalizedListing.mrp ? String(normalizedListing.mrp.numericValue) : null,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'selling_price',
                rawValue: rawListing.sellingPrice,
                normalizedValue: normalizedListing.sellingPrice ? String(normalizedListing.sellingPrice.numericValue) : null,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'net_quantity',
                rawValue: rawListing.netQuantity,
                normalizedValue: normalizedListing.netQuantity ? normalizedListing.netQuantity.standardDisplay : null,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'manufacturer',
                rawValue: rawListing.manufacturer,
                normalizedValue: normalizedListing.manufacturer,
                source: normalizedListing.extractionSource,
              },
              {
                fieldName: 'country_of_origin',
                rawValue: rawListing.countryOfOrigin,
                normalizedValue: normalizedListing.countryOfOrigin,
                source: normalizedListing.extractionSource,
              },
            ].filter((f) => f.rawValue !== null && f.rawValue !== undefined),
          },
          discrepancies: {
            create: comparison.discrepancies.map((d) => ({
              fieldName: d.fieldName,
              discrepancyType: d.discrepancyType,
              severity: d.severity,
              physicalValue: d.physicalValue,
              onlineValue: d.onlineValue,
              discrepancyRatio: d.discrepancyRatio ?? null,
              message: d.message,
              isStatutoryConcern: d.isStatutoryConcern,
              statutoryReference: d.statutoryReference ?? null,
            })),
          },
        },
      })
      verificationId = record.id
    }

    return {
      verificationId,
      scanId,
      url: normalizedUrl,
      domain,
      status: 'SUCCESS',
      overallMatchStatus: comparison.overallMatchStatus,
      snapshot: {
        contentHash: fetchResult.contentHash,
        httpStatus: fetchResult.httpStatus,
        contentType: fetchResult.contentType,
        retrievedAt: fetchResult.retrievedAt,
      },
      normalizedListing,
      comparison,
      ruleEngineEvaluation,
    }
  }
}

export const defaultOnlineVerificationService = new OnlineVerificationService()
