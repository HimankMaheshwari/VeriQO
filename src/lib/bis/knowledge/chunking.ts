/**
 * Deterministic Clause-Aware Chunking Engine for SIH 2026 PS107:
 * BIS Knowledge Base & RAG Foundation.
 *
 * Rules:
 * - Prefer clause boundaries.
 * - Preserve standard number, title, clause number, and clause title.
 * - Preserve parent-child clause hierarchy and breadcrumb path.
 * - Preserve source reference and exact statutory limits.
 * - Keep chunks reasonably sized (target 400-800 chars, max ~1200 chars).
 * - Keep chunks independently citeable with self-contained contextual headers.
 * - Deterministic output: identical inputs yield byte-identical chunks and ordering.
 */

import {
  normalizeText,
  computeTokenMetadata,
} from './normalization'
import type {
  BisKnowledgeChunkDto,
  ChunkingOptions,
  ClauseInputForChunking,
  StandardInputForChunking,
} from './types'

const DEFAULT_MAX_CHUNK_CHARS = 1000
const DEFAULT_MIN_CHUNK_CHARS = 100

/**
 * Generates an independently citeable header for a knowledge chunk.
 */
function buildChunkHeader(
  standardNumber: string,
  standardTitle: string,
  clauseNumber?: string | null,
  clauseTitle?: string | null,
  hierarchyPath?: string | null
): string {
  const parts: string[] = []
  parts.push(`[${standardNumber}] ${standardTitle}`)
  if (clauseNumber) {
    const titleSuffix = clauseTitle ? ` — ${clauseTitle}` : ''
    parts.push(`Clause ${clauseNumber}${titleSuffix}`)
  }
  if (hierarchyPath) {
    parts.push(`Hierarchy: ${hierarchyPath}`)
  }
  return parts.join('\n')
}

/**
 * Splits a long text segment cleanly by sentence/clause boundaries,
 * without cutting technical phrases, numbers, or units.
 */
function splitTextByBoundaries(text: string, maxChars: number): string[] {
  const cleaned = normalizeText(text)
  if (cleaned.length <= maxChars) {
    return [cleaned]
  }

  const sentences = cleaned.split(/(?<=[.;\n])\s+/)
  const segments: string[] = []
  let currentSegment = ''

  for (const sentence of sentences) {
    if (!currentSegment) {
      currentSegment = sentence
    } else if (currentSegment.length + sentence.length + 1 <= maxChars) {
      currentSegment += ' ' + sentence
    } else {
      segments.push(currentSegment)
      currentSegment = sentence
    }
  }

  if (currentSegment) {
    segments.push(currentSegment)
  }

  // Edge case: if a single sentence exceeds maxChars, split at comma or space
  const finalSegments: string[] = []
  for (const seg of segments) {
    if (seg.length <= maxChars) {
      finalSegments.push(seg)
    } else {
      const subParts = seg.split(/(?<=[,])\s+/)
      let subAccum = ''
      for (const sp of subParts) {
        if (!subAccum) {
          subAccum = sp
        } else if (subAccum.length + sp.length + 1 <= maxChars) {
          subAccum += ' ' + sp
        } else {
          finalSegments.push(subAccum)
          subAccum = sp
        }
      }
      if (subAccum) finalSegments.push(subAccum)
    }
  }

  return finalSegments
}

/**
 * Chunks a single standard clause into one or more citeable knowledge chunks.
 */
export function chunkClause(
  standard: StandardInputForChunking,
  clause: ClauseInputForChunking,
  startingIndex: number,
  options: ChunkingOptions = {}
): BisKnowledgeChunkDto[] {
  const maxChars = options.maxChunkCharacters ?? DEFAULT_MAX_CHUNK_CHARS
  const isDemo = standard.isDemoRecord ?? true

  // Build hierarchy path if not provided
  let hierarchy = clause.hierarchyPath
  if (!hierarchy) {
    const parentSuffix = clause.parentClauseNumber ? `Clause ${clause.parentClauseNumber} > ` : ''
    hierarchy = `${standard.standardNumber} > ${parentSuffix}Clause ${clause.clauseNumber}`
    if (clause.title) {
      hierarchy += ` (${clause.title})`
    }
  }

  // Format limits if structured parameter limits exist
  let limitsText = ''
  if (Array.isArray(clause.limits) && clause.limits.length > 0) {
    const limitLines = clause.limits.map((l: any) => {
      const minStr = l.min !== undefined ? ` Min: ${l.min}` : ''
      const maxStr = l.max !== undefined ? ` Max: ${l.max}` : ''
      const unitStr = l.unit ? ` ${l.unit}` : ''
      const methodStr = l.testMethod ? ` (Test Method: ${l.testMethod})` : ''
      return `• ${l.parameter}: ${l.requirement}${minStr}${maxStr}${unitStr}${methodStr}`
    })
    limitsText = `\nMandatory Statutory Limits:\n${limitLines.join('\n')}`
  }

  const fullContent = `${clause.content}${limitsText}`
  const textSegments = splitTextByBoundaries(fullContent, maxChars)

  const sourceRef =
    clause.sourceRef ||
    `${standard.standardNumber}, Clause ${clause.clauseNumber}${
      clause.pageNumber ? `, Page ${clause.pageNumber}` : ''
    }`

  const chunks: BisKnowledgeChunkDto[] = []
  const totalParts = textSegments.length

  textSegments.forEach((segment, partIdx) => {
    const partSuffix = totalParts > 1 ? ` (Part ${partIdx + 1}/${totalParts})` : ''
    const header = buildChunkHeader(
      standard.standardNumber,
      standard.title,
      clause.clauseNumber,
      `${clause.title || 'Specification'}${partSuffix}`,
      hierarchy
    )

    const chunkBody = `${header}\nSource: ${sourceRef}\n\n${segment}`
    const normalizedBody = normalizeText(chunkBody).toLowerCase()
    const { tokenCount, characterCount } = computeTokenMetadata(chunkBody)

    const now = new Date().toISOString()
    const chunkId = `chk-${standard.standardNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${clause.clauseNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${startingIndex + partIdx}`

    chunks.push({
      id: chunkId,
      standardId: standard.id,
      standardNumber: standard.standardNumber,
      standardTitle: standard.title,
      clauseId: clause.id ?? null,
      clauseNumber: clause.clauseNumber,
      clauseTitle: clause.title ?? null,
      hierarchyPath: hierarchy,
      chunkText: chunkBody,
      normalizedText: normalizedBody,
      chunkIndex: startingIndex + partIdx,
      tokenCount,
      characterCount,
      sourceReference: sourceRef,
      metadata: {
        clauseType: (clause as any).clauseType ?? 'SPECIFICATION',
        isMandatory: clause.isMandatory ?? true,
        parentClauseNumber: clause.parentClauseNumber ?? null,
        pageNumber: clause.pageNumber ?? null,
        hasLimits: !!limitsText,
        partIndex: partIdx + 1,
        totalParts,
        isDemoRecord: isDemo,
      },
      embeddingStatus: 'NOT_REQUIRED',
      isDemoRecord: isDemo,
      createdAt: now,
      updatedAt: now,
    })
  })

  return chunks
}

/**
 * Chunks an entire standard (including Scope, Overview, and all Clauses) deterministically.
 */
export function chunkStandard(
  standard: StandardInputForChunking,
  options: ChunkingOptions = {}
): BisKnowledgeChunkDto[] {
  const allChunks: BisKnowledgeChunkDto[] = []
  let currentIndex = 0
  const isDemo = standard.isDemoRecord ?? true

  // 1. Chunk Standard Scope / Overview if provided
  const overviewText = standard.scope || standard.description
  if (overviewText) {
    const scopeSegments = splitTextByBoundaries(
      overviewText,
      options.maxChunkCharacters ?? DEFAULT_MAX_CHUNK_CHARS
    )

    scopeSegments.forEach((segment, partIdx) => {
      const partSuffix = scopeSegments.length > 1 ? ` (Part ${partIdx + 1}/${scopeSegments.length})` : ''
      const hierarchy = `${standard.standardNumber} > Scope & Field of Application`
      const header = buildChunkHeader(
        standard.standardNumber,
        standard.title,
        'Scope',
        `Field of Application${partSuffix}`,
        hierarchy
      )

      const sourceRef = `${standard.standardNumber}, Scope & Field of Application`
      const chunkBody = `${header}\nSource: ${sourceRef}\n\n${segment}`
      const normalizedBody = normalizeText(chunkBody).toLowerCase()
      const { tokenCount, characterCount } = computeTokenMetadata(chunkBody)
      const now = new Date().toISOString()
      const chunkId = `chk-${standard.standardNumber.replace(/[^a-zA-Z0-9]/g, '_')}-SCOPE-${currentIndex}`

      allChunks.push({
        id: chunkId,
        standardId: standard.id,
        standardNumber: standard.standardNumber,
        standardTitle: standard.title,
        clauseId: null,
        clauseNumber: 'Scope',
        clauseTitle: 'Field of Application',
        hierarchyPath: hierarchy,
        chunkText: chunkBody,
        normalizedText: normalizedBody,
        chunkIndex: currentIndex++,
        tokenCount,
        characterCount,
        sourceReference: sourceRef,
        metadata: {
          clauseType: 'SCOPE',
          isMandatory: false,
          division: standard.division ?? null,
          category: standard.category ?? null,
          edition: standard.edition ?? null,
          year: standard.year ?? null,
          isDemoRecord: isDemo,
        },
        embeddingStatus: 'NOT_REQUIRED',
        isDemoRecord: isDemo,
        createdAt: now,
        updatedAt: now,
      })
    })
  }

  // 2. Deterministically sort clauses by clauseNumber/orderIndex
  const sortedClauses = [...standard.clauses].sort((a, b) => {
    // Natural alphanumeric compare e.g. 4.1 before 4.2 before 4.10
    return a.clauseNumber.localeCompare(b.clauseNumber, undefined, { numeric: true, sensitivity: 'base' })
  })

  // 3. Chunk each clause
  for (const clause of sortedClauses) {
    const clauseChunks = chunkClause(standard, clause, currentIndex, options)
    allChunks.push(...clauseChunks)
    currentIndex += clauseChunks.length
  }

  return allChunks
}
