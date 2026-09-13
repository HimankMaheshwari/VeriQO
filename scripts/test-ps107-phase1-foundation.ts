/**
 * Unit & Integration Test Suite: SIH 2026 PS107 Phase 1 Foundation
 *
 * Verifies:
 * 1. BisStandardsService search, retrieval, and clause mapping
 * 2. BisLicenseService format validation and status checks (CML, CRS, HUID)
 * 3. QualityControlOrderService catalog listing and category applicability matching
 * 4. CitationValidator grounding and citation authentication
 * 5. BisAssistantService query handling, citation grounding, and audit logging
 *
 * Run: npx tsx scripts/test-ps107-phase1-foundation.ts
 */

import { defaultBisStandardsService } from '../src/lib/bis/standards-service'
import { defaultBisLicenseService } from '../src/lib/bis/license-service'
import { defaultQualityControlOrderService } from '../src/lib/bis/qco-service'
import { defaultCitationValidator } from '../src/lib/assistant/citation-validator'
import { defaultBisAssistantService } from '../src/lib/assistant/assistant-service'

let totalTests = 0
let passedTests = 0

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✅ PASS: ${testName}`)
  } else {
    console.error(`  ❌ FAIL: ${testName}`)
    if (detail) console.error(`     Detail: ${detail}`)
  }
}

async function runTests() {
  console.log('─────────────────────────────────────────────────────────────')
  console.log('VeriQO PS107: Phase 1 Foundation Verification Suite')
  console.log('─────────────────────────────────────────────────────────────\n')

  // ─── SUITE 1: Standards Service ──────────────────────────────────────────
  console.log('📌 Suite 1: BisStandardsService')

  const searchRes = await defaultBisStandardsService.searchStandards({ q: 'water' })
  assert(searchRes.total >= 1, 'Search standards by keyword "water" returns matches')
  assert(
    searchRes.standards.some((s) => s.standardNumber === 'IS 10500:2012'),
    'Search results contain IS 10500:2012'
  )

  const stdDetail = await defaultBisStandardsService.getStandardByNumber('IS 10500:2012')
  assert(!!stdDetail, 'Get standard by exact number IS 10500:2012 succeeds')
  assert(stdDetail?.clauses && stdDetail.clauses.length >= 4, 'Standard contains expected clauses')
  assert(stdDetail?.division === 'FAD', 'Standard division correctly identified as FAD')

  const plugsStd = await defaultBisStandardsService.getStandardByNumber('IS 1293')
  assert(!!plugsStd, 'Get standard by prefix "IS 1293" succeeds')

  // ─── SUITE 2: License Service ───────────────────────────────────────────
  console.log('\n📌 Suite 2: BisLicenseService')

  // CML tests
  const cmlValid = await defaultBisLicenseService.verifyCml({ cmlNumber: 'CM/L-8400123' })
  assert(cmlValid.isValid === true, 'Operative CML license (CM/L-8400123) is verified as valid')
  assert(cmlValid.status === 'OPERATIVE', 'CML status is OPERATIVE')
  assert(cmlValid.isDemoRecord === true, 'CML record flagged as demo record')

  const cmlExpired = await defaultBisLicenseService.verifyCml({ cmlNumber: '7123456' })
  assert(cmlExpired.isValid === false, 'Expired CML license (7123456) is flagged not valid')
  assert(cmlExpired.status === 'EXPIRED', 'CML status is EXPIRED')

  const cmlInvalidFormat = await defaultBisLicenseService.verifyCml({ cmlNumber: 'INVALID-123' })
  assert(cmlInvalidFormat.status === 'INVALID_FORMAT', 'Invalid CML format correctly rejected')

  const cmlNotFound = await defaultBisLicenseService.verifyCml({ cmlNumber: '9999999' })
  assert(cmlNotFound.status === 'NOT_FOUND', 'Unregistered valid-format CML returns NOT_FOUND')

  // CRS tests
  const crsValid = await defaultBisLicenseService.verifyCrs({ registrationNumber: 'R-41009876' })
  assert(crsValid.isValid === true, 'Operative CRS registration (R-41009876) is verified')
  assert(crsValid.licenseType === 'CRS_REGISTRATION', 'License type is CRS_REGISTRATION')

  const crsInvalid = await defaultBisLicenseService.verifyCrs({ registrationNumber: '123' })
  assert(crsInvalid.status === 'INVALID_FORMAT', 'Short CRS registration number rejected')

  // HUID tests
  const huidValid = await defaultBisLicenseService.verifyHuid({ huid: 'AB12CD' })
  assert(huidValid.isValid === true, 'Operative 6-char HUID (AB12CD) is verified')
  assert(huidValid.licenseType === 'HALLMARK_HUID', 'License type is HALLMARK_HUID')

  const huidInvalid = await defaultBisLicenseService.verifyHuid({ huid: 'AB12' })
  assert(huidInvalid.status === 'INVALID_FORMAT', 'Short 4-char HUID rejected')

  // ─── SUITE 3: Quality Control Orders Service ────────────────────────────
  console.log('\n📌 Suite 3: QualityControlOrderService')

  const qcos = await defaultQualityControlOrderService.listQcos()
  assert(qcos.length >= 2, 'List QCOs returns active orders')

  const toysCheck = await defaultQualityControlOrderService.checkQcoApplicability({ category: 'Plastic Toys for Kids' })
  assert(toysCheck.isMandatoryCertification === true, 'Category "Plastic Toys" triggers mandatory QCO')
  assert(toysCheck.applicableStandards.includes('IS 9873 (Part 1):2019'), 'Applicable standard IS 9873 correctly identified')

  const plugsCheck = await defaultQualityControlOrderService.checkQcoApplicability({ category: 'Electrical Plugs & Sockets' })
  assert(plugsCheck.isMandatoryCertification === true, 'Category "Electrical Plugs" triggers mandatory QCO')

  const shirtCheck = await defaultQualityControlOrderService.checkQcoApplicability({ category: 'Handmade Wooden Furniture' })
  assert(shirtCheck.isMandatoryCertification === false, 'Non-QCO category returns isMandatoryCertification: false')

  // ─── SUITE 4: Citation Validator ─────────────────────────────────────────
  console.log('\n📌 Suite 4: CitationValidator')

  const citationCheck = await defaultCitationValidator.validateCitations([
    {
      standardNumber: 'IS 10500:2012',
      clauseNumber: '4.1',
      excerpt: 'Organoleptic parameters',
    },
    {
      standardNumber: 'IS 999999', // Unknown
      excerpt: 'Non-existent standard test',
    },
  ])

  assert(citationCheck.validCitations.length === 1, 'Valid citation correctly accepted')
  assert(citationCheck.unverifiedReferences.includes('IS 999999'), 'Unknown citation flagged in unverifiedReferences')
  assert(citationCheck.isValid === false, 'Overall validation reflects unverified references')

  // ─── SUITE 5: BisAssistantService ───────────────────────────────────────
  console.log('\n📌 Suite 5: BisAssistantService')

  const assistantQuery1 = await defaultBisAssistantService.handleQuery({
    message: 'What are the permissible lead limits in drinking water under IS 10500?',
  })

  assert(assistantQuery1.grounded === true, 'Assistant query on drinking water marked as grounded')
  assert(assistantQuery1.citations.length >= 1, 'Assistant returns verified citations')
  assert(assistantQuery1.reply.includes('IS 10500'), 'Assistant reply references IS 10500')
  assert(!!assistantQuery1.disclaimer, 'Assistant reply includes mandatory statutory disclaimer')

  const assistantQuery2 = await defaultBisAssistantService.handleQuery({
    message: 'How do I verify an ISI mark CML license number?',
  })
  assert(assistantQuery2.reply.includes('CML'), 'Assistant provides CML format and verification advice')

  // ─── SUMMARY ────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────')
  console.log(`Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`)
  console.log('─────────────────────────────────────────────────────────────')

  if (passedTests !== totalTests) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error running PS107 test suite:', err)
  process.exit(1)
})
