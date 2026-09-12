import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  IStandardsService,
  BisStandardItem,
  BisStandardDetail,
  StandardSearchFilters,
} from './types'
import { DEMO_STANDARDS } from './mock-data'

export class BisStandardsService implements IStandardsService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Universal search across Indian Standards catalog.
   * Checks database first; falls back to deterministic demo records if database is empty.
   */
  async searchStandards(
    filters: StandardSearchFilters
  ): Promise<{ standards: BisStandardItem[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10))
    const q = filters.q?.trim().toLowerCase() || ''
    const division = filters.division?.trim().toUpperCase()
    const isMandatory = filters.isMandatory

    try {
      const whereClause: any = {}
      if (q) {
        whereClause.OR = [
          { standardNumber: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      }
      if (division) {
        whereClause.division = division
      }
      if (typeof isMandatory === 'boolean') {
        whereClause.isMandatory = isMandatory
      }
      if (filters.status) {
        whereClause.status = filters.status.toUpperCase()
      }

      const [dbTotal, dbRecords] = await Promise.all([
        this.db.bisStandard.count({ where: whereClause }),
        this.db.bisStandard.findMany({
          where: whereClause,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { standardNumber: 'asc' },
          include: {
            _count: { select: { clauses: true } },
          },
        }),
      ])

      if (dbTotal > 0) {
        return {
          standards: dbRecords.map((s) => ({
            id: s.id,
            standardNumber: s.standardNumber,
            title: s.title,
            edition: s.edition,
            year: s.year,
            status: s.status,
            division: s.division,
            icsCode: s.icsCode,
            isMandatory: s.isMandatory,
            mandatedByQco: s.mandatedByQco,
            clausesCount: s._count.clauses,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          })),
          total: dbTotal,
          page,
          pageSize,
        }
      }
    } catch {
      // Fall through to deterministic mock repository if DB table not yet seeded
    }

    // Fallback: Deterministic DEMO dataset
    let filtered = DEMO_STANDARDS
    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.standardNumber.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
    }
    if (division) {
      filtered = filtered.filter((s) => s.division === division)
    }
    if (typeof isMandatory === 'boolean') {
      filtered = filtered.filter((s) => s.isMandatory === isMandatory)
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status.toUpperCase() === filters.status?.toUpperCase())
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize).map((s) => ({
      id: s.id,
      standardNumber: s.standardNumber,
      title: s.title,
      edition: s.edition,
      year: s.year,
      status: s.status,
      division: s.division,
      icsCode: s.icsCode,
      isMandatory: s.isMandatory,
      mandatedByQco: s.mandatedByQco,
      clausesCount: s.clauses.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    return {
      standards: paginated,
      total,
      page,
      pageSize,
    }
  }

  /**
   * Retrieves single standard with full clause hierarchy and linked QCOs.
   */
  async getStandardById(id: string): Promise<BisStandardDetail | null> {
    try {
      const dbStandard = await this.db.bisStandard.findUnique({
        where: { id },
        include: {
          clauses: { orderBy: { orderIndex: 'asc' } },
          qcos: true,
        },
      })

      if (dbStandard) {
        return {
          id: dbStandard.id,
          standardNumber: dbStandard.standardNumber,
          title: dbStandard.title,
          description: dbStandard.description,
          edition: dbStandard.edition,
          year: dbStandard.year,
          status: dbStandard.status,
          division: dbStandard.division,
          icsCode: dbStandard.icsCode,
          isMandatory: dbStandard.isMandatory,
          mandatedByQco: dbStandard.mandatedByQco,
          pdfStorageKey: dbStandard.pdfStorageKey,
          metadata: dbStandard.metadata as Record<string, unknown>,
          clausesCount: dbStandard.clauses.length,
          createdAt: dbStandard.createdAt.toISOString(),
          updatedAt: dbStandard.updatedAt.toISOString(),
          clauses: dbStandard.clauses.map((c) => ({
            id: c.id,
            standardId: c.standardId,
            clauseNumber: c.clauseNumber,
            title: c.title,
            content: c.content,
            isMandatory: c.isMandatory,
            clauseType: c.clauseType,
            limits: c.limits as any,
            orderIndex: c.orderIndex,
          })),
          qcos: dbStandard.qcos.map((q) => ({
            id: q.id,
            orderTitle: q.orderTitle,
            orderNumber: q.orderNumber,
            ministry: q.ministry,
            notifiedDate: q.notifiedDate.toISOString(),
            effectiveDate: q.effectiveDate.toISOString(),
            status: q.status,
            standardId: q.standardId,
            applicableProducts: q.applicableProducts,
            hsCodes: q.hsCodes as string[],
            isExemptionApplicable: q.isExemptionApplicable,
            exemptionDetails: q.exemptionDetails,
            gazetteUrl: q.gazetteUrl,
            isDemoRecord: q.isDemoRecord,
          })),
        }
      }
    } catch {
      // Fall through to mock dataset
    }

    const mock = DEMO_STANDARDS.find((s) => s.id === id)
    return mock ?? null
  }

  /**
   * Retrieves standard by standard number (e.g. "IS 10500:2012" or "IS 10500").
   */
  async getStandardByNumber(standardNumber: string): Promise<BisStandardDetail> {
    const cleanNumber = standardNumber.trim().toUpperCase()

    try {
      const dbStandard = await this.db.bisStandard.findFirst({
        where: {
          OR: [
            { standardNumber: { equals: cleanNumber, mode: 'insensitive' } },
            { standardNumber: { startsWith: cleanNumber, mode: 'insensitive' } },
          ],
        },
        include: {
          clauses: { orderBy: { orderIndex: 'asc' } },
          qcos: true,
        },
      })

      if (dbStandard) {
        return (await this.getStandardById(dbStandard.id)) as BisStandardDetail
      }
    } catch {
      // Fall through to mock dataset
    }

    const mock = DEMO_STANDARDS.find(
      (s) =>
        s.standardNumber.toUpperCase() === cleanNumber ||
        s.standardNumber.toUpperCase().startsWith(cleanNumber)
    )
    return (mock ?? null) as BisStandardDetail
  }
}

export const defaultBisStandardsService = new BisStandardsService()
