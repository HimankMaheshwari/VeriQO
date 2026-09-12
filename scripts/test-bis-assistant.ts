import { BisKnowledgeService } from '../src/lib/bis/bis-knowledge-service'
import { answerBisQuery, BisAssistantService } from '../src/lib/bis/bis-assistant-service'
import { classifyBisIntent } from '../src/lib/bis/intent-classifier'
import { understandBisQuery } from '../src/lib/bis/query-understanding'
import { DEMO_BIS_STANDARDS } from './seed-bis-standards'
import { HeuristicAnalysisProvider } from '../src/lib/ai/heuristic-analyzer'
import { MANDATORY_DECLARATION_FIELDS } from '../src/lib/ai/types'

/**
 * Lightweight in-memory Prisma-like adapter for deterministic, isolated testing
 * of BisAssistantService without live network or database dependencies.
 */
function createTestDb() {
  const store = DEMO_BIS_STANDARDS.map((s, idx) => ({
    id: `bis_demo_${idx + 1}`,
    ...s,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return {
    bisStandard: {
      async count({ where }: { where?: any } = {}) {
        return (await this.findMany({ where })).length
      },

      async findMany({
        where,
        take,
        skip = 0,
      }: {
        where?: any
        take?: number
        skip?: number
      } = {}) {
        let results = store.filter((item) => {
          if (!where) return true

          if (typeof where.isMandatory === 'boolean' && item.isMandatory !== where.isMandatory) {
            return false
          }

          if (where.category?.contains) {
            const pattern = String(where.category.contains).toLowerCase()
            if (!item.category.toLowerCase().includes(pattern)) return false
          }

          if (where.productCategory?.contains) {
            const pattern = String(where.productCategory.contains).toLowerCase()
            if (!item.productCategory?.toLowerCase().includes(pattern)) return false
          }

          if (where.certificationScheme?.contains) {
            const pattern = String(where.certificationScheme.contains).toLowerCase()
            if (!item.certificationScheme?.toLowerCase().includes(pattern)) return false
          }

          if (Array.isArray(where.OR) && where.OR.length > 0) {
            const matchesOr = where.OR.some((clause: any) => {
              for (const [key, filter] of Object.entries<any>(clause)) {
                const itemVal = (item as any)[key]
                if (filter?.contains && typeof itemVal === 'string') {
                  if (itemVal.toLowerCase().includes(String(filter.contains).toLowerCase())) {
                    return true
                  }
                }
                if (filter?.equals && typeof itemVal === 'string') {
                  if (itemVal.toLowerCase() === String(filter.equals).toLowerCase()) {
                    return true
                  }
                }
              }
              return false
            })
            if (!matchesOr) return false
          }

          return true
        })

        if (skip > 0) results = results.slice(skip)
        if (typeof take === 'number') results = results.slice(0, take)

        return results
      },

      async findFirst({ where }: { where?: any } = {}) {
        const results = await this.findMany({ where, take: 1 })
        return results[0] ?? null
      },
    },
  }
}

async function runAssistantTests() {
  console.log('=================================================================')
  console.log('  VeriQO PS107 — Conversational BIS Assistant Foundation Tests')
  console.log('=================================================================\n')

  const testDb = createTestDb()
  const knowledgeService = new BisKnowledgeService(testDb)
  const assistant = new BisAssistantService(knowledgeService)

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${testName}`)
      passed++
    } else {
      console.error(`  FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Standard discovery query
  // "What BIS standard applies to packaged drinking water?"
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Standard discovery query: "What BIS standard applies to packaged drinking water?"')
  const r1 = await assistant.answerQuery('What BIS standard applies to packaged drinking water?')
  assert(r1.intent === 'STANDARD_DISCOVERY', 'Intent classified as STANDARD_DISCOVERY', `Got: ${r1.intent}`)
  assert(r1.confidence === 'HIGH', 'Confidence is HIGH for known product query', `Got: ${r1.confidence}`)
  assert(
    r1.product?.productName === 'packaged drinking water',
    'Product name recognized as "packaged drinking water"',
    `Got: ${r1.product?.productName}`
  )
  assert(
    r1.standards.some((s) => s.standardNumber === 'IS 14543'),
    'Retrieved standards contain "IS 14543"'
  )
  assert(
    r1.answer.includes('IS 14543'),
    'Synthesized answer references "IS 14543"'
  )
  assert(
    r1.isDemoData === true,
    'Result marked with isDemoData: true'
  )

  // ---------------------------------------------------------------------------
  // Test 2: Standard detail query
  // "Tell me about IS 14543."
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2] Standard detail query: "Tell me about IS 14543."')
  const r2 = await assistant.answerQuery('Tell me about IS 14543.')
  assert(r2.intent === 'STANDARD_DETAILS', 'Intent classified as STANDARD_DETAILS', `Got: ${r2.intent}`)
  assert(r2.confidence === 'HIGH', 'Confidence is HIGH for exact standard match')
  assert(r2.standards.length === 1, 'Exactly 1 standard returned for exact lookup')
  assert(r2.standards[0]?.standardNumber === 'IS 14543', 'Returned standard number is "IS 14543"')
  assert(r2.answer.includes('IS 14543'), 'Answer references IS 14543')

  // ---------------------------------------------------------------------------
  // Test 3: Category query
  // "What standards exist for Toys?"
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3] Category query: "What standards exist for Toys?"')
  const r3 = await assistant.answerQuery('What standards exist for Toys?')
  assert(
    r3.intent === 'STANDARD_DISCOVERY',
    'Category discovery intent is STANDARD_DISCOVERY',
    `Got: ${r3.intent}`
  )
  assert(
    r3.standards.some((s) => s.standardNumber === 'IS 9873 (Part 1)'),
    'Retrieved toy standard IS 9873 (Part 1)'
  )
  assert(
    r3.standards[0]?.whyApplicable.includes('Toys & Children Products') ||
      r3.standards[0]?.whyApplicable.includes('Children Toys'),
    'Applicability explains relevance to Toys category'
  )

  // ---------------------------------------------------------------------------
  // Test 4: Unknown query
  // "What is the capital of France?"
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] Unknown query: "What is the capital of France?"')
  const r4 = await assistant.answerQuery('What is the capital of France?')
  assert(r4.intent === 'UNKNOWN', 'Intent is UNKNOWN for out-of-domain query', `Got: ${r4.intent}`)
  assert(r4.confidence === 'UNKNOWN', 'Confidence is UNKNOWN', `Got: ${r4.confidence}`)
  assert(r4.standards.length === 0, 'No standards returned for unknown query')
  assert(r4.sources.length === 0, 'No sources returned for unknown query')
  assert(
    !r4.answer.includes('IS 14543') && !r4.answer.includes('IS 15820'),
    'Answer does NOT hallucinate any BIS standard'
  )

  // ---------------------------------------------------------------------------
  // Test 5: No retrieval result query
  // "Tell me about IS 999999"
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5] No retrieval result query: "Tell me about IS 999999"')
  const r5 = await assistant.answerQuery('Tell me about IS 999999')
  assert(r5.intent === 'STANDARD_DETAILS', 'Intent recognized as STANDARD_DETAILS', `Got: ${r5.intent}`)
  assert(r5.confidence === 'LOW', 'Confidence is LOW when standard is not found in knowledge base')
  assert(r5.standards.length === 0, 'No standards returned for non-existent standard')
  assert(
    r5.answer.includes('No matching standard was found') || r5.answer.includes('could not find'),
    'Answer clearly states standard was not found without hallucinating'
  )

  // ---------------------------------------------------------------------------
  // Test 6: Case-insensitive standard lookup
  // "is 14543"
  // ---------------------------------------------------------------------------
  console.log('\n[Test 6] Case-insensitive standard lookup: "is 14543"')
  const r6 = await assistant.answerQuery('is 14543')
  assert(r6.intent === 'STANDARD_DETAILS', 'Lowercase "is 14543" maps to STANDARD_DETAILS')
  assert(r6.standards.length === 1, 'Found standard for lowercase query')
  assert(r6.standards[0]?.standardNumber === 'IS 14543', 'Canonical standardNumber normalized to "IS 14543"')
  assert(r6.confidence === 'HIGH', 'Confidence is HIGH')

  // ---------------------------------------------------------------------------
  // Test 7: Confidence output validation
  // Test all confidence branches: HIGH, MEDIUM, LOW, UNKNOWN
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7] Confidence output validation (HIGH, MEDIUM, LOW, UNKNOWN)')
  assert(r1.confidence === 'HIGH', 'HIGH confidence for recognized product with retrieved standard')
  assert(r2.confidence === 'HIGH', 'HIGH confidence for exact standard number match')
  assert(r5.confidence === 'LOW', 'LOW confidence for recognized intent but zero knowledge matches')
  assert(r4.confidence === 'UNKNOWN', 'UNKNOWN confidence for unknown intent and zero knowledge matches')

  // Medium confidence: broad search query with results but without a mapped product
  const r7Med = await assistant.answerQuery('Which standard applies to safety testing requirements?')
  assert(
    r7Med.confidence === 'MEDIUM',
    `Confidence is MEDIUM for broad keyword query without mapped product (Got: ${r7Med.confidence})`
  )

  // ---------------------------------------------------------------------------
  // Test 8: Citation structure does NOT fabricate clause/page information
  // ---------------------------------------------------------------------------
  console.log('\n[Test 8] Citation structure anti-hallucination validation')
  const r8 = await assistant.answerQuery('What BIS standard applies to gold jewellery?')
  assert(r8.sources.length > 0, 'Sources array populated for matching standard')

  for (const src of r8.sources) {
    assert(src.clause === null, `Citation clause is strictly null (Got: ${src.clause})`)
    assert(src.page === null, `Citation page is strictly null (Got: ${src.page})`)
    assert(src.section === null, `Citation section is strictly null (Got: ${src.section})`)
    assert(src.url === null, `Citation url is strictly null (Got: ${src.url})`)
    assert(typeof src.documentId === 'string' && src.documentId.length > 0, 'Citation has valid documentId')
    assert(typeof src.standardNumber === 'string' && src.standardNumber.startsWith('IS '), 'Citation has standardNumber')
    assert(src.sourceTitle.includes('[Prototype Knowledge Record]'), 'Source title explicitly flags prototype record')
  }

  // ---------------------------------------------------------------------------
  // Test 9: Existing Legal Metrology behavior is NOT modified
  // ---------------------------------------------------------------------------
  console.log('\n[Test 9] Legal Metrology regression check')
  const lmAnalyzer = new HeuristicAnalysisProvider()
  const sampleLabel = `Amul Butter 500g
Net Qty: 500 g
MRP: Rs. 275.00 (incl. of all taxes)
Mfg Date: 10/02/2024
Mfd by: Gujarat Co-operative Milk Marketing Federation Ltd, Anand - 388001
Consumer Care: 1800-258-3333
Country of Origin: India`

  const lmResult = await lmAnalyzer.analyzePackage(sampleLabel)
  assert(lmResult.product.brand === 'Amul', 'Brand identified as Amul')
  assert(
    Boolean(lmResult.declarations.find((d) => d.fieldName === 'mrp')?.detectionStatus === 'DETECTED'),
    'LMPC MRP declaration detected'
  )
  assert(
    Boolean(lmResult.declarations.find((d) => d.fieldName === 'net_quantity')?.detectionStatus === 'DETECTED'),
    'LMPC Net Quantity detected'
  )
  assert(
    Boolean(lmResult.declarations.find((d) => d.fieldName === 'manufacturer')?.detectionStatus === 'DETECTED'),
    'LMPC Manufacturer detected'
  )
  assert(
    lmResult.isi_mark === null,
    'BIS isi_mark remains null when absent on LMPC label'
  )

  // Verify all 15 mandatory declaration fields exist
  const fieldNames = new Set(lmResult.declarations.map((d) => d.fieldName))
  for (const reqField of MANDATORY_DECLARATION_FIELDS) {
    assert(
      fieldNames.has(reqField.fieldName),
      `Mandatory LMPC field "${reqField.fieldName}" remains in declarations`
    )
  }

  // ---------------------------------------------------------------------------
  // Test 10: Top-level convenience export test
  // ---------------------------------------------------------------------------
  console.log('\n[Test 10] Top-level export function answerBisQuery()')
  const r10 = await answerBisQuery('Tell me about IS 15820', { knowledgeService })
  assert(r10.intent === 'STANDARD_DETAILS', 'answerBisQuery() returned STANDARD_DETAILS')
  assert(r10.standards.some((s) => s.standardNumber === 'IS 15820'), 'answerBisQuery() returned IS 15820')
  assert(r10.sources.length > 0, 'answerBisQuery() returned citation-ready sources')

  // ---------------------------------------------------------------------------
  // Test 11: UNKNOWN query does not invoke Gemini (Early return)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 11] UNKNOWN query does not invoke Gemini (Early return)')
  let geminiCalls = 0
  const spyAssistant = new BisAssistantService(knowledgeService)
  ;(spyAssistant as any).callGeminiAssistant = async () => {
    geminiCalls++
    return 'Hallucinated Gemini answer'
  }
  const r11 = await spyAssistant.answerQuery('What is the capital of France?')
  assert(geminiCalls === 0, 'Gemini was NOT invoked for UNKNOWN query (callCount = 0)')
  assert(r11.intent === 'UNKNOWN', 'Intent is UNKNOWN')
  assert(r11.confidence === 'UNKNOWN', 'Confidence is UNKNOWN')

  // ---------------------------------------------------------------------------
  // Test 12: Empty retrieval query does not invoke Gemini (Early return)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 12] Empty retrieval query does not invoke Gemini (Early return)')
  geminiCalls = 0
  const r12 = await spyAssistant.answerQuery('Tell me about IS 999999')
  assert(geminiCalls === 0, 'Gemini was NOT invoked for empty retrieval (callCount = 0)')
  assert(r12.standards.length === 0, 'Standards is empty')
  assert(r12.confidence === 'LOW', 'Confidence is LOW')

  // ---------------------------------------------------------------------------
  // Test 13: Gemini failure uses deterministic fallback gracefully
  // ---------------------------------------------------------------------------
  console.log('\n[Test 13] Gemini failure uses deterministic fallback')
  const failAssistant = new BisAssistantService(knowledgeService, { apiKey: 'dummy-test-key' })
  ;(failAssistant as any).callGeminiAssistant = async () => {
    throw new Error('Simulated Gemini API rate limit or network error')
  }
  const r13 = await failAssistant.answerQuery('Tell me about IS 14543.')
  assert(r13.standards.length === 1, 'Standard IS 14543 retrieved')
  assert(
    r13.answer.includes('IS 14543'),
    'Deterministic fallback successfully produced answer referencing IS 14543'
  )
  assert(r13.confidence === 'HIGH', 'Confidence is HIGH')

  console.log('\n-----------------------------------------------------------------')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('-----------------------------------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAssistantTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
