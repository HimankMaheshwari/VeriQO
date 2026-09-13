/**
 * Test Suite for Phase D: End-to-End BIS Compliance Journey
 *
 * Verifies:
 * 1. Scenario A: Product with confident BIS standard (Stainless Steel Water Bottle / Vacuum Flask)
 *    -> Standard IS 17526 -> Why -> QCO in force -> Scheme-I -> Testing -> Lab -> Next Action
 * 2. Scenario B: Product without applicable BIS/QCO (Vim Dishwash Liquid)
 *    -> NOT_DETERMINED -> No Applicable QCO -> Voluntary/Not Determined -> Needs Review
 * 3. Scenario C: Product requiring CRS (Power Adapter / IT Equipment)
 *    -> IS 13252 -> QCO -> CRS Scheme-II -> Testing -> Lab -> Next Action
 * 4. Scenario D: Product requiring mandatory BIS/ISI (Plastic Toys)
 *    -> IS 9873 -> Toys QCO -> Scheme-I -> Testing -> Lab -> Next Action
 * 5. Scenario E: Insufficient evidence product (Handcrafted Wooden Craft)
 *    -> NOT_DETERMINED -> Needs Review -> No false positive QCO
 * 6. Non-negotiable constraint checks:
 *    - Zero hardcoded product-to-standard maps in journey-service.ts
 *    - Laboratory provenance preservation (isDemoData: true)
 *    - Protected routes (/authority/*, /consumer/verify, /consumer/scan) intact
 */

import { defaultJourneyService } from '../src/services/journey-service'
import { defaultLaboratoriesService } from '../src/services/laboratories-service'
import * as fs from 'fs'
import * as path from 'path'

async function runPhaseDTests() {
  console.log('\n======================================================================')
  console.log('PHASE D: BIS COMPLIANCE JOURNEY — COMPREHENSIVE TEST SUITE')
  console.log('======================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`)
      passed++
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`)
      failed++
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. NON-NEGOTIABLE CHECK: NO HARDCODED PRODUCT -> STANDARD MAPS
  // ─────────────────────────────────────────────────────────────
  console.log('Constraint Group 1: Zero Hardcoded Product Mappings in Production Service')

  const journeyServiceSource = fs.readFileSync(
    path.join(__dirname, '../src/services/journey-service.ts'),
    'utf-8'
  )

  const hasHardcodedBottle = /if\s*\(\s*.*productName.*===.*['"]Stainless Steel Water Bottle['"]/i.test(journeyServiceSource)
  const hasHardcodedToys = /if\s*\(\s*.*productName.*===.*['"]Plastic Toys['"]/i.test(journeyServiceSource)
  const hasHardcodedAdapter = /if\s*\(\s*.*productName.*===.*['"]65W Adapter['"]/i.test(journeyServiceSource)
  const hasHardcodedVim = /if\s*\(\s*.*productName.*===.*['"]Vim['"]/i.test(journeyServiceSource)

  assert(!hasHardcodedBottle, 'No hardcoded "Stainless Steel Water Bottle" shortcut in journey-service.ts')
  assert(!hasHardcodedToys, 'No hardcoded "Plastic Toys" shortcut in journey-service.ts')
  assert(!hasHardcodedAdapter, 'No hardcoded "65W Adapter" shortcut in journey-service.ts')
  assert(!hasHardcodedVim, 'No hardcoded "Vim" shortcut in journey-service.ts')

  // ─────────────────────────────────────────────────────────────
  // 2. SCENARIO A: STAINLESS STEEL WATER BOTTLE / VACUUM FLASK
  // ─────────────────────────────────────────────────────────────
  console.log('\nScenario A: Stainless Steel Water Bottle -> IS 17526 (Scheme-I Mandatory)')

  const resA = await defaultJourneyService.generateJourney({
    productName: 'Stainless Steel Water Bottle',
    category: 'Kitchenware / Insulated Flasks',
    brand: 'Milton',
  })

  assert(resA.product.name === 'Stainless Steel Water Bottle', 'Scenario A: Product name preserved')
  assert(resA.standard.selected.standardNumber.includes('17526'), `Scenario A: Dynamically associated with IS 17526 (Got: ${resA.standard.selected.standardNumber})`)
  assert(resA.standard.state === 'ASSOCIATED', 'Scenario A: Standard state is ASSOCIATED')
  assert(resA.standard.confidenceLevel === 'HIGH' || resA.standard.confidenceLevel === 'MEDIUM', `Scenario A: Confidence level is confident (Got: ${resA.standard.confidenceLevel})`)
  
  // Step 2: Why this standard
  assert(resA.whyThisStandard.isSufficient === true, 'Scenario A: Why This Standard has sufficient evidence')
  assert(resA.whyThisStandard.commodityScopeMatch.length > 0, 'Scenario A: Commodity scope match provided')
  
  // Step 3: QCO
  assert(resA.qco.isMandatory === true, 'Scenario A: Mandatory QCO is applicable')
  assert(resA.qco.status === 'APPLICABLE', `Scenario A: QCO status is APPLICABLE (Got: ${resA.qco.status})`)
  
  // Step 4: Certification
  assert(resA.certification.schemeCode === 'SCHEME_I', `Scenario A: Scheme-I route (Got: ${resA.certification.schemeCode})`)
  assert(resA.certification.requirementType === 'MANDATORY_ISI', `Scenario A: Requirement type is MANDATORY_ISI (Got: ${resA.certification.requirementType})`)

  // Step 5: Required Testing
  assert(resA.testing.status === 'AVAILABLE', 'Scenario A: Testing status is AVAILABLE')
  assert(resA.testing.parameters.length >= 2, `Scenario A: Testing parameters extracted (Count: ${resA.testing.parameters.length})`)

  // Step 6: Laboratory
  assert(resA.laboratory.status === 'AVAILABLE', 'Scenario A: Laboratory status is AVAILABLE')
  assert(resA.laboratory.facilities.length > 0, `Scenario A: Facilities found (Count: ${resA.laboratory.facilities.length})`)
  assert(resA.laboratory.facilities[0].isDemoData === true, 'Scenario A: Laboratory is transparently tagged isDemoData=true')

  // Step 7: Next Action
  assert(resA.nextAction.actionTitle.length > 0, 'Scenario A: Action title provided')
  assert(resA.nextAction.actionDescription.length > 0, 'Scenario A: Action description provided')
  assert(resA.nextAction.contextualPrompts.some((p) => p.prompt.includes('17526')), 'Scenario A: Contextual Assistant prompt includes standard number')

  // ─────────────────────────────────────────────────────────────
  // 3. SCENARIO B: VIM DISHWASH LIQUID (NO STANDARD / NO QCO)
  // ─────────────────────────────────────────────────────────────
  console.log('\nScenario B: Vim Dishwash Liquid -> NOT_DETERMINED (No Applicable QCO)')

  const resB = await defaultJourneyService.generateJourney({
    productName: 'Vim Concentrated Gel Dishwash Liquid',
    category: 'Household / Dishwashing',
    brand: 'Vim',
    rawOcrText: 'Vim Dishwash Gel 500ml Lemon Hindustan Unilever Ltd',
  })

  assert(resB.standard.selected.standardNumber === 'NOT_DETERMINED', `Scenario B: Standard is NOT_DETERMINED (Got: ${resB.standard.selected.standardNumber})`)
  assert(resB.standard.state === 'NOT_DETERMINED', 'Scenario B: Standard state is NOT_DETERMINED')
  assert(resB.standard.confidenceLevel === 'UNDETERMINED', 'Scenario B: Confidence is UNDETERMINED')
  
  // Step 2: Why this standard
  assert(resB.whyThisStandard.isSufficient === false, 'Scenario B: Why This Standard shows insufficient standard scope')
  assert(
    resB.whyThisStandard.summary ===
      'No applicable mandatory BIS standard/QCO was identified from the currently available knowledge base and evidence. Further review may be required.',
    'Scenario B: Uses conservative evidence-based wording for unassociated commodity'
  )
  
  // Step 3: QCO
  assert(resB.qco.isMandatory === false, 'Scenario B: Not mandatory under BIS QCO')
  assert(resB.qco.status === 'NOT_APPLICABLE' || resB.qco.status === 'UNKNOWN', `Scenario B: QCO status is NOT_APPLICABLE or UNKNOWN (Got: ${resB.qco.status})`)

  // Step 4: Certification
  assert(resB.certification.schemeCode === 'VOLUNTARY' || resB.certification.schemeCode === 'NOT_DETERMINED', `Scenario B: Route is Voluntary / Not Determined (Got: ${resB.certification.schemeCode})`)
  assert(resB.certification.requirementType === 'NOT_DETERMINED' || resB.certification.requirementType === 'VOLUNTARY', 'Scenario B: Requirement is not mandatory')

  // Step 5: Testing
  assert(resB.testing.status === 'NOT_DETERMINED', 'Scenario B: Testing status is NOT_DETERMINED')
  assert(resB.testing.parameters.length === 0, 'Scenario B: Zero mandatory testing parameters fabricated')

  // Step 6: Laboratory
  assert(resB.laboratory.status === 'NOT_DETERMINED', 'Scenario B: Laboratory status is NOT_DETERMINED')
  assert(resB.laboratory.facilities.length === 0, 'Scenario B: No laboratory fabricated for unassociated product')

  // Step 7: Next Action
  assert(resB.nextAction.primaryButtonType === 'STANDARDS' || resB.nextAction.primaryButtonType === 'ASSISTANT', `Scenario B: Next action button type is appropriate (Got: ${resB.nextAction.primaryButtonType})`)

  // ─────────────────────────────────────────────────────────────
  // 4. SCENARIO C: PRODUCT REQUIRING CRS (POWER ADAPTER)
  // ─────────────────────────────────────────────────────────────
  console.log('\nScenario C: 65W Laptop Power Adapter -> IS 13252 (CRS Scheme-II)')

  const resC = await defaultJourneyService.generateJourney({
    productName: '65W USB-C Power Adapter for Laptop',
    category: 'Electronics / Power Supplies',
    brand: 'TechCorp',
  })

  assert(resC.standard.selected.standardNumber.includes('13252'), `Scenario C: Dynamically associated with IS 13252 (Got: ${resC.standard.selected.standardNumber})`)
  assert(resC.certification.schemeCode === 'SCHEME_II', `Scenario C: Scheme-II (CRS) route (Got: ${resC.certification.schemeCode})`)
  assert(resC.certification.requirementType === 'MANDATORY_CRS' || resC.certification.requirementType === 'VOLUNTARY', `Scenario C: Requirement type is CRS (Got: ${resC.certification.requirementType})`)
  assert(resC.certification.actionRoute.includes('CRS'), 'Scenario C: Action route points to CRS verification')

  // ─────────────────────────────────────────────────────────────
  // 5. SCENARIO D: PRODUCT REQUIRING MANDATORY ISI (PLASTIC TOYS)
  // ─────────────────────────────────────────────────────────────
  console.log('\nScenario D: Plastic Toys -> IS 9873 (Scheme-I Mandatory)')

  const resD = await defaultJourneyService.generateJourney({
    productName: 'Plastic Educational Building Block Toys',
    category: 'Toys / Children Goods',
    brand: 'PlayFun',
  })

  assert(resD.standard.selected.standardNumber.includes('9873'), `Scenario D: Dynamically associated with IS 9873 (Got: ${resD.standard.selected.standardNumber})`)
  assert(resD.qco.isMandatory === true, 'Scenario D: QCO is mandatory')
  assert(resD.certification.schemeCode === 'SCHEME_I', 'Scenario D: Scheme-I route for toys')
  assert(resD.certification.requirementType === 'MANDATORY_ISI', 'Scenario D: ISI mark required')
  assert(resD.testing.parameters.length > 0, 'Scenario D: Mechanical testing parameters cited')

  // ─────────────────────────────────────────────────────────────
  // 6. SCENARIO E: INSUFFICIENT EVIDENCE PRODUCT
  // ─────────────────────────────────────────────────────────────
  console.log('\nScenario E: Handcrafted Decorative Wooden Artifact -> NOT_DETERMINED')

  const resE = await defaultJourneyService.generateJourney({
    productName: 'Handcrafted Decorative Wooden Artifact',
    category: 'Handicrafts / Decorative Items',
    brand: 'ArtisanCraft',
  })

  assert(resE.standard.selected.standardNumber === 'NOT_DETERMINED', `Scenario E: Standard is NOT_DETERMINED (Got: ${resE.standard.selected.standardNumber})`)
  assert(resE.standard.state === 'NOT_DETERMINED', 'Scenario E: State is NOT_DETERMINED')
  assert(resE.standard.confidenceLevel === 'UNDETERMINED', 'Scenario E: Confidence level is UNDETERMINED')
  assert(resE.qco.isMandatory === false, 'Scenario E: QCO is not mandatory')
  assert(resE.laboratory.status === 'NOT_DETERMINED', 'Scenario E: Laboratory is NOT_DETERMINED')
  assert(resE.laboratory.facilities.length === 0, 'Scenario E: Laboratory facilities list is empty')

  // ─────────────────────────────────────────────────────────────
  // 7. LABORATORY SERVICE PROVENANCE CHECK
  // ─────────────────────────────────────────────────────────────
  console.log('\nConstraint Group 2: Laboratory Service Provenance & Truthfulness')

  const allLabs = await defaultLaboratoriesService.getAllLaboratories()
  assert(allLabs.length > 0, `Laboratories catalog has entries (Count: ${allLabs.length})`)
  
  const allDemo = allLabs.every((lab) => lab.isDemoData === true)
  assert(allDemo, 'All sample laboratories explicitly declare isDemoData=true')

  const labFilterTest = await defaultLaboratoriesService.filterLaboratories({ standardNumber: 'IS 17526' })
  assert(labFilterTest.length > 0, 'Filters laboratories matching IS 17526 capability')

  // ─────────────────────────────────────────────────────────────
  // 8. STRUCTURAL PRESERVATION: OFFICER PORTAL & CONSUMER TABS
  // ─────────────────────────────────────────────────────────────
  console.log('\nConstraint Group 3: Protected Routes & Officer Portal Preservation')

  const officerPageExists = fs.existsSync(path.join(__dirname, '../src/app/(authority)/authority/inspections/page.tsx'))
  const officerLayoutExists = fs.existsSync(path.join(__dirname, '../src/app/(authority)/layout.tsx'))
  const consumerVerifyExists = fs.existsSync(path.join(__dirname, '../src/app/(consumer)/consumer/verify/page.tsx'))
  const consumerScanExists = fs.existsSync(path.join(__dirname, '../src/app/(consumer)/consumer/scan/page.tsx'))
  const consumerJourneyExists = fs.existsSync(path.join(__dirname, '../src/app/(consumer)/consumer/journey/page.tsx'))

  assert(officerPageExists, 'Officer inspections route (/authority/inspections) is intact')
  assert(officerLayoutExists, 'Officer layout (/authority/layout) is intact')
  assert(consumerVerifyExists, 'Consumer verify route (/consumer/verify) is intact')
  assert(consumerScanExists, 'Consumer scan route (/consumer/scan) is intact')
  assert(consumerJourneyExists, 'New Phase D journey route (/consumer/journey) exists')

  // Summary
  console.log('\n======================================================================')
  console.log(`PHASE D TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhaseDTests().catch((err) => {
  console.error('Fatal error in Phase D test runner:', err)
  process.exit(1)
})
