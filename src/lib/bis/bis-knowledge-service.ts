import { prisma } from '@/lib/prisma'
import type {
  CompactBisStandard,
  BisSearchFilters,
  BisSearchResponse,
} from './types'

export class BisKnowledgeService {
  constructor(private db: any = prisma) {}

  /**
   * Format a database record into a compact structured shape suitable for later LLM context.
   */
  private formatCompact(record: any): CompactBisStandard {
    return {
      id: record.id,
      standardNumber: record.standardNumber,
      title: record.title,
      category: record.category,
      productCategory: record.productCategory ?? null,
      isMandatory: Boolean(record.isMandatory),
      qcoReference: record.qcoReference ?? null,
      certificationScheme: record.certificationScheme ?? null,
      keyRequirements: record.keyRequirements ?? null,
      description: record.description ?? null,
    }
  }

  /**
   * Universal search across BIS standards using standardNumber, title,
   * description, category, and productCategory.
   * Enforces case-insensitive substring matching consistent with repository patterns.
   */
  async searchStandards(
    query: string,
    filters?: BisSearchFilters
  ): Promise<BisSearchResponse> {
    const q = (query || '').trim()
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20))
    const offset = Math.max(0, filters?.offset ?? 0)

    const where: any = {}

    if (q.length > 0) {
      where.OR = [
        { standardNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { productCategory: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (filters?.category) {
      where.category = { contains: filters.category.trim(), mode: 'insensitive' }
    }

    if (filters?.productCategory) {
      where.productCategory = {
        contains: filters.productCategory.trim(),
        mode: 'insensitive',
      }
    }

    if (typeof filters?.isMandatory === 'boolean') {
      where.isMandatory = filters.isMandatory
    }

    if (filters?.certificationScheme) {
      where.certificationScheme = {
        contains: filters.certificationScheme.trim(),
        mode: 'insensitive',
      }
    }

    const [total, records] = await Promise.all([
      this.db.bisStandard.count({ where }),
      this.db.bisStandard.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ isMandatory: 'desc' }, { standardNumber: 'asc' }],
      }),
    ])

    return {
      total,
      standards: records.map((r: any) => this.formatCompact(r)),
    }
  }

  /**
   * Look up a standard by its exact or normalized standard number (e.g., "IS 14543", "IS 10500").
   */
  async getStandardByNumber(
    standardNumber: string
  ): Promise<CompactBisStandard | null> {
    const raw = (standardNumber || '').trim()
    if (!raw) return null

    // Exact match or space-normalized match
    const record = await this.db.bisStandard.findFirst({
      where: {
        OR: [
          { standardNumber: { equals: raw, mode: 'insensitive' } },
          {
            standardNumber: {
              contains: raw.replace(/\s+/g, ''),
              mode: 'insensitive',
            },
          },
        ],
      },
    })

    return record ? this.formatCompact(record) : null
  }

  /**
   * Retrieve all standards for a given category.
   */
  async getStandardsByCategory(
    category: string,
    limit = 50
  ): Promise<CompactBisStandard[]> {
    const cat = (category || '').trim()
    if (!cat) return []

    const records = await this.db.bisStandard.findMany({
      where: {
        category: { contains: cat, mode: 'insensitive' },
      },
      take: Math.min(100, Math.max(1, limit)),
      orderBy: [{ isMandatory: 'desc' }, { standardNumber: 'asc' }],
    })

    return records.map((r: any) => this.formatCompact(r))
  }
}

let serviceInstance: BisKnowledgeService | null = null

export function getBisKnowledgeService(): BisKnowledgeService {
  if (!serviceInstance) {
    serviceInstance = new BisKnowledgeService()
  }
  return serviceInstance
}
