import { prisma } from '@/lib/prisma'
import { Prisma, Role } from '@prisma/client'
import {
  SearchQueryFilters,
  NormalizedSearchResult,
  SearchResponse,
  ProductInvestigationDossier,
  EntityInvestigationSummary,
  ViolationInvestigationDossier,
} from './types'

export class AuthoritySearchService {
  constructor(private db = prisma) {}

  /**
   * Universal Authority Search across all regulatory entities.
   * Enforces server-side database querying, pagination, and query-layer RBAC.
   */
  async search(
    filters: SearchQueryFilters,
    user: { id: string; role: Role }
  ): Promise<SearchResponse> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 15))
    const q = filters.q ? filters.q.trim() : ''
    const entityType = filters.type ?? 'ALL'

    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    // Date filters
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (filters.from) {
      const fromDate = new Date(filters.from)
      if (!isNaN(fromDate.getTime())) dateFilter.gte = fromDate
    }
    if (filters.to) {
      const toDate = new Date(filters.to)
      if (!isNaN(toDate.getTime())) dateFilter.lte = toDate
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0

    const results: NormalizedSearchResult[] = []

    // ─────────────────────────────────────────────────────────────
    // 1. REGULATORY CASES
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'CASE') {
      const caseWhere: Prisma.RegulatoryCaseWhereInput = {}

      // RBAC: Officer only sees assigned or unassigned intake
      if (!isSeniorOrAdmin) {
        caseWhere.OR = [
          { assignedOfficerId: user.id },
          { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
        ]
      }

      if (filters.status) {
        caseWhere.status = filters.status as any
      }

      if (filters.priority) {
        caseWhere.priority = filters.priority as any
      }

      if (filters.officer) {
        caseWhere.assignedOfficer = {
          name: { contains: filters.officer, mode: 'insensitive' },
        }
      }

      if (hasDateFilter) {
        caseWhere.createdAt = dateFilter
      }

      if (q) {
        caseWhere.AND = [
          ...(Array.isArray(caseWhere.AND) ? caseWhere.AND : caseWhere.AND ? [caseWhere.AND] : []),
          {
            OR: [
              { caseNumber: { contains: q, mode: 'insensitive' } },
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { complaint: { complaintRef: { contains: q, mode: 'insensitive' } } },
              { productScan: { identifiedProductName: { contains: q, mode: 'insensitive' } } },
              { productScan: { identifiedBrand: { contains: q, mode: 'insensitive' } } },
              { productScan: { identifiedManufacturer: { contains: q, mode: 'insensitive' } } },
            ],
          },
        ]
      }

      if (filters.brand) {
        caseWhere.productScan = {
          identifiedBrand: { contains: filters.brand, mode: 'insensitive' },
        }
      }

      if (filters.manufacturer) {
        caseWhere.productScan = {
          identifiedManufacturer: { contains: filters.manufacturer, mode: 'insensitive' },
        }
      }

      const cases = await this.db.regulatoryCase.findMany({
        where: caseWhere,
        include: {
          assignedOfficer: { select: { name: true } },
          complaint: { select: { complaintRef: true } },
          productScan: {
            select: {
              identifiedProductName: true,
              identifiedBrand: true,
              identifiedManufacturer: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize * 2,
      })

      for (const c of cases) {
        results.push({
          id: c.id,
          type: 'CASE',
          title: `#${c.caseNumber}: ${c.title}`,
          subtitle: c.productScan?.identifiedProductName ?? (c.complaint ? `Complaint #${c.complaint.complaintRef.slice(-8).toUpperCase()}` : undefined),
          status: c.status,
          priority: c.priority,
          badgeText: `Case · ${c.status}`,
          metadata: {
            caseNumber: c.caseNumber,
            assignedOfficer: c.assignedOfficer?.name ?? 'Unassigned',
            brand: c.productScan?.identifiedBrand,
            manufacturer: c.productScan?.identifiedManufacturer,
          },
          href: `/authority/cases/${c.id}`,
          createdAt: c.createdAt,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CONSUMER COMPLAINTS
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'COMPLAINT') {
      const complaintWhere: Prisma.ComplaintWhereInput = {}

      if (filters.status) {
        complaintWhere.status = filters.status as any
      }

      if (hasDateFilter) {
        complaintWhere.createdAt = dateFilter
      }

      if (q) {
        complaintWhere.OR = [
          { complaintRef: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { scan: { identifiedProductName: { contains: q, mode: 'insensitive' } } },
          { scan: { identifiedBrand: { contains: q, mode: 'insensitive' } } },
        ]
      }

      if (filters.brand) {
        complaintWhere.scan = {
          identifiedBrand: { contains: filters.brand, mode: 'insensitive' },
        }
      }

      const complaints = await this.db.complaint.findMany({
        where: complaintWhere,
        include: {
          case: { select: { id: true, caseNumber: true } },
          scan: { select: { identifiedProductName: true, identifiedBrand: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize * 2,
      })

      for (const comp of complaints) {
        results.push({
          id: comp.id,
          type: 'COMPLAINT',
          title: `#${comp.complaintRef.slice(-8).toUpperCase()}: ${comp.title}`,
          subtitle: comp.scan?.identifiedProductName ?? comp.description.slice(0, 80),
          status: comp.status,
          badgeText: `Complaint · ${comp.status}`,
          metadata: {
            complaintRef: comp.complaintRef,
            caseId: comp.case?.id,
            caseNumber: comp.case?.caseNumber,
            brand: comp.scan?.identifiedBrand,
          },
          href: comp.case ? `/authority/cases/${comp.case.id}` : `/authority/complaints`,
          createdAt: comp.createdAt,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. INSPECTIONS
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'INSPECTION') {
      const inspectionWhere: Prisma.InspectionWhereInput = {}

      // RBAC: Officer only sees own inspections
      if (!isSeniorOrAdmin) {
        inspectionWhere.officerId = user.id
      } else if (filters.officer) {
        inspectionWhere.officer = {
          name: { contains: filters.officer, mode: 'insensitive' },
        }
      }

      if (filters.status) {
        inspectionWhere.status = filters.status as any
      }

      if (hasDateFilter) {
        inspectionWhere.createdAt = dateFilter
      }

      if (q) {
        inspectionWhere.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { id: { contains: q, mode: 'insensitive' } },
          { scan: { identifiedProductName: { contains: q, mode: 'insensitive' } } },
          { scan: { identifiedBrand: { contains: q, mode: 'insensitive' } } },
          { product: { name: { contains: q, mode: 'insensitive' } } },
        ]
      }

      if (filters.brand) {
        inspectionWhere.scan = {
          identifiedBrand: { contains: filters.brand, mode: 'insensitive' },
        }
      }

      const inspections = await this.db.inspection.findMany({
        where: inspectionWhere,
        include: {
          officer: { select: { name: true } },
          decision: { select: { decision: true } },
          case: { select: { id: true, caseNumber: true } },
          scan: { select: { identifiedProductName: true, identifiedBrand: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize * 2,
      })

      for (const ins of inspections) {
        results.push({
          id: ins.id,
          type: 'INSPECTION',
          title: ins.title || `Inspection #${ins.id.slice(-6).toUpperCase()}`,
          subtitle: ins.scan?.identifiedProductName ?? `Inspecting Officer: ${ins.officer.name}`,
          status: ins.status,
          badgeText: `Inspection · ${ins.status}`,
          metadata: {
            officerName: ins.officer.name,
            decision: ins.decision?.decision ?? 'PENDING',
            caseId: ins.case?.id,
            caseNumber: ins.case?.caseNumber,
          },
          href: `/authority/inspections/${ins.id}`,
          createdAt: ins.createdAt,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PRODUCTS & COMMODITIES
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'PRODUCT') {
      const productWhere: Prisma.ProductWhereInput = {}

      if (q) {
        productWhere.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { manufacturer: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ]
      }

      if (filters.brand) {
        productWhere.brand = { contains: filters.brand, mode: 'insensitive' }
      }

      if (filters.manufacturer) {
        productWhere.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' }
      }

      const products = await this.db.product.findMany({
        where: productWhere,
        orderBy: { createdAt: 'desc' },
        take: pageSize * 2,
      })

      for (const p of products) {
        results.push({
          id: p.id,
          type: 'PRODUCT',
          title: p.name,
          subtitle: `${p.brand || 'No brand'} · ${p.manufacturer || 'Manufacturer unknown'}`,
          badgeText: 'Commodity',
          metadata: {
            brand: p.brand,
            manufacturer: p.manufacturer,
            barcode: p.barcode,
            category: p.category,
          },
          href: `/authority/search/products/${p.id}`,
          createdAt: p.createdAt,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. MANUFACTURERS
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'MANUFACTURER') {
      if (q || filters.manufacturer) {
        const mfgQuery = filters.manufacturer || q
        const mfgMatches = await this.db.product.groupBy({
          by: ['manufacturer'],
          where: {
            manufacturer: {
              contains: mfgQuery,
              mode: 'insensitive',
              not: null,
            },
          },
          _count: { id: true },
          orderBy: {
            manufacturer: 'asc',
          },
          take: 10,
        })

        for (const mfg of mfgMatches) {
          if (!mfg.manufacturer) continue
          results.push({
            id: mfg.manufacturer,
            type: 'MANUFACTURER',
            title: mfg.manufacturer,
            subtitle: `${mfg._count.id} registered commodity product(s)`,
            badgeText: 'Manufacturer',
            metadata: {
              name: mfg.manufacturer,
              productsCount: mfg._count.id,
            },
            href: `/authority/search/manufacturers/${encodeURIComponent(mfg.manufacturer)}`,
          })
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. BRANDS
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'BRAND') {
      if (q || filters.brand) {
        const brandQuery = filters.brand || q
        const brandMatches = await this.db.product.groupBy({
          by: ['brand'],
          where: {
            brand: {
              contains: brandQuery,
              mode: 'insensitive',
              not: null,
            },
          },
          _count: { id: true },
          orderBy: {
            brand: 'asc',
          },
          take: 10,
        })

        for (const b of brandMatches) {
          if (!b.brand) continue
          results.push({
            id: b.brand,
            type: 'BRAND',
            title: b.brand,
            subtitle: `${b._count.id} registered commodity product(s)`,
            badgeText: 'Brand',
            metadata: {
              brandName: b.brand,
              productsCount: b._count.id,
            },
            href: `/authority/search/brands/${encodeURIComponent(b.brand)}`,
          })
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 7. RECORDED STATUTORY VIOLATIONS
    // ─────────────────────────────────────────────────────────────
    if (entityType === 'ALL' || entityType === 'VIOLATION') {
      const violationWhere: Prisma.ViolationWhereInput = {}

      // RBAC: Officer only sees violations within their inspections
      if (!isSeniorOrAdmin) {
        violationWhere.inspection = { officerId: user.id }
      }

      if (filters.severity) {
        violationWhere.severity = filters.severity as any
      }

      if (q) {
        violationWhere.OR = [
          { rule: { ruleNumber: { contains: q, mode: 'insensitive' } } },
          { description: { contains: q, mode: 'insensitive' } },
          { rule: { title: { contains: q, mode: 'insensitive' } } },
          { inspection: { title: { contains: q, mode: 'insensitive' } } },
        ]
      }

      const violations = await this.db.violation.findMany({
        where: violationWhere,
        include: {
          rule: { select: { title: true, ruleNumber: true } },
          inspection: {
            select: {
              id: true,
              title: true,
              caseId: true,
              officer: { select: { name: true } },
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: pageSize * 2,
      })

      for (const v of violations) {
        results.push({
          id: v.id,
          type: 'VIOLATION',
          title: `Violation: ${v.rule.ruleNumber} (${v.severity})`,
          subtitle: v.description,
          severity: v.severity,
          badgeText: `Violation · ${v.severity}`,
          metadata: {
            ruleNumber: v.rule.ruleNumber,
            ruleTitle: v.rule?.title,
            inspectionId: v.inspection?.id,
            inspectionTitle: v.inspection?.title,
            officerName: v.inspection?.officer?.name,
            caseId: v.inspection?.caseId,
          },
          href: `/authority/search/violations/${v.id}`,
          createdAt: v.detectedAt,
        })
      }
    }

    // Sort aggregated results by createdAt descending where available
    results.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    })

    const totalCount = results.length
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)
    const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize)

    return {
      results: paginatedResults,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    }
  }

  /**
   * Retrieves the comprehensive historical regulatory footprint for a commodity product.
   */
  async getProductInvestigation(
    productId: string,
    user: { id: string; role: Role }
  ): Promise<ProductInvestigationDossier | null> {
    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    const product = await this.db.product.findUnique({
      where: { id: productId },
    })

    if (!product) return null

    // Scans associated with this product
    const scans = await this.db.productScan.findMany({
      where: { productId },
      include: {
        images: true,
        extractedDeclarations: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Packaging declarations aggregated from the most recent scan
    const latestScan = scans[0]
    const declarations = latestScan
      ? latestScan.extractedDeclarations.map((d) => ({
          id: d.id,
          name: d.fieldName,
          rawValue: d.rawValue,
          normalizedValue: d.normalizedValue,
          status: d.detectionStatus,
          confidence: d.confidence,
        }))
      : []

    // Complaints linked to this product or its scans
    const scanIds = scans.map((s) => s.id)
    const complaints = await this.db.complaint.findMany({
      where: {
        OR: [{ productId }, { scanId: { in: scanIds } }],
      },
      select: {
        id: true,
        complaintRef: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Regulatory Cases
    const casesWhere: Prisma.RegulatoryCaseWhereInput = {
      OR: [
        { productScanId: { in: scanIds } },
        { complaintId: { in: complaints.map((c) => c.id) } },
      ],
    }
    if (!isSeniorOrAdmin) {
      casesWhere.AND = [
        {
          OR: [
            { assignedOfficerId: user.id },
            { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
          ],
        },
      ]
    }

    const cases = await this.db.regulatoryCase.findMany({
      where: casesWhere,
      include: { assignedOfficer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Inspections
    const inspectionWhere: Prisma.InspectionWhereInput = {
      OR: [{ productId }, { scanId: { in: scanIds } }],
    }
    if (!isSeniorOrAdmin) {
      inspectionWhere.officerId = user.id
    }

    const inspections = await this.db.inspection.findMany({
      where: inspectionWhere,
      include: {
        officer: { select: { name: true } },
        decision: { select: { decision: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const inspectionIds = inspections.map((i) => i.id)

    // Formal Violations
    const violations = await this.db.violation.findMany({
      where: { inspectionId: { in: inspectionIds } },
      include: {
        rule: { select: { ruleNumber: true } },
      },
      orderBy: { detectedAt: 'desc' },
    })

    // Online Discrepancies
    const onlineDiscrepancies = await this.db.onlineDiscrepancy.findMany({
      where: {
        verification: {
          scanId: { in: scanIds },
        },
      },
      include: {
        verification: { select: { domain: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Official Reports
    const reports = await this.db.report.findMany({
      where: { inspectionId: { in: inspectionIds } },
      select: {
        id: true,
        reportRef: true,
        title: true,
        format: true,
        generatedAt: true,
      },
      orderBy: { generatedAt: 'desc' },
    })

    return {
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        manufacturer: product.manufacturer,
        category: product.category,
        barcode: product.barcode,
        standardQuantity: (product.metadata as any)?.standardQuantity ?? null,
        declaredMrp: (product.metadata as any)?.declaredMrp ?? null,
        createdAt: product.createdAt,
      },
      packagingDeclarations: declarations,
      scans: scans.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        imagesCount: s.images.length,
      })),
      complaints,
      cases: cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        priority: c.priority,
        assignedOfficer: c.assignedOfficer?.name ?? null,
        createdAt: c.createdAt,
      })),
      inspections: inspections.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        officerName: i.officer.name,
        decision: i.decision?.decision ?? null,
        createdAt: i.createdAt,
      })),
      violations: violations.map((v) => ({
        id: v.id,
        ruleNumber: v.rule.ruleNumber,
        severity: v.severity,
        description: v.description,
        remediation: v.remediationGuidance,
        inspectionId: v.inspectionId ?? '',
        createdAt: v.detectedAt,
      })),
      onlineDiscrepancies: onlineDiscrepancies.map((od) => ({
        id: od.id,
        discrepancyType: od.discrepancyType,
        domain: od.verification.domain ?? 'ecommerce',
        physicalValue: od.physicalValue,
        onlineValue: od.onlineValue,
        severity: od.severity,
        createdAt: od.createdAt,
      })),
      reports,
    }
  }

  /**
   * Aggregates factual historical regulatory records for a manufacturer.
   */
  async getManufacturerInvestigation(
    manufacturerName: string,
    user: { id: string; role: Role }
  ): Promise<EntityInvestigationSummary | null> {
    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    const products = await this.db.product.findMany({
      where: {
        manufacturer: { contains: manufacturerName, mode: 'insensitive' },
      },
      select: { id: true, name: true, brand: true, manufacturer: true, category: true, metadata: true, createdAt: true },
    })

    const productIds = products.map((p) => p.id)

    // Complaints
    const complaints = await this.db.complaint.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { scan: { identifiedManufacturer: { contains: manufacturerName, mode: 'insensitive' } } },
        ],
      },
      select: { id: true, complaintRef: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    // Cases
    const caseWhere: Prisma.RegulatoryCaseWhereInput = {
      OR: [
        { productScan: { identifiedManufacturer: { contains: manufacturerName, mode: 'insensitive' } } },
        { complaintId: { in: complaints.map((c) => c.id) } },
      ],
    }
    if (!isSeniorOrAdmin) {
      caseWhere.AND = [
        {
          OR: [
            { assignedOfficerId: user.id },
            { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
          ],
        },
      ]
    }

    const cases = await this.db.regulatoryCase.findMany({
      where: caseWhere,
      include: { assignedOfficer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Inspections
    const inspectionWhere: Prisma.InspectionWhereInput = {
      OR: [
        { productId: { in: productIds } },
        { scan: { identifiedManufacturer: { contains: manufacturerName, mode: 'insensitive' } } },
      ],
    }
    if (!isSeniorOrAdmin) {
      inspectionWhere.officerId = user.id
    }

    const inspections = await this.db.inspection.findMany({
      where: inspectionWhere,
      include: {
        officer: { select: { name: true } },
        decision: { select: { decision: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const inspectionIds = inspections.map((i) => i.id)

    // Violations
    const violations = await this.db.violation.findMany({
      where: { inspectionId: { in: inspectionIds } },
      include: {
        rule: { select: { ruleNumber: true } },
      },
      orderBy: { detectedAt: 'desc' },
    })

    // Online Discrepancies
    const onlineDiscrepancies = await this.db.onlineDiscrepancy.findMany({
      where: {
        verification: {
          scan: {
            productId: { in: productIds },
          },
        },
      },
      include: { verification: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      name: manufacturerName,
      type: 'MANUFACTURER',
      summaryCounts: {
        productsCount: products.length,
        complaintsCount: complaints.length,
        casesCount: cases.length,
        inspectionsCount: inspections.length,
        violationsCount: violations.length,
        onlineDiscrepanciesCount: onlineDiscrepancies.length,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer,
        category: p.category,
        standardQuantity: (p.metadata as any)?.standardQuantity ?? null,
        declaredMrp: (p.metadata as any)?.declaredMrp ?? null,
        createdAt: p.createdAt,
      })),
      complaints,
      cases: cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        priority: c.priority,
        assignedOfficer: c.assignedOfficer?.name ?? null,
        createdAt: c.createdAt,
      })),
      inspections: inspections.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        officerName: i.officer.name,
        decision: i.decision?.decision ?? null,
        createdAt: i.createdAt,
      })),
      violations: violations.map((v) => ({
        id: v.id,
        ruleNumber: v.rule.ruleNumber,
        severity: v.severity,
        description: v.description,
        remediation: v.remediationGuidance,
        inspectionId: v.inspectionId ?? '',
        createdAt: v.detectedAt,
      })),
      onlineDiscrepancies: onlineDiscrepancies.map((od) => ({
        id: od.id,
        discrepancyType: od.discrepancyType,
        domain: od.verification.domain ?? 'ecommerce',
        physicalValue: od.physicalValue,
        onlineValue: od.onlineValue,
        severity: od.severity,
        createdAt: od.createdAt,
      })),
    }
  }

  /**
   * Aggregates factual historical regulatory records for a brand.
   */
  async getBrandInvestigation(
    brandName: string,
    user: { id: string; role: Role }
  ): Promise<EntityInvestigationSummary | null> {
    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    const products = await this.db.product.findMany({
      where: {
        brand: { contains: brandName, mode: 'insensitive' },
      },
      select: { id: true, name: true, brand: true, manufacturer: true, category: true, metadata: true, createdAt: true },
    })

    const productIds = products.map((p) => p.id)

    // Complaints
    const complaints = await this.db.complaint.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { scan: { identifiedBrand: { contains: brandName, mode: 'insensitive' } } },
        ],
      },
      select: { id: true, complaintRef: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    // Cases
    const caseWhere: Prisma.RegulatoryCaseWhereInput = {
      OR: [
        { productScan: { identifiedBrand: { contains: brandName, mode: 'insensitive' } } },
        { complaintId: { in: complaints.map((c) => c.id) } },
      ],
    }
    if (!isSeniorOrAdmin) {
      caseWhere.AND = [
        {
          OR: [
            { assignedOfficerId: user.id },
            { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
          ],
        },
      ]
    }

    const cases = await this.db.regulatoryCase.findMany({
      where: caseWhere,
      include: { assignedOfficer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Inspections
    const inspectionWhere: Prisma.InspectionWhereInput = {
      OR: [
        { productId: { in: productIds } },
        { scan: { identifiedBrand: { contains: brandName, mode: 'insensitive' } } },
      ],
    }
    if (!isSeniorOrAdmin) {
      inspectionWhere.officerId = user.id
    }

    const inspections = await this.db.inspection.findMany({
      where: inspectionWhere,
      include: {
        officer: { select: { name: true } },
        decision: { select: { decision: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const inspectionIds = inspections.map((i) => i.id)

    // Violations
    const violations = await this.db.violation.findMany({
      where: { inspectionId: { in: inspectionIds } },
      include: {
        rule: { select: { ruleNumber: true } },
      },
      orderBy: { detectedAt: 'desc' },
    })

    // Online Discrepancies
    const onlineDiscrepancies = await this.db.onlineDiscrepancy.findMany({
      where: {
        verification: {
          scan: {
            productId: { in: productIds },
          },
        },
      },
      include: { verification: { select: { domain: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      name: brandName,
      type: 'BRAND',
      summaryCounts: {
        productsCount: products.length,
        complaintsCount: complaints.length,
        casesCount: cases.length,
        inspectionsCount: inspections.length,
        violationsCount: violations.length,
        onlineDiscrepanciesCount: onlineDiscrepancies.length,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer,
        category: p.category,
        standardQuantity: (p.metadata as any)?.standardQuantity ?? null,
        declaredMrp: (p.metadata as any)?.declaredMrp ?? null,
        createdAt: p.createdAt,
      })),
      complaints,
      cases: cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        priority: c.priority,
        assignedOfficer: c.assignedOfficer?.name ?? null,
        createdAt: c.createdAt,
      })),
      inspections: inspections.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        officerName: i.officer.name,
        decision: i.decision?.decision ?? null,
        createdAt: i.createdAt,
      })),
      violations: violations.map((v) => ({
        id: v.id,
        ruleNumber: v.rule.ruleNumber,
        severity: v.severity,
        description: v.description,
        remediation: v.remediationGuidance,
        inspectionId: v.inspectionId ?? '',
        createdAt: v.detectedAt,
      })),
      onlineDiscrepancies: onlineDiscrepancies.map((od) => ({
        id: od.id,
        discrepancyType: od.discrepancyType,
        domain: od.verification.domain ?? 'ecommerce',
        physicalValue: od.physicalValue,
        onlineValue: od.onlineValue,
        severity: od.severity,
        createdAt: od.createdAt,
      })),
    }
  }

  /**
   * Retrieves full investigative context for a recorded statutory violation.
   * Permanently tied to the exact historical RuleVersion snapshot.
   */
  async getViolationInvestigation(
    violationId: string,
    user: { id: string; role: Role }
  ): Promise<ViolationInvestigationDossier | null> {
    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    const violation = await this.db.violation.findUnique({
      where: { id: violationId },
      include: {
        rule: true,
        evidenceItems: true,
        inspection: {
          include: {
            officer: { select: { name: true } },
            decision: true,
            case: true,
            product: true,
            complaint: { select: { id: true } },
            complianceChecks: true,
            evidence: true,
          },
        },
      },
    })

    if (!violation || !violation.inspection) return null

    // RBAC: Check inspection access
    if (!isSeniorOrAdmin && violation.inspection.officerId !== user.id) {
      return null
    }

    // Find linked compliance check if any (by ruleId)
    const complianceCheck = violation.inspection.complianceChecks.find(
      (c) => c.ruleId === violation.ruleId
    )

    // Resolve exact historical RuleVersion snapshot
    let historicalRuleVersion = null
    const versionNumber = complianceCheck?.ruleVersionNumber ?? 1
    const ruleVersion = await this.db.ruleVersion.findFirst({
      where: {
        ruleId: violation.ruleId,
        versionNumber,
      },
    })

    if (ruleVersion) {
      historicalRuleVersion = {
        versionNumber: ruleVersion.versionNumber,
        changeDescription: ruleVersion.changeDescription,
        effectiveDate: ruleVersion.effectiveDate,
        snapshot: ruleVersion.snapshot,
      }
    }

    const evidenceList = [
      ...violation.evidenceItems,
      ...violation.inspection.evidence,
    ]
    const uniqueEvidence = Array.from(new Map(evidenceList.map((e) => [e.id, e])).values())

    // Read-only query for related active RegulatoryCases using shared product/scan/complaint context
    let relatedActiveCase = null
    if (!violation.inspection.case) {
      const orConditions: Prisma.RegulatoryCaseWhereInput[] = []
      if (violation.inspection.scanId) {
        orConditions.push({ productScanId: violation.inspection.scanId })
      }
      if (violation.inspection.productId) {
        orConditions.push({ productScan: { productId: violation.inspection.productId } })
      }
      if (violation.inspection.complaint?.id) {
        orConditions.push({ complaintId: violation.inspection.complaint.id })
      }

      if (orConditions.length > 0) {
        const related = await this.db.regulatoryCase.findFirst({
          where: {
            OR: orConditions,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'DECISION_PENDING'] },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (related) {
          // RBAC isolation: Officer only sees case if assigned to them or unassigned
          if (isSeniorOrAdmin || !related.assignedOfficerId || related.assignedOfficerId === user.id) {
            relatedActiveCase = {
              id: related.id,
              caseNumber: related.caseNumber,
              title: related.title,
              status: related.status,
              priority: related.priority,
            }
          }
        }
      }
    }

    return {
      violation: {
        id: violation.id,
        ruleNumber: violation.rule.ruleNumber,
        severity: violation.severity,
        description: violation.description,
        remediation: violation.remediationGuidance,
        createdAt: violation.detectedAt,
      },
      complianceCheck: complianceCheck
        ? {
            id: complianceCheck.id,
            status: complianceCheck.status,
            evaluationDetails: complianceCheck.evaluationDetails,
            officerNote: complianceCheck.officerNote,
            checkedAt: complianceCheck.checkedAt,
          }
        : null,
      rule: {
        id: violation.rule.id,
        ruleNumber: violation.rule.ruleNumber,
        title: violation.rule.title,
        description: violation.rule.requirement,
        sourceDocument: violation.rule.sourceDocument,
        sourceReference: violation.rule.sourceReference,
        defaultSeverity: violation.rule.defaultSeverity,
        effectiveDate: violation.rule.effectiveDate,
      },
      historicalRuleVersion,
      inspection: {
        id: violation.inspection.id,
        title: violation.inspection.title,
        status: violation.inspection.status,
        officerName: violation.inspection.officer.name,
        createdAt: violation.inspection.createdAt,
        decision: violation.inspection.decision
          ? {
              decision: violation.inspection.decision.decision,
              remarks: violation.inspection.decision.remarks,
              decidedAt: violation.inspection.decision.decidedAt,
            }
          : null,
      },
      case: violation.inspection.case
        ? {
            id: violation.inspection.case.id,
            caseNumber: violation.inspection.case.caseNumber,
            title: violation.inspection.case.title,
            status: violation.inspection.case.status,
            priority: violation.inspection.case.priority,
          }
        : null,
      relatedActiveCase,
      product: violation.inspection.product
        ? {
            id: violation.inspection.product.id,
            name: violation.inspection.product.name,
            brand: violation.inspection.product.brand,
            manufacturer: violation.inspection.product.manufacturer,
          }
        : null,
      evidenceItems: uniqueEvidence.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title ?? `Evidence ${e.id.slice(0, 8)}`,
        notes: e.description ?? null,
        sha256Hash: (e.metadata as any)?.sha256Hash ?? '—',
        createdAt: e.createdAt,
      })),
    }
  }
}

export const defaultAuthoritySearchService = new AuthoritySearchService()
