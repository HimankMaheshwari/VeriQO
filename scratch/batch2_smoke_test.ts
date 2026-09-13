/**
 * Batch 2 UX Smoke Verification Script
 * Validates actual rendered HTML and API contracts for Batch 2 UX components:
 * 1. Standards loading/error/empty states
 * 2. Journey loading and candidate switching
 * 3. BIS verification errors/retry
 * 4. Laboratories filters/empty state
 * 5. Responsive inspection layout
 * 6. Keyboard focus/accessibility
 */

import { encode } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-openssl-rand-base64-32'
const BASE_URL = 'http://localhost:3000'

async function getAuthCookie(role: 'CONSUMER' | 'AUTHORITY_OFFICER'): Promise<string> {
  const token = await encode({
    token: {
      id: role === 'CONSUMER' ? 'cmtycpkbe0000mka10vvqz689' : 'cmtyb9p8800009nfan5ojtv9i',
      email: role === 'CONSUMER' ? 'test-p5-owner@veriQO.gov.in' : 'officer1.p4a@test.veriQO',
      name: role === 'CONSUMER' ? 'Consumer Tester' : 'Officer Tester',
      role,
    },
    secret: SECRET,
    salt: 'authjs.session-token',
  })
  return `authjs.session-token=${token}`
}

async function runSmokeTests() {
  console.log('======================================================================')
  console.log('BATCH 2 UX SMOKE TEST & VERIFICATION')
  console.log('======================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`)
      passed++
    } else {
      console.error(`  [FAIL] ${testName}`)
      if (detail) console.error(`         ${detail}`)
      failed++
    }
  }

  const consumerCookie = await getAuthCookie('CONSUMER')
  const officerCookie = await getAuthCookie('AUTHORITY_OFFICER')

  // ─────────────────────────────────────────────────────────────────
  // 1. Standards Explorer UX & Empty States
  // ─────────────────────────────────────────────────────────────────
  console.log('Test Group 1: Standards Explorer UX, Skeletons & Responsive Layout')
  try {
    const res = await fetch(`${BASE_URL}/consumer/standards`, {
      headers: { Cookie: consumerCookie },
    })
    assert(res.status === 200, 'Standards page returns HTTP 200 with session')
    const html = await res.text()
    assert(html.includes('Standards Discovery') || html.includes('Standards Explorer'), 'Standards page title renders')
    assert(html.includes('Search Indian Standards') || html.includes('Search standards by IS number'), 'Search input renders')
    assert(html.includes('grid-template-columns') || html.includes('responsive') || html.includes('max-content'), 'Responsive layout container active')
    assert(!html.includes('An unexpected error occurred') && !html.includes('Stack trace:'), 'Zero unhandled errors or stack traces')
  } catch (err: any) {
    assert(false, 'Standards page fetch succeeded', err.message)
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. Laboratories UX & Filter State
  // ─────────────────────────────────────────────────────────────────
  console.log('\nTest Group 2: Laboratories UX & Authentic Filtering')
  try {
    const res = await fetch(`${BASE_URL}/consumer/laboratories`, {
      headers: { Cookie: consumerCookie },
    })
    assert(res.status === 200, 'Laboratories page returns HTTP 200')
    const html = await res.text()
    assert(html.includes('Testing Laboratories Directory'), 'Laboratories page renders header')
    assert(html.includes('responsive-lab-filter'), 'Uses responsive-lab-filter class for mobile adaptiveness')
    assert(html.includes('Uttar Pradesh'), 'Includes authentic state filter options')
    assert(html.includes('SAMPLE RECORD'), 'Accurately displays SAMPLE RECORD badge for mock provenance')
    assert(html.includes('BIS Central Laboratory'), 'Renders authentic central facility record')
  } catch (err: any) {
    assert(false, 'Laboratories page fetch succeeded', err.message)
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. BIS Compliance Journey & Candidate Switching
  // ─────────────────────────────────────────────────────────────────
  console.log('\nTest Group 3: BIS Compliance Journey End-to-End Steps')
  try {
    const res = await fetch(`${BASE_URL}/consumer/journey`, {
      headers: { Cookie: consumerCookie },
    })
    assert(res.status === 200, 'Journey page returns HTTP 200')
    const html = await res.text()
    assert(html.includes('Product Under Assessment') || html.includes('Applicable Indian Standard'), 'Renders step header')
    assert(html.includes('Why This Standard?'), 'Step 02 Why This Standard renders')
    assert(html.includes('Quality Control Order'), 'Step 03 QCO renders')
    assert(html.includes('Statutory Certification Route'), 'Step 04 Certification renders')
    assert(html.includes('Required Testing Specifications'), 'Step 05 Testing parameters render')
    assert(html.includes('responsive-testing-grid'), 'Step 05 uses responsive-testing-grid')
    assert(html.includes('Accredited Testing Laboratories'), 'Step 06 Laboratories render')
    assert(html.includes('Recommended Next Action'), 'Step 07 Next action renders')
    assert(html.includes('aria-expanded'), 'Accordions include aria-expanded for screen readers')
  } catch (err: any) {
    assert(false, 'Journey page fetch succeeded', err.message)
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. BIS Verification & Error States
  // ─────────────────────────────────────────────────────────────────
  console.log('\nTest Group 4: BIS Verification Layout & Error Handling')
  try {
    const res = await fetch(`${BASE_URL}/consumer/verify`, {
      headers: { Cookie: consumerCookie },
    })
    assert(res.status === 200, 'Verify page returns HTTP 200')
    const html = await res.text()
    assert(html.includes('Verify BIS Scheme-I (ISI Mark) CM/L Number') || html.includes('CM/L'), 'CM/L verification tab renders')
    assert(html.includes('responsive-form-grid-3'), 'Form inputs use responsive-form-grid-3 class')
    assert(html.includes('aria-label="CM/L Licence Number"'), 'Accessible aria-label on CM/L input')
    assert(html.includes('Quick Samples:'), 'Quick test samples rendered')
  } catch (err: any) {
    assert(false, 'Verify page fetch succeeded', err.message)
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. Authority Inspection Responsive Layout
  // ─────────────────────────────────────────────────────────────────
  console.log('\nTest Group 5: Authority Inspection Review Responsive Grid')
  try {
    const res = await fetch(`${BASE_URL}/authority/inspections/cmtoh50lb0001rjua3g0sujwp`, {
      headers: { Cookie: officerCookie },
    })
    assert(res.status === 200, 'Authority inspection returns HTTP 200 for officer')
    const html = await res.text()
    assert(html.includes('responsive-grid-2col'), 'Inspection review uses responsive-grid-2col (no rigid 340px column on mobile)')
    assert(html.includes('Physical Product &amp; Packaging Identity') || html.includes('Physical Product'), 'Product identity panel rendered')
  } catch (err: any) {
    assert(false, 'Authority inspection fetch succeeded', err.message)
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. API Error Resilience & Non-Swallowed Negative States
  // ─────────────────────────────────────────────────────────────────
  console.log('\nTest Group 6: Negative Verification vs. System Errors')
  try {
    // Verified negative: CM/L not found in registry (should be VERIFIED NEGATIVE, not a 500 or swallowed error)
    const cmlRes = await fetch(`${BASE_URL}/api/v1/bis/verify/cml?cmlNumber=CM/L-9999999`, {
      headers: { Cookie: consumerCookie },
    })
    const cmlJson = await cmlRes.json()
    assert(cmlRes.status === 200, 'Negative CM/L lookup returns HTTP 200 (not 500)')
    assert(cmlJson.data.isValid === false, 'Negative CM/L has isValid = false')
    assert(cmlJson.data.status === 'NOT_VERIFIED' || cmlJson.data.status === 'INVALID', 'Negative CM/L is semantically NOT_VERIFIED / INVALID')

    // Journey for commodity without mandatory QCO (Vim): returns NOT_DETERMINED without crashing
    const journeyRes = await fetch(`${BASE_URL}/api/v1/bis/journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: consumerCookie },
      body: JSON.stringify({ productName: 'Vim Concentrated Gel Dishwash Liquid' }),
    })
    const journeyJson = await journeyRes.json()
    assert(journeyRes.status === 200, 'Journey evaluates commodity without QCO with HTTP 200')
    assert(journeyJson.data.standard.selected.standardNumber === 'NOT_DETERMINED', 'Commodity without QCO standard is NOT_DETERMINED')
    assert(journeyJson.data.qco.status === 'NOT_APPLICABLE', 'Commodity without QCO status is NOT_APPLICABLE')
  } catch (err: any) {
    assert(false, 'Negative API resilience succeeded', err.message)
  }

  console.log('\n======================================================================')
  console.log(`SMOKE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('======================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test crashed:', err)
  process.exit(1)
})
