/**
 * Test Suite: SIH 2026 PS107 — Phase 2 REST API & Security Verification
 *
 * Verifies all App Router endpoints for:
 *  1. Standards search & filtering (query, division, status, mandatory, pagination)
 *  2. Standard details with clauses and linked QCOs
 *  3. Standard clauses retrieval & filtering
 *  4. CML license verification (Scheme-I ISI mark)
 *  5. CRS registration verification (Scheme-II electronics)
 *  6. HUID verification (6-char alphanumeric gold hallmark)
 *  7. Generic BIS mark verification (auto-detection & explicit dispatch)
 *  8. QCO listing & filtering (status, product/category)
 *  9. QCO applicability check (mandatory determination & standards mapping)
 * 10. Assistant chat (deterministic grounded query, citations, confidence, demo data flag)
 * 11. Assistant conversation retrieval (user-scoped list & detail)
 * 12. Ownership protection (IDOR enforcement across GET, DELETE, and chat thread access)
 * 13. Conversation deletion (cascade cleanup & verification)
 * 14. Invalid input handling (malformed JSON, invalid IDs, blank fields)
 * 15. Authentication/authorization enforcement (401 on unauthenticated calls)
 *
 * NOTE: Uses test-level require.cache hook for auth during test execution.
 * ZERO production files (api-helpers.ts, auth.ts) are modified.
 *
 * Run: npx tsx scripts/test-ps107-phase2-api.ts
 */

// ── 0. Module-Level Test Auth Harness ───────────────────────────────────────
// Injects test session directly at the module boundary in require.cache without
// modifying ANY production code in src/lib/auth.ts or src/lib/api-helpers.ts.
let activeSession: any = null

const authPath = require.resolve('../src/lib/auth')
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    auth: async () => activeSession,
    handlers: {},
    signIn: async () => {},
    signOut: async () => {},
  },
} as any

function setTestSession(session: any) {
  activeSession = session
}

// ── Imports (evaluated after auth mock in require.cache) ─────────────────────
import { prisma } from '@/lib/prisma'

interface TestResult {
  name: string
  status: 'PASSED' | 'FAILED'
  details?: string
}

const results: TestResult[] = []

function assert(condition: boolean, name: string, failureDetails?: string) {
  if (condition) {
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

async function runPhase2ApiTests() {
  console.log('=================================================================')
  console.log('       VeriQO PS107 Phase 2: REST API & Security Test Suite      ')
  console.log('=================================================================\n')

  // Dynamic import ensures route handlers and api-helpers resolve after require.cache hook
  const { GET: getStandards } = await import('@/app/api/v1/bis/standards/route')
  const { GET: getStandardDetail } = await import('@/app/api/v1/bis/standards/[id]/route')
  const { GET: getStandardClauses } = await import('@/app/api/v1/bis/standards/[id]/clauses/route')
  const { POST: verifyCml } = await import('@/app/api/v1/bis/verify/cml/route')
  const { POST: verifyCrs } = await import('@/app/api/v1/bis/verify/crs/route')
  const { POST: verifyHuid } = await import('@/app/api/v1/bis/verify/huid/route')
  const { POST: verifyMark } = await import('@/app/api/v1/bis/verify/mark/route')
  const { GET: getQcos } = await import('@/app/api/v1/bis/qco/route')
  const { POST: checkQco } = await import('@/app/api/v1/bis/qco/check/route')
  const { POST: chatAssistant } = await import('@/app/api/v1/assistant/chat/route')
  const { GET: getConversations } = await import('@/app/api/v1/assistant/conversations/route')
  const {
    GET: getConversationDetail,
    DELETE: deleteConversation,
  } = await import('@/app/api/v1/assistant/conversations/[id]/route')

  // Setup: Find or create two test users to verify ownership and IDOR isolation
  let users = await prisma.user.findMany({
    where: { isActive: true },
    take: 2,
    select: { id: true, email: true, role: true },
  })

  if (users.length < 2) {
    const user1 = await prisma.user.upsert({
      where: { email: 'test-user-a-ps107@veriQO.gov.in' },
      update: {},
      create: {
        email: 'test-user-a-ps107@veriQO.gov.in',
        name: 'PS107 Test User A',
        role: 'CONSUMER',
        hashedPassword: 'hashed_password_placeholder',
      },
      select: { id: true, email: true, role: true },
    })

    const user2 = await prisma.user.upsert({
      where: { email: 'test-user-b-ps107@veriQO.gov.in' },
      update: {},
      create: {
        email: 'test-user-b-ps107@veriQO.gov.in',
        name: 'PS107 Test User B',
        role: 'CONSUMER',
        hashedPassword: 'hashed_password_placeholder',
      },
      select: { id: true, email: true, role: true },
    })

    users = [user1, user2]
  }

  const userA = users[0]
  const userB = users[1]

  console.log(`Test User A: ${userA.email} (${userA.id})`)
  console.log(`Test User B: ${userB.email} (${userB.id})\n`)

  // Default to User A session for testing authenticated endpoints
  setTestSession({ user: userA })

  // ─────────────────────────────────────────────────────────────
  // 1. STANDARDS SEARCH API
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Section 1: Standards Search (/api/v1/bis/standards) ---')
  {
    const req = new Request('http://localhost:3000/api/v1/bis/standards?q=IS%2010500')
    const res = await getStandards(req)
    const json = await res.json()

    assert(res.status === 200, 'GET /standards status is 200 OK')
    assert(json.data && Array.isArray(json.data.standards), 'Standards search returns array of standards')
    assert(json.data.total >= 1, 'Search for IS 10500 returns at least 1 record')
    assert(
      json.data.standards.some((s: any) => s.standardNumber.includes('10500')),
      'Search results include standard IS 10500:2012'
    )
    assert(
      typeof json.data.page === 'number' && typeof json.data.pageSize === 'number',
      'Pagination metadata present in search response'
    )

    // Division filter
    const reqDiv = new Request('http://localhost:3000/api/v1/bis/standards?division=FAD')
    const resDiv = await getStandards(reqDiv)
    const jsonDiv = await resDiv.json()
    assert(
      jsonDiv.data.standards.every((s: any) => s.division === 'FAD'),
      'Filter by division=FAD only returns Food & Agriculture standards'
    )

    // Mandatory filter
    const reqMandatory = new Request('http://localhost:3000/api/v1/bis/standards?isMandatory=true')
    const resMandatory = await getStandards(reqMandatory)
    const jsonMandatory = await resMandatory.json()
    assert(
      jsonMandatory.data.standards.every((s: any) => s.isMandatory === true),
      'Filter by isMandatory=true only returns mandatory standards'
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 2. STANDARD DETAILS API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 2: Standard Details (/api/v1/bis/standards/[id]) ---')
  {
    const req = new Request('http://localhost:3000/api/v1/bis/standards/IS%2010500:2012')
    const res = await getStandardDetail(req, { params: { id: 'IS 10500:2012' } })
    const json = await res.json()

    assert(res.status === 200, 'GET /standards/[id] status is 200 OK for IS 10500:2012')
    assert(json.data.standardNumber === 'IS 10500:2012', 'Returned standard number matches exactly')
    assert(Boolean(json.data.clauses && json.data.clauses.length >= 4), 'Clauses are included in standard details')
    assert(json.data.division === 'FAD', 'Division correctly identified as FAD')

    // Not found test
    const req404 = new Request('http://localhost:3000/api/v1/bis/standards/NON-EXISTENT-99999')
    const res404 = await getStandardDetail(req404, { params: { id: 'NON-EXISTENT-99999' } })
    assert(res404.status === 404, 'GET /standards/[id] returns 404 for non-existent standard')
  }

  // ─────────────────────────────────────────────────────────────
  // 3. STANDARD CLAUSES API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 3: Standard Clauses (/api/v1/bis/standards/[id]/clauses) ---')
  {
    const req = new Request('http://localhost:3000/api/v1/bis/standards/IS%2010500:2012/clauses')
    const res = await getStandardClauses(req, { params: { id: 'IS 10500:2012' } })
    const json = await res.json()

    assert(res.status === 200, 'GET /standards/[id]/clauses status is 200 OK')
    assert(Boolean(json.data.clauses && json.data.clauses.length >= 4), 'Returns clauses array with at least 4 items')
    assert(typeof json.data.total === 'number', 'Returns total count of clauses')

    // Clause filtering
    const reqFilter = new Request('http://localhost:3000/api/v1/bis/standards/IS%2010500:2012/clauses?clauseNumber=4')
    const resFilter = await getStandardClauses(reqFilter, { params: { id: 'IS 10500:2012' } })
    const jsonFilter = await resFilter.json()
    assert(
      jsonFilter.data.clauses.length > 0 && jsonFilter.data.clauses.every((c: any) => c.clauseNumber.startsWith('4')),
      'Clauses filter by clauseNumber=4 returns only matching clauses'
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CML VERIFICATION API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 4: CML Verification (/api/v1/bis/verify/cml) ---')
  {
    // Valid Operative CML
    const reqValid = new Request('http://localhost:3000/api/v1/bis/verify/cml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseNumber: 'CM/L-8400123' }),
    })
    const resValid = await verifyCml(reqValid)
    const jsonValid = await resValid.json()

    assert(resValid.status === 200, 'POST /verify/cml status is 200 OK for valid license')
    assert(jsonValid.data.isValid === true, 'CML CM/L-8400123 verified as isValid: true')
    assert(jsonValid.data.status === 'OPERATIVE', 'CML status is OPERATIVE')
    assert(jsonValid.data.licenseType === 'ISI_CML', 'License type normalized to ISI_CML')
    assert(jsonValid.data.isDemoRecord === true, 'Demo record transparency flag preserved: true')

    // Expired CML
    const reqExpired = new Request('http://localhost:3000/api/v1/bis/verify/cml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseNumber: 'CM/L-7123456' }),
    })
    const resExpired = await verifyCml(reqExpired)
    const jsonExpired = await resExpired.json()
    assert(jsonExpired.data.isValid === false, 'Expired CML returns isValid: false')
    assert(jsonExpired.data.status === 'EXPIRED', 'Expired CML returns status: EXPIRED')

    // Missing licenseNumber
    const reqMissing = new Request('http://localhost:3000/api/v1/bis/verify/cml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const resMissing = await verifyCml(reqMissing)
    assert(resMissing.status === 400, 'POST /verify/cml returns 400 Bad Request when licenseNumber is missing')
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CRS VERIFICATION API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 5: CRS Verification (/api/v1/bis/verify/crs) ---')
  {
    const reqValid = new Request('http://localhost:3000/api/v1/bis/verify/crs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: 'R-41009876' }),
    })
    const resValid = await verifyCrs(reqValid)
    const jsonValid = await resValid.json()

    assert(resValid.status === 200, 'POST /verify/crs status is 200 OK for valid CRS')
    assert(jsonValid.data.isValid === true, 'CRS R-41009876 verified as isValid: true')
    assert(jsonValid.data.licenseType === 'CRS_REGISTRATION', 'License type is CRS_REGISTRATION')
    assert(jsonValid.data.status === 'OPERATIVE', 'CRS status is OPERATIVE')
    assert(jsonValid.data.isDemoRecord === true, 'Demo record indicator is true')

    // Unknown CRS
    const reqUnknown = new Request('http://localhost:3000/api/v1/bis/verify/crs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: 'R-99999999' }),
    })
    const resUnknown = await verifyCrs(reqUnknown)
    const jsonUnknown = await resUnknown.json()
    assert(jsonUnknown.data.isValid === false, 'Unknown CRS registration returns isValid: false')
    assert(jsonUnknown.data.status === 'NOT_FOUND', 'Unknown CRS registration returns status: NOT_FOUND')
  }

  // ─────────────────────────────────────────────────────────────
  // 6. HUID VERIFICATION API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 6: HUID Verification (/api/v1/bis/verify/huid) ---')
  {
    const reqValid = new Request('http://localhost:3000/api/v1/bis/verify/huid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ huid: 'AB12CD' }),
    })
    const resValid = await verifyHuid(reqValid)
    const jsonValid = await resValid.json()

    assert(resValid.status === 200, 'POST /verify/huid status is 200 OK for valid HUID')
    assert(jsonValid.data.isValid === true, 'HUID AB12CD verified as isValid: true')
    assert(jsonValid.data.licenseType === 'HALLMARK_HUID', 'License type is HALLMARK_HUID')
    assert(jsonValid.data.isDemoRecord === true, 'Demo record indicator is true')

    // Invalid HUID format (not 6 chars)
    const reqInvalid = new Request('http://localhost:3000/api/v1/bis/verify/huid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ huid: 'INVALID123' }),
    })
    const resInvalid = await verifyHuid(reqInvalid)
    const jsonInvalid = await resInvalid.json()
    assert(jsonInvalid.data.isValid === false, 'Invalid format HUID returns isValid: false')
    assert(jsonInvalid.data.status === 'INVALID_FORMAT', 'Invalid format HUID returns status: INVALID_FORMAT')
  }

  // ─────────────────────────────────────────────────────────────
  // 7. GENERIC MARK VERIFICATION API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 7: Generic Mark Verification (/api/v1/bis/verify/mark) ---')
  {
    // Auto-detect CML format
    const reqCml = new Request('http://localhost:3000/api/v1/bis/verify/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'CM/L-8400123' }),
    })
    const resCml = await verifyMark(reqCml)
    const jsonCml = await resCml.json()
    assert(resCml.status === 200, 'Generic mark verification returns 200 OK for CML value')
    assert(jsonCml.data.licenseType === 'ISI_CML', 'Generic mark verifier correctly auto-detects ISI_CML')
    assert(jsonCml.data.isValid === true, 'Auto-detected CML verified as valid')

    // Explicit CRS markType
    const reqCrs = new Request('http://localhost:3000/api/v1/bis/verify/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markType: 'CRS_REGISTRATION', value: 'R-41009876' }),
    })
    const resCrs = await verifyMark(reqCrs)
    const jsonCrs = await resCrs.json()
    assert(jsonCrs.data.licenseType === 'CRS_REGISTRATION', 'Explicit markType CRS_REGISTRATION verified')
    assert(jsonCrs.data.isValid === true, 'Explicit CRS mark verified as valid')

    // Auto-detect HUID
    const reqHuid = new Request('http://localhost:3000/api/v1/bis/verify/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'AB12CD' }),
    })
    const resHuid = await verifyMark(reqHuid)
    const jsonHuid = await resHuid.json()
    assert(jsonHuid.data.licenseType === 'HALLMARK_HUID', 'Generic mark verifier correctly auto-detects HALLMARK_HUID')
    assert(jsonHuid.data.isValid === true, 'Auto-detected HUID verified as valid')

    // Missing value
    const reqEmpty = new Request('http://localhost:3000/api/v1/bis/verify/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const resEmpty = await verifyMark(reqEmpty)
    assert(resEmpty.status === 400, 'Generic mark returns 400 when value is empty')
  }

  // ─────────────────────────────────────────────────────────────
  // 8. QCO LISTING API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 8: QCO Listing (/api/v1/bis/qco) ---')
  {
    const req = new Request('http://localhost:3000/api/v1/bis/qco')
    const res = await getQcos(req)
    const json = await res.json()

    assert(res.status === 200, 'GET /qco status is 200 OK')
    assert(json.data && Array.isArray(json.data.qcos), 'Returns array of QCOs')
    assert(json.data.total >= 2, 'Returns at least 2 QCO records')
    assert(
      json.data.qcos.some((q: any) => q.orderNumber === 'S.O. 853(E)'),
      'List includes Toys Quality Control Order S.O. 853(E)'
    )

    // Filter by product
    const reqFilter = new Request('http://localhost:3000/api/v1/bis/qco?product=plugs')
    const resFilter = await getQcos(reqFilter)
    const jsonFilter = await resFilter.json()
    assert(
      jsonFilter.data.qcos.length > 0 &&
        jsonFilter.data.qcos.every(
          (q: any) =>
            q.orderTitle.toLowerCase().includes('plug') || q.applicableProducts.toLowerCase().includes('plug')
        ),
      'Filter by product=plugs returns matching QCOs'
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 9. QCO APPLICABILITY CHECK API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 9: QCO Applicability Check (/api/v1/bis/qco/check) ---')
  {
    // Mandatory product check (Plugs and Sockets under QCO-PLUGS-2021)
    const reqMandatory = new Request('http://localhost:3000/api/v1/bis/qco/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productCategory: 'plugs and socket-outlets' }),
    })
    const resMandatory = await checkQco(reqMandatory)
    const jsonMandatory = await resMandatory.json()

    assert(resMandatory.status === 200, 'POST /qco/check status is 200 OK')
    assert(
      jsonMandatory.data.isMandatoryCertification === true,
      'Plugs & sockets correctly flagged as isMandatoryCertification: true'
    )
    assert(Boolean(jsonMandatory.data.applicableStandards && jsonMandatory.data.applicableStandards.length > 0), 'Applicable standards list is populated')
    assert(typeof jsonMandatory.data.explanation === 'string', 'Statutory guidance explanation provided')

    // Non-regulated product check
    const reqNonReg = new Request('http://localhost:3000/api/v1/bis/qco/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productCategory: 'handcrafted decorative wall wooden hanging' }),
    })
    const resNonReg = await checkQco(reqNonReg)
    const jsonNonReg = await resNonReg.json()
    assert(
      jsonNonReg.data.isMandatoryCertification === false,
      'Unregulated product correctly flagged as isMandatoryCertification: false'
    )

    // Missing body fields
    const reqEmpty = new Request('http://localhost:3000/api/v1/bis/qco/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const resEmpty = await checkQco(reqEmpty)
    assert(resEmpty.status === 400, 'POST /qco/check returns 400 when all product fields are missing')
  }

  // ─────────────────────────────────────────────────────────────
  // 10. ASSISTANT CHAT API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 10: Assistant Chat (/api/v1/assistant/chat) ---')
  let createdConvId: string = ''
  {
    const req = new Request('http://localhost:3000/api/v1/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What are the permissible limits for drinking water under IS 10500?',
      }),
    })
    const res = await chatAssistant(req)
    const json = await res.json()

    assert(res.status === 200, 'POST /assistant/chat status is 200 OK')
    assert(Boolean(json.data.conversationId), 'Response returns a valid conversationId')
    createdConvId = json.data.conversationId

    assert(typeof json.data.message === 'string' && json.data.message.length > 0, 'Assistant message reply is non-empty')
    assert(Array.isArray(json.data.citations) && json.data.citations.length > 0, 'Assistant returns validated citations')
    assert(
      json.data.citations.some((c: any) => c.standardNumber.includes('10500')),
      'Citations include IS 10500 standard'
    )
    assert(typeof json.data.confidenceScore === 'number' && json.data.confidenceScore >= 0.9, 'Confidence score >= 0.9')
    assert(Boolean(json.data.disclaimer && json.data.disclaimer.includes('Official Disclaimer')), 'Statutory disclaimer included')
    assert(json.data.isDemoData === true, 'Response marked with isDemoData: true')

    // Multi-turn conversation continuation
    const reqTurn2 = new Request('http://localhost:3000/api/v1/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Is ISI certification mandatory for this product?',
        conversationId: createdConvId,
      }),
    })
    const resTurn2 = await chatAssistant(reqTurn2)
    const jsonTurn2 = await resTurn2.json()
    assert(jsonTurn2.data.conversationId === createdConvId, 'Multi-turn chat maintains exact same conversationId')
  }

  // ─────────────────────────────────────────────────────────────
  // 11. ASSISTANT CONVERSATION RETRIEVAL API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 11: Conversation Retrieval (/api/v1/assistant/conversations) ---')
  {
    // List conversations for User A
    const resList = await getConversations()
    const jsonList = await resList.json()

    assert(resList.status === 200, 'GET /assistant/conversations returns 200 OK')
    assert(Array.isArray(jsonList.data), 'Conversations list is an array')
    assert(
      jsonList.data.some((c: any) => c.id === createdConvId),
      'User A conversation list includes the created conversation'
    )

    // Get conversation detail with messages
    const reqDetail = new Request(`http://localhost:3000/api/v1/assistant/conversations/${createdConvId}`)
    const resDetail = await getConversationDetail(reqDetail, { params: { id: createdConvId } })
    const jsonDetail = await resDetail.json()

    assert(resDetail.status === 200, 'GET /assistant/conversations/[id] returns 200 OK')
    assert(jsonDetail.data.id === createdConvId, 'Detail conversation ID matches request')
    assert(
      Array.isArray(jsonDetail.data.messages) && jsonDetail.data.messages.length >= 2,
      'Conversation contains all turns (user and assistant messages)'
    )
  }

  // ─────────────────────────────────────────────────────────────
  // 12. OWNERSHIP PROTECTION & IDOR ISOLATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 12: Ownership Protection (IDOR Security) ---')
  {
    // Switch session to User B
    setTestSession({ user: userB })

    // User B attempts to access User A's conversation list
    const resListB = await getConversations()
    const jsonListB = await resListB.json()
    assert(
      !jsonListB.data.some((c: any) => c.id === createdConvId),
      "User B's conversation list does NOT expose User A's conversation"
    )

    // User B attempts to GET User A's conversation directly -> 403 Forbidden
    const reqIdorGet = new Request(`http://localhost:3000/api/v1/assistant/conversations/${createdConvId}`)
    const resIdorGet = await getConversationDetail(reqIdorGet, { params: { id: createdConvId } })
    assert(resIdorGet.status === 403, "User B accessing User A's conversation returns 403 Forbidden")

    // User B attempts to DELETE User A's conversation -> 403 Forbidden
    const reqIdorDel = new Request(`http://localhost:3000/api/v1/assistant/conversations/${createdConvId}`)
    const resIdorDel = await deleteConversation(reqIdorDel, { params: { id: createdConvId } })
    assert(resIdorDel.status === 403, "User B deleting User A's conversation returns 403 Forbidden")

    // User B attempts to post chat into User A's thread -> 403 Forbidden
    const reqIdorPost = new Request('http://localhost:3000/api/v1/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Malicious hijack attempt into User A thread',
        conversationId: createdConvId,
      }),
    })
    const resIdorPost = await chatAssistant(reqIdorPost)
    assert(resIdorPost.status === 403, "Posting chat into another user's conversationId returns 403 Forbidden")

    // Switch back to User A
    setTestSession({ user: userA })
  }

  // ─────────────────────────────────────────────────────────────
  // 13. CONVERSATION DELETION API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 13: Conversation Deletion (/api/v1/assistant/conversations/[id]) ---')
  {
    const reqDel = new Request(`http://localhost:3000/api/v1/assistant/conversations/${createdConvId}`)
    const resDel = await deleteConversation(reqDel, { params: { id: createdConvId } })
    const jsonDel = await resDel.json()

    assert(resDel.status === 200, 'DELETE /assistant/conversations/[id] returns 200 OK for owner')
    assert(jsonDel.data.deleted === true, 'Response confirms conversation was deleted')

    // Verify subsequent GET returns 404 Not Found
    const reqVerify = new Request(`http://localhost:3000/api/v1/assistant/conversations/${createdConvId}`)
    const resVerify = await getConversationDetail(reqVerify, { params: { id: createdConvId } })
    assert(resVerify.status === 404, 'Subsequent GET after deletion returns 404 Not Found')
  }

  // ─────────────────────────────────────────────────────────────
  // 14. INVALID INPUT HANDLING
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 14: Invalid Input Handling ---')
  {
    // Malformed JSON payload
    const reqBadJson = new Request('http://localhost:3000/api/v1/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed: json',
    })
    const resBadJson = await chatAssistant(reqBadJson)
    assert(resBadJson.status === 400, 'Malformed JSON payload returns 400 Bad Request')

    // Empty message
    const reqEmptyMsg = new Request('http://localhost:3000/api/v1/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '    ' }),
    })
    const resEmptyMsg = await chatAssistant(reqEmptyMsg)
    assert(resEmptyMsg.status === 400, 'Blank message string returns 400 Bad Request')

    // Standard clauses with invalid ID
    const reqClauses404 = new Request('http://localhost:3000/api/v1/bis/standards/INVALID-99999/clauses')
    const resClauses404 = await getStandardClauses(reqClauses404, { params: { id: 'INVALID-99999' } })
    assert(resClauses404.status === 404, 'Clauses retrieval for invalid standard returns 404 Not Found')
  }

  // ─────────────────────────────────────────────────────────────
  // 15. AUTHENTICATION & AUTHORIZATION ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Section 15: Authentication & Authorization (401 Rejection) ---')
  {
    // Unauthenticated state: null session
    setTestSession(null)

    // Unauthenticated standards access
    const resStd = await getStandards(new Request('http://localhost:3000/api/v1/bis/standards'))
    assert(resStd.status === 401, 'GET /api/v1/bis/standards returns 401 Unauthorized without session')

    // Unauthenticated CML verification
    const resCml = await verifyCml(
      new Request('http://localhost:3000/api/v1/bis/verify/cml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber: 'CM/L-8400123' }),
      })
    )
    assert(resCml.status === 401, 'POST /api/v1/bis/verify/cml returns 401 Unauthorized without session')

    // Unauthenticated assistant chat
    const resChat = await chatAssistant(
      new Request('http://localhost:3000/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' }),
      })
    )
    assert(resChat.status === 401, 'POST /api/v1/assistant/chat returns 401 Unauthorized without session')

    // Unauthenticated conversation retrieval
    const resConv = await getConversations()
    assert(resConv.status === 401, 'GET /api/v1/assistant/conversations returns 401 Unauthorized without session')

    // Reset test session
    setTestSession(null)
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n=================================================================')
  const passed = results.filter((r) => r.status === 'PASSED').length
  const failed = results.filter((r) => r.status === 'FAILED').length
  console.log(`PS107 Phase 2 Test Results: ${passed} PASSED, ${failed} FAILED (Total: ${results.length})`)
  console.log('=================================================================\n')

  if (failed > 0) {
    console.error('Failed Tests Summary:')
    for (const r of results.filter((r) => r.status === 'FAILED')) {
      console.error(` - ${r.name}: ${r.details || 'Assertion failed'}`)
    }
    process.exit(1)
  }

  console.log('🎉 ALL PS107 PHASE 2 REST API & SECURITY TESTS PASSED!')
}

runPhase2ApiTests()
  .catch((err) => {
    console.error('Unhandled fatal error in Phase 2 test suite:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
