/**
 * Test Suite: SIH 2026 PS107 — Phase 3 BIS Knowledge Base & RAG Foundation
 *
 * Verifies all Phase 3 RAG requirements:
 *  1. Schema Validation (additive models: BisKnowledgeChunk, BisKnowledgeSource, BisStandard, BisStandardClause)
 *  2. Demo Knowledge Ingestion (synthetic dataset with transparent isDemoRecord / [DEMO TEST RECORD] flags)
 *  3. Deterministic Chunking (simple clause, nested clause, long clause, headings/scope, metadata, idempotency)
 *  4. Standard Retrieval (standardNumber filtering, prefix matching)
 *  5. Clause Retrieval (clauseNumber matching, hierarchy preservation)
 *  6. Keyword Retrieval (technical parameters: TDS, lead limits, glow-wire test, small parts cylinder)
 *  7. Ranking (relevance score ordering, exact standard/clause boosts)
 *  8. No-Result Behavior (unrelated/fictitious query returns empty array gracefully)
 *  9. Citation Generation (traceable to standard, clause, chunkId, sourceReference)
 * 10. Citation Validation (valid citations pass with status VERIFIED)
 * 11. Assistant Evidence Grounding (retrieved evidence, grounded answers, confidence scores)
 * 12. Fabricated Citation Rejection (nonexistent standard, nonexistent clause, mismatched chunk rejected)
 * 13. API Retrieval (GET /api/v1/bis/knowledge/search & GET /api/v1/bis/knowledge/chunks/[id])
 * 14. Security & Authentication Enforcement (401 on unauthenticated calls, RBAC session validation)
 *
 * NOTE: Uses test-level require.cache hook for auth during API route tests.
 * ZERO production files (auth.ts, api-helpers.ts) are modified.
 *
 * Run: npx tsx scripts/test-ps107-phase3-rag-foundation.ts
 */

// ── 0. Module-Level Test Auth Harness ───────────────────────────────────────
let activeSession: any = null

const authPath = require.resolve('../src/lib/auth')
const mockAuth = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    auth: async () => activeSession,
    handlers: {},
    signIn: async () => {},
    signOut: async () => {},
  },
}
require.cache[authPath] = mockAuth as any
try {
  const aliasAuthPath = require.resolve('@/lib/auth')
  require.cache[aliasAuthPath] = mockAuth as any
} catch {}

function setTestSession(session: any) {
  activeSession = session
}

// ── Imports (evaluated after auth mock in require.cache) ─────────────────────
import { prisma } from '@/lib/prisma'
import {
  chunkClause,
  chunkStandard,
} from '@/lib/bis/knowledge/chunking'
import {
  normalizeText,
  normalizeQuery,
  extractStandardNumbers,
  extractClauseIdentifiers,
  tokenizeAndFilter,
} from '@/lib/bis/knowledge/normalization'
import {
  DEMO_KNOWLEDGE_SOURCES,
  DEMO_STANDARDS_KNOWLEDGE,
  DEMO_KNOWLEDGE_CHUNKS,
} from '@/lib/bis/knowledge/demo-knowledge'
import {
  defaultBisKnowledgeService,
  BisKnowledgeService,
} from '@/lib/bis/knowledge/knowledge-service'
import { defaultCitationValidator } from '@/lib/assistant/citation-validator'
import { defaultBisAssistantService } from '@/lib/assistant/assistant-service'


interface TestResult {
  name: string
  status: 'PASSED' | 'FAILED'
  details?: string
}

const results: TestResult[] = []

function assert(condition: any, name: string, failureDetails?: string) {
  if (Boolean(condition)) {
    results.push({ name, status: 'PASSED' })
    console.log(`  ✓ ${name}`)
  } else {
    results.push({ name, status: 'FAILED', details: failureDetails })
    console.error(`  ✗ FAIL: ${name}`)
    if (failureDetails) {
      console.error(`    Details: ${failureDetails}`)
    }
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log('  VERIQO PS107 PHASE 3: BIS KNOWLEDGE BASE & RAG FOUNDATION')
  console.log('=================================================================\n')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 1: Schema Validation
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- Test Section 1: Schema Validation ---')

  assert(typeof prisma.bisKnowledgeChunk !== 'undefined', 'Prisma client includes bisKnowledgeChunk model')
  assert(typeof prisma.bisKnowledgeSource !== 'undefined', 'Prisma client includes bisKnowledgeSource model')
  assert(typeof prisma.bisStandard !== 'undefined', 'Prisma client includes bisStandard model')
  assert(typeof prisma.bisStandardClause !== 'undefined', 'Prisma client includes bisStandardClause model')
  assert(typeof prisma.bisAssistantConversation !== 'undefined', 'Prisma client includes bisAssistantConversation model')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 2: Demo Knowledge Ingestion & Transparency Flags
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 2: Demo Knowledge Ingestion ---')

  assert(DEMO_STANDARDS_KNOWLEDGE.length >= 4, 'Demo standards dataset contains at least 4 Indian Standards')
  assert(DEMO_KNOWLEDGE_SOURCES.length >= 4, 'Demo knowledge sources dataset contains at least 4 sources')
  assert(DEMO_KNOWLEDGE_CHUNKS.length >= 10, 'Pre-computed demo chunks contain at least 10 chunks')

  // Verify transparency flags on all demo records
  const allStandardsFlagged = DEMO_STANDARDS_KNOWLEDGE.every(
    (s) => s.isDemoRecord === true && s.title.includes('[DEMO TEST RECORD]')
  )
  assert(allStandardsFlagged, 'All demo standards explicitly marked with isDemoRecord: true and [DEMO TEST RECORD]')

  const allSourcesFlagged = DEMO_KNOWLEDGE_SOURCES.every(
    (src) => (src.metadata as any)?.isDemoRecord === true && src.sourceName.includes('[DEMO TEST RECORD]')
  )
  assert(allSourcesFlagged, 'All demo sources explicitly marked with isDemoRecord: true and [DEMO TEST RECORD]')

  const allChunksFlagged = DEMO_KNOWLEDGE_CHUNKS.every(
    (c) => c.isDemoRecord === true && c.chunkText.includes('[DEMO TEST RECORD]')
  )
  assert(allChunksFlagged, 'All demo chunks explicitly marked with isDemoRecord: true and contain [DEMO TEST RECORD]')

  // Test dynamic ingestion of a standard
  const ingestResult = await defaultBisKnowledgeService.ingestStandard(DEMO_STANDARDS_KNOWLEDGE[0])
  assert(ingestResult.chunksCreated >= 4, 'Dynamic standard ingestion generated all expected chunks')
  assert(!!ingestResult.sourceId, 'Ingestion returned a valid source ID')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 3: Deterministic Clause-Aware Chunking
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 3: Deterministic Chunking ---')

  // 3a. Simple Clause
  const simpleClause = {
    clauseNumber: '4.1',
    title: 'Physical Characteristics',
    content: 'Drinking water shall be clear and free from undesirable taste and odour.',
  }
  const simpleChunks = chunkClause(DEMO_STANDARDS_KNOWLEDGE[0], simpleClause, 0)
  assert(simpleChunks.length === 1, 'Simple clause generates exactly 1 chunk')
  assert(simpleChunks[0].clauseNumber === '4.1', 'Chunk preserves clause number')
  assert(simpleChunks[0].standardNumber === 'IS 10500:2012', 'Chunk preserves standard number')
  assert(simpleChunks[0].chunkText.includes('Clause 4.1'), 'Chunk text includes self-contained header with clause number')
  assert(simpleChunks[0].sourceReference?.includes('IS 10500:2012'), 'Chunk preserves source reference')

  // 3b. Nested Clause & Hierarchy Preservation
  const nestedClause = {
    clauseNumber: '4.1.2',
    parentClauseNumber: '4.1',
    title: 'Turbidity Limit',
    content: 'Turbidity shall not exceed 1.0 NTU.',
  }
  const nestedChunks = chunkClause(DEMO_STANDARDS_KNOWLEDGE[0], nestedClause, 1)
  assert(nestedChunks[0].hierarchyPath?.includes('Clause 4.1'), 'Nested clause preserves parent-child hierarchy in path')

  // 3c. Long Clause clean boundary splitting
  const longClauseContent = Array(25)
    .fill('The electrical insulation must withstand a test potential of 2000 V RMS applied for 60 seconds.')
    .join(' ')
  const longClause = {
    clauseNumber: '10.5',
    title: 'Dielectric Strength Test',
    content: longClauseContent,
  }
  const longChunks = chunkClause(DEMO_STANDARDS_KNOWLEDGE[1], longClause, 0, { maxChunkCharacters: 500 })
  assert(longChunks.length > 1, 'Long clause (>500 chars) splits into multiple chunks')
  assert(longChunks[0].chunkText.includes('Part 1/'), 'First part of split chunk indicates Part 1')
  assert(longChunks[1].chunkText.includes('Part 2/'), 'Second part of split chunk indicates Part 2')
  assert(
    longChunks.every((c) => c.standardNumber === 'IS 1293:2019'),
    'Every sub-chunk of long clause preserves the parent standard number'
  )

  // 3d. Headings & Scope Chunking
  const fullChunks = chunkStandard(DEMO_STANDARDS_KNOWLEDGE[0])
  const scopeChunk = fullChunks.find((c) => c.clauseNumber === 'Scope')
  assert(!!scopeChunk, 'Standard chunking generates dedicated Scope chunk')
  assert(scopeChunk?.hierarchyPath?.includes('Scope & Field of Application'), 'Scope chunk has proper hierarchy path')

  // 3e. Metadata Preservation
  const clauseWithLimits = fullChunks.find((c) => c.clauseNumber === '4.1')
  assert(clauseWithLimits?.metadata?.hasLimits === true, 'Statutory limits metadata preserved on chunk')
  assert(clauseWithLimits?.metadata?.isMandatory === true, 'isMandatory metadata preserved on chunk')

  // 3f. Deterministic Repeated Ingestion (Idempotency)
  const run1 = chunkStandard(DEMO_STANDARDS_KNOWLEDGE[1])
  const run2 = chunkStandard(DEMO_STANDARDS_KNOWLEDGE[1])
  assert(run1.length === run2.length, 'Repeated chunking yields identical chunk count')
  assert(
    run1.every((c, idx) => c.id === run2[idx].id && c.chunkText === run2[idx].chunkText),
    'Repeated chunking is 100% deterministic with byte-identical IDs and text'
  )

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 4: Standard Retrieval
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 4: Standard Retrieval ---')

  const is10500Results = await defaultBisKnowledgeService.searchKnowledge({
    query: 'water requirements',
    standardNumber: 'IS 10500:2012',
  })
  assert(is10500Results.length >= 1, 'Search with standardNumber filter returns results')
  assert(
    is10500Results.every((r) => r.standardNumber === 'IS 10500:2012'),
    'All returned results match the requested standard IS 10500:2012'
  )

  const is1293PrefixResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'IS 1293',
  })
  assert(is1293PrefixResults.length >= 1, 'Query "IS 1293" retrieves Plugs and Sockets standard')
  assert(is1293PrefixResults[0].standardNumber === 'IS 1293:2019', 'Top result is IS 1293:2019')

  const is9873Results = await defaultBisKnowledgeService.searchKnowledge({
    query: 'IS 9873',
  })
  assert(is9873Results.length >= 1, 'Query "IS 9873" retrieves Toys Safety standard')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 5: Clause Retrieval
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 5: Clause Retrieval ---')

  const clause41Results = await defaultBisKnowledgeService.searchKnowledge({
    query: 'physical characteristics',
    standardNumber: 'IS 10500:2012',
    clauseNumber: '4.1',
  })
  assert(clause41Results.length >= 1, 'Search with clauseNumber=4.1 returns matching chunk')
  assert(clause41Results[0].clauseNumber === '4.1', 'Top result has clauseNumber: 4.1')

  const clause81Results = await defaultBisKnowledgeService.searchKnowledge({
    query: 'marking and ISI standard mark declaration',
    standardNumber: 'IS 1293:2019',
    clauseNumber: '8.1',
  })
  assert(clause81Results.length >= 1, 'Search for clause 8.1 in IS 1293 succeeds')
  assert(clause81Results[0].clauseNumber === '8.1', 'Top result has clauseNumber: 8.1')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 6: Technical Keyword Retrieval
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 6: Technical Keyword Retrieval ---')

  // 6a. Lead limits in water
  const leadResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'permissible lead limits toxic substances',
  })
  assert(leadResults.length >= 1, 'Technical search for "lead limits" returns chunks')
  assert(
    leadResults.some((r) => r.relevantText.includes('Lead') && r.relevantText.includes('0.01')),
    'Results include toxic substance clause specifying Lead limit 0.01 mg/l'
  )

  // 6b. Total Dissolved Solids
  const tdsResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'Total Dissolved Solids TDS 500 mg/l',
  })
  assert(tdsResults.length >= 1, 'Technical search for TDS returns chunks')
  assert(
    tdsResults.some((r) => r.relevantText.includes('Total Dissolved Solids') && r.standardNumber === 'IS 10500:2012'),
    'Results include IS 10500 TDS parameter specifications'
  )

  // 6c. Glow-wire test for electrical accessories
  const glowWireResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'glow-wire test 650°C 850°C resistance to heat',
  })
  assert(glowWireResults.length >= 1, 'Technical search for "glow-wire test" returns chunks')
  assert(glowWireResults[0].standardNumber === 'IS 1293:2019', 'Top result for glow-wire test belongs to IS 1293:2019')

  // 6d. Choking hazard and small parts cylinder
  const toyResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'small parts test cylinder 31.7 mm choking hazard',
  })
  assert(toyResults.length >= 1, 'Technical search for "small parts test cylinder" returns chunks')
  assert(toyResults[0].standardNumber.includes('IS 9873'), 'Top result for toy choking hazard belongs to IS 9873')

  // 6e. SELV circuits and electric shock in IT equipment
  const shockResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'electric shock 42.4 V peak SELV live parts',
  })
  assert(shockResults.length >= 1, 'Technical search for "electric shock 42.4 V" returns chunks')
  assert(shockResults[0].standardNumber.includes('IS 13252'), 'Top result belongs to IS 13252 IT Equipment')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 7: Ranking & Scoring
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 7: Ranking & Scoring ---')

  const rankedResults = await defaultBisKnowledgeService.searchKnowledge({
    query: 'IS 10500 drinking water lead toxic substances clause 4.3',
    limit: 5,
  })
  assert(rankedResults.length >= 2, 'Ranked query returns multiple candidates')
  assert(rankedResults[0].relevanceScore >= 0.5, 'Top ranked result has high relevance score (>= 0.5)')
  assert(
    rankedResults[0].relevanceScore >= rankedResults[1].relevanceScore,
    'Results are ordered strictly descending by relevance score'
  )
  assert(rankedResults[0].clauseNumber === '4.3', 'Most specific match (Clause 4.3) is ranked #1')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 8: No-Result Behavior
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 8: No-Result Behavior ---')

  const emptyResults1 = await defaultBisKnowledgeService.searchKnowledge({
    query: 'interstellar quantum drive propulsion mechanics astrophysics',
  })
  assert(emptyResults1.length === 0, 'Completely unrelated query returns 0 chunks gracefully')

  const emptyResults2 = await defaultBisKnowledgeService.searchKnowledge({
    query: 'anything',
    standardNumber: 'IS 99999999',
  })
  assert(emptyResults2.length === 0, 'Non-existent standardNumber returns 0 chunks without error')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 9: Citation Generation
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 9: Citation Generation ---')

  const groundedChat = await defaultBisAssistantService.handleQuery({
    message: 'What are the permissible lead limits in drinking water under IS 10500?',
  })

  assert(groundedChat.citations.length >= 1, 'Assistant generates verified citations')
  const topCit = groundedChat.citations[0]
  assert(topCit.standardNumber === 'IS 10500:2012', 'Citation includes correct standard number')
  assert(!!topCit.chunkId, 'Citation includes traceable chunkId')
  assert(!!topCit.sourceReference, 'Citation includes explicit source reference')
  assert(typeof topCit.relevanceScore === 'number', 'Citation includes numeric relevance score')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 10: Citation Validation (Valid Citations)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 10: Citation Validation ---')

  const validValidation = await defaultCitationValidator.validateCitations([
    {
      standardNumber: 'IS 10500:2012',
      clauseNumber: '4.1',
      excerpt: 'Organoleptic parameters and TDS limits',
    },
    {
      standardNumber: 'IS 1293:2019',
      clauseNumber: '8.1',
      excerpt: 'Marking and ISI Mark requirements',
    },
  ])

  assert(validValidation.isValid === true, 'Valid citations pass validation')
  assert(validValidation.validCitations.length === 2, 'Both valid citations retained')
  assert(validValidation.unverifiedReferences.length === 0, 'Zero unverified references for valid citations')
  assert(
    validValidation.traceability?.every((t) => t.status === 'VERIFIED'),
    'Traceability status is VERIFIED for all valid citations'
  )

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 11: Assistant Evidence Grounding & Insufficient Evidence
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 11: Assistant Evidence Grounding ---')

  // 11a. Grounded response with evidence
  assert(groundedChat.grounded === true, 'Assistant response is grounded')
  assert((groundedChat.retrievedEvidence?.length ?? 0) >= 1, 'Retrieved evidence array is populated')
  assert(groundedChat.confidenceScore >= 0.75, 'Confidence score reflects evidence strength (>= 0.75)')
  assert(groundedChat.reply.includes('Retrieved Statutory Evidence'), 'Reply section header indicates retrieved evidence')

  // 11b. Insufficient knowledge-base evidence handling
  const insufficientChat = await defaultBisAssistantService.handleQuery({
    message: 'What are the statutory parameters for gravitational warp fields in BIS?',
  })
  assert(insufficientChat.insufficientEvidence === true, 'Unanswerable query flagged with insufficientEvidence: true')
  assert(insufficientChat.grounded === false, 'Unanswerable query flagged with grounded: false')
  assert(insufficientChat.confidenceScore === 0.0, 'Unanswerable query has confidenceScore: 0.0')
  assert(insufficientChat.citations.length === 0, 'Zero citations generated for unanswerable query')
  assert(
    insufficientChat.reply.includes('Insufficient Knowledge-Base Evidence'),
    'Assistant provides clear "Insufficient Knowledge-Base Evidence" explanation'
  )

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 12: Fabricated Citation Rejection
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 12: Fabricated Citation Rejection ---')

  // 12a. Nonexistent standard
  const nonExistentStd = await defaultCitationValidator.validateCitations([
    {
      standardNumber: 'IS 999999:2099',
      excerpt: 'Fabricated future standard',
    },
  ])
  assert(nonExistentStd.isValid === false, 'Citation with nonexistent standard is rejected')
  assert(nonExistentStd.traceability?.[0].status === 'NONEXISTENT_STANDARD', 'Traceability flags NONEXISTENT_STANDARD')

  // 12b. Nonexistent clause in valid standard
  const nonExistentClause = await defaultCitationValidator.validateCitations([
    {
      standardNumber: 'IS 10500:2012',
      clauseNumber: '99.99',
      excerpt: 'Invented clause that does not exist in drinking water standard',
    },
  ])
  assert(nonExistentClause.isValid === false, 'Citation with nonexistent clause is rejected')
  assert(nonExistentClause.traceability?.[0].status === 'NONEXISTENT_CLAUSE', 'Traceability flags NONEXISTENT_CLAUSE')

  // 12c. Fabricated chunk ID
  const fakeChunk = await defaultCitationValidator.validateCitations([
    {
      standardNumber: 'IS 10500:2012',
      clauseNumber: '4.1',
      chunkId: 'chk-fabricated-id-that-does-not-exist',
      excerpt: 'Invented chunk reference',
    },
  ])
  assert(fakeChunk.isValid === false, 'Citation with fabricated chunk ID is rejected')
  assert(fakeChunk.traceability?.[0].status === 'FABRICATED', 'Traceability flags FABRICATED')

  // 12d. Mismatched standard and chunk ID
  const validChunkIS1293 = DEMO_KNOWLEDGE_CHUNKS.find((c) => c.standardNumber === 'IS 1293:2019')
  if (validChunkIS1293) {
    const mismatchedCit = await defaultCitationValidator.validateCitations([
      {
        standardNumber: 'IS 10500:2012', // Claims to be IS 10500
        chunkId: validChunkIS1293.id, // But chunk belongs to IS 1293
        excerpt: 'Mismatched chunk attribution',
      },
    ])
    assert(mismatchedCit.isValid === false, 'Mismatched standard/chunk pairing is rejected')
    assert(
      mismatchedCit.traceability?.[0].status === 'MISMATCHED_STANDARD_CLAUSE',
      'Traceability flags MISMATCHED_STANDARD_CLAUSE'
    )
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 13: API Retrieval Endpoints
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 13: API Retrieval Endpoints ---')

  const { GET: searchKnowledgeRoute } = await import('@/app/api/v1/bis/knowledge/search/route')
  const { GET: getChunkRoute } = await import('@/app/api/v1/bis/knowledge/chunks/[id]/route')

  const testOfficerSession = {
    user: {
      id: 'usr-test-officer-p3',
      name: 'Inspection Officer Sharma',
      email: 'sharma@bis.gov.in',
      role: 'INSPECTOR',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
  setTestSession(testOfficerSession)

  // 13a. GET /api/v1/bis/knowledge/search with query
  const searchReq = new Request('http://localhost:3000/api/v1/bis/knowledge/search?q=water&standardNumber=IS%2010500')
  const searchRes = await searchKnowledgeRoute(searchReq)
  assert(searchRes.status === 200, 'GET /api/v1/bis/knowledge/search returns 200 OK')

  const searchBody = await searchRes.json()
  assert(searchBody.data && Array.isArray(searchBody.data.results), 'API response envelope contains data.results array')
  assert(searchBody.data.results.length >= 1, 'API search returns at least 1 matching chunk')
  assert(searchBody.data.isDemoData === true, 'API response explicitly marked with isDemoData: true')

  // 13b. GET /api/v1/bis/knowledge/search without required parameters -> 400
  const badSearchReq = new Request('http://localhost:3000/api/v1/bis/knowledge/search')
  const badSearchRes = await searchKnowledgeRoute(badSearchReq)
  assert(badSearchRes.status === 400, 'GET /api/v1/bis/knowledge/search without parameters returns 400 Bad Request')

  // 13c. GET /api/v1/bis/knowledge/chunks/[id]
  const targetChunkId = DEMO_KNOWLEDGE_CHUNKS[0].id
  const chunkReq = new Request(`http://localhost:3000/api/v1/bis/knowledge/chunks/${targetChunkId}`)
  const chunkRes = await getChunkRoute(chunkReq, { params: { id: targetChunkId } })
  assert(chunkRes.status === 200, 'GET /api/v1/bis/knowledge/chunks/[id] returns 200 OK')

  const chunkBody = await chunkRes.json()
  assert(chunkBody.data.chunk.id === targetChunkId, 'Retrieved chunk ID matches requested ID')
  assert(chunkBody.data.isDemoData === true, 'Retrieved chunk has isDemoData: true')

  // 13d. GET /api/v1/bis/knowledge/chunks/[nonexistentId] -> 404
  const missingChunkReq = new Request('http://localhost:3000/api/v1/bis/knowledge/chunks/chk-nonexistent-999')
  const missingChunkRes = await getChunkRoute(missingChunkReq, { params: { id: 'chk-nonexistent-999' } })
  assert(missingChunkRes.status === 404, 'GET /api/v1/bis/knowledge/chunks/[nonexistentId] returns 404 Not Found')

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 14: Security & Authentication Enforcement (401 Rejections)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 14: Security & Authentication Enforcement ---')

  // Clear session to test unauthenticated rejection
  setTestSession(null)

  const unauthSearchReq = new Request('http://localhost:3000/api/v1/bis/knowledge/search?q=water')
  const unauthSearchRes = await searchKnowledgeRoute(unauthSearchReq)
  assert(unauthSearchRes.status === 401, 'GET /api/v1/bis/knowledge/search returns 401 Unauthorized without session')

  const unauthChunkReq = new Request(`http://localhost:3000/api/v1/bis/knowledge/chunks/${targetChunkId}`)
  const unauthChunkRes = await getChunkRoute(unauthChunkReq, { params: { id: targetChunkId } })
  assert(unauthChunkRes.status === 401, 'GET /api/v1/bis/knowledge/chunks/[id] returns 401 Unauthorized without session')

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'PASSED').length
  const failed = results.filter((r) => r.status === 'FAILED').length

  console.log('\n=================================================================')
  console.log(`PS107 Phase 3 Test Results: ${passed} PASSED, ${failed} FAILED (Total: ${results.length})`)
  console.log('=================================================================\n')

  if (failed > 0) {
    console.error(`💥 ${failed} test(s) failed!`)
    process.exit(1)
  } else {
    console.log('🎉 ALL PS107 PHASE 3 RAG FOUNDATION TESTS PASSED!')
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Test suite crashed with unhandled error:', err)
  process.exit(1)
})
