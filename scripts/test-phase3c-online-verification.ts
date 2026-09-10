/**
 * VeriQO Phase 3C: Online & E-commerce Verification Test Suite
 *
 * Covers:
 * 1. SSRF & Security Validation (IP blacklists, loopback, private CIDRs, cloud metadata, schemes)
 * 2. Deterministic Normalization (prices, quantities, corporate entities, countries, canonical URLs)
 * 3. Structured HTML Extraction (JSON-LD, OpenGraph, specification tables)
 * 4. Physical-vs-Online Comparator & Discrepancies
 * 5. Safeguard: Comparator answers MATCH/MISMATCH/UNVERIFIED and never creates legal violations directly
 * 6. Provider Abstraction & Snapshot Hashing
 * 7. Graceful failure on unavailable sources
 * 8. Rule Engine Bridge Integration
 */

import { validateUrlForSsrf, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, SecurityValidationError } from '../src/lib/online/security'
import { normalizePrice, normalizeQuantity, normalizeEntityName, normalizeCountry, normalizeUrl, normalizeOnlineListing } from '../src/lib/online/normalizer'
import { extractRawListingFromHtml } from '../src/lib/online/extractor'
import { comparePhysicalVsOnline } from '../src/lib/online/comparator'
import { MockOnlineProvider } from '../src/lib/online/providers/mock-provider'
import { evaluateOnlineComplianceWithRuleEngine } from '../src/lib/online/rule-engine-bridge'
import { VERIFIED_STATUTORY_RULES } from '../src/lib/rules/seed/legal-rules-data'
import { buildRuleEngineContextFromData } from '../src/lib/rules/context-builder'

let totalPassed = 0
let totalFailed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`)
    totalPassed++
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`)
    totalFailed++
  }
}

async function runPhase3cTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 3C: ONLINE VERIFICATION TEST SUITE')
  console.log('======================================================\n')

  // ─────────────────────────────────────────────────────────────
  // 1. SSRF & Security Validation
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. SSRF & URL Security Controls ---')

  // Valid public URLs
  try {
    const validRes = await validateUrlForSsrf('https://example.com/product/item-101', async () => ['93.184.216.34'])
    assert(validRes.valid && validRes.hostname === 'example.com', 'Valid public HTTPS URL accepted')
  } catch (err: any) {
    assert(false, 'Valid public HTTPS URL accepted', err.message)
  }

  // Reject non-http/https schemes
  const invalidSchemes = ['ftp://example.com/file', 'file:///etc/passwd', 'gopher://127.0.0.1', 'data:text/html,<html>']
  for (const badScheme of invalidSchemes) {
    try {
      await validateUrlForSsrf(badScheme)
      assert(false, `Disallowed scheme rejected: ${badScheme}`)
    } catch (err: any) {
      assert(err instanceof SecurityValidationError, `Disallowed scheme rejected: ${badScheme}`)
    }
  }

  // Reject loopback & localhost
  try {
    await validateUrlForSsrf('http://localhost:3000/api')
    assert(false, 'Localhost rejected')
  } catch (err: any) {
    assert(err.code === 'SSRF_HOST_BLOCKED', 'Localhost rejected by SSRF guard')
  }

  // Reject direct private IPv4 addresses
  assert(isPrivateOrReservedIPv4('127.0.0.1'), '127.0.0.1 recognized as private/loopback')
  assert(isPrivateOrReservedIPv4('10.0.0.5'), '10.0.0.5 recognized as private RFC1918')
  assert(isPrivateOrReservedIPv4('172.16.1.10'), '172.16.1.10 recognized as private RFC1918')
  assert(isPrivateOrReservedIPv4('192.168.1.1'), '192.168.1.1 recognized as private RFC1918')
  assert(isPrivateOrReservedIPv4('169.254.169.254'), '169.254.169.254 (Cloud metadata) recognized as private/link-local')
  assert(!isPrivateOrReservedIPv4('93.184.216.34'), 'Public IP 93.184.216.34 recognized as public')

  // Reject direct private IPv6 addresses
  assert(isPrivateOrReservedIPv6('::1'), '::1 recognized as IPv6 loopback')
  assert(isPrivateOrReservedIPv6('fc00::1'), 'fc00::1 recognized as IPv6 unique local')
  assert(isPrivateOrReservedIPv6('fe80::1'), 'fe80::1 recognized as IPv6 link-local')
  assert(isPrivateOrReservedIPv6('::ffff:127.0.0.1'), '::ffff:127.0.0.1 recognized as mapped IPv4 loopback')

  // Hostname resolving to private IP via DNS rebinding / internal host
  try {
    await validateUrlForSsrf('https://internal.corp.com/item', async () => ['10.10.0.1'])
    assert(false, 'DNS resolution to private IP rejected')
  } catch (err: any) {
    assert(err.code === 'SSRF_RESOLVED_PRIVATE_IP', 'DNS resolution to private IP rejected by SSRF guard')
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Deterministic Normalization
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Deterministic Normalization ---')

  // Prices
  const p1 = normalizePrice('₹ 1,499.00')
  assert(p1?.numericValue === 1499.00 && p1.formatted === '₹ 1499.00', 'Price with rupee symbol & commas normalized')
  const p2 = normalizePrice('Rs. 250')
  assert(p2?.numericValue === 250.00, 'Price with Rs. prefix normalized')
  const p3 = normalizePrice('Invalid')
  assert(p3 === null, 'Invalid price returns null')

  // Quantities & Units
  const q1 = normalizeQuantity('500 g')
  assert(q1?.unit === 'g' && q1.numericValue === 500 && q1.baseGramsOrMl === 500, '500g normalized to standard gram quantity')
  const q2 = normalizeQuantity('1.5 kg')
  assert(q2?.unit === 'kg' && q2.numericValue === 1.5 && q2.baseGramsOrMl === 1500, '1.5kg normalized with 1500 base grams')
  const q3 = normalizeQuantity('750 ml')
  assert(q3?.unit === 'ml' && q3.numericValue === 750 && q3.baseGramsOrMl === 750, '750ml normalized')
  const q4 = normalizeQuantity('2 L')
  assert(q4?.unit === 'l' && q4.numericValue === 2 && q4.baseGramsOrMl === 2000, '2L normalized with 2000 base ml')

  // Corporate Entities
  assert(normalizeEntityName('Britannia Industries Limited') === 'Britannia Industries Ltd', 'Corporate suffix Limited -> Ltd')
  assert(normalizeEntityName('Parle Products Private Limited') === 'Parle Products Pvt Ltd', 'Corporate suffix Private Limited -> Pvt Ltd')

  // Countries
  assert(normalizeCountry('IND') === 'India', 'Country code IND -> India')
  assert(normalizeCountry('in') === 'India', 'Country code in -> India')
  assert(normalizeCountry('Germany') === 'Germany', 'Country Germany normalized')

  // Canonical URLs
  const urlNorm = normalizeUrl('https://www.amazon.in/dp/B08XYZ?utm_source=google&utm_campaign=diwali&ref=sr_1_1')
  assert(urlNorm.domain === 'amazon.in', 'Domain extracted without www prefix')
  assert(!urlNorm.canonicalUrl.includes('utm_source') && !urlNorm.canonicalUrl.includes('ref='), 'Tracking query params stripped from canonical URL')

  // ─────────────────────────────────────────────────────────────
  // 3. Structured HTML Extraction (JSON-LD & Meta)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Structured HTML Extraction ---')

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Parle-G Gold Biscuits 100g - Buy Online</title>
        <meta property="og:title" content="Parle-G Gold Biscuits 100g" />
        <meta property="og:image" content="https://example.com/parle-g.jpg" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Parle-G Gold Biscuits",
            "brand": { "@type": "Brand", "name": "Parle" },
            "manufacturer": { "@type": "Organization", "name": "Parle Products Pvt. Ltd." },
            "countryOfOrigin": "India",
            "category": "Biscuits",
            "weight": "100 g",
            "offers": {
              "@type": "Offer",
              "price": "10.00",
              "priceCurrency": "INR",
              "maxPrice": "10.00"
            }
          }
        </script>
      </head>
      <body>
        <table>
          <tr><td>Net Quantity</td><td>100 g</td></tr>
          <tr><td>Country of Origin</td><td>India</td></tr>
          <tr><td>Customer Care</td><td>care@parle.biz</td></tr>
        </table>
      </body>
    </html>
  `

  const extracted = extractRawListingFromHtml(sampleHtml, 'https://example.com/products/parle-g')
  assert(extracted.title === 'Parle-G Gold Biscuits', 'JSON-LD title extracted')
  assert(extracted.brand === 'Parle', 'JSON-LD brand extracted')
  assert(extracted.manufacturer === 'Parle Products Pvt. Ltd.', 'JSON-LD manufacturer extracted')
  assert(extracted.sellingPrice === '10.00', 'JSON-LD offer selling price extracted')
  assert(extracted.mrp === '10.00', 'JSON-LD offer MRP extracted')
  assert(extracted.extractionSource === 'mixed' || extracted.extractionSource === 'json_ld', 'Extraction source identified')

  const normalized = normalizeOnlineListing(extracted)
  assert(normalized.netQuantity?.standardDisplay === '100 g', 'Extracted net quantity normalized to 100 g')
  assert(normalized.mrp?.formatted === '₹ 10.00', 'Extracted MRP normalized to ₹ 10.00')

  // ─────────────────────────────────────────────────────────────
  // 4. Physical-vs-Online Comparator: Matching Listing
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Physical-vs-Online Comparator: Matching Listing ---')

  const matchingPhysicalScan = {
    id: 'scan-match-01',
    identifiedProductName: 'Parle-G Gold Biscuits',
    extractedDeclarations: [
      { fieldName: 'product_name', rawValue: 'Parle-G Gold Biscuits', normalizedValue: 'Parle-G Gold Biscuits', detectionStatus: 'DETECTED' },
      { fieldName: 'manufacturer', rawValue: 'Parle Products Pvt Ltd', normalizedValue: 'Parle Products Pvt Ltd', detectionStatus: 'DETECTED' },
      { fieldName: 'mrp', rawValue: 'MRP ₹ 10.00 (incl. of all taxes)', normalizedValue: '10.00', detectionStatus: 'DETECTED' },
      { fieldName: 'net_quantity', rawValue: '100 g', normalizedValue: '100 g', detectionStatus: 'DETECTED' },
      { fieldName: 'country_of_origin', rawValue: 'India', normalizedValue: 'India', detectionStatus: 'DETECTED' },
    ],
  }

  const matchContext = buildRuleEngineContextFromData(matchingPhysicalScan as any)
  const matchComparison = comparePhysicalVsOnline(normalized, matchContext)

  assert(matchComparison.overallMatchStatus === 'MATCH', 'Matching listing evaluates to overallMatchStatus: MATCH')
  assert(matchComparison.discrepancies.length === 0, 'Matching listing produces 0 discrepancies')
  assert(matchComparison.matchedFields.includes('mrp'), 'MRP matched')
  assert(matchComparison.matchedFields.includes('net_quantity'), 'Net quantity matched')

  // ─────────────────────────────────────────────────────────────
  // 5. Physical-vs-Online Comparator: Discrepancies & Safeguards
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Discrepancies & Legal Safeguards ---')

  // Case 5A: Online Selling Price > Physical Package MRP (Overcharging Concern)
  const overpricedListing = {
    ...normalized,
    mrp: normalizePrice('₹ 15.00'),
    sellingPrice: normalizePrice('₹ 15.00'), // Selling at ₹15 while package MRP is ₹10!
  }

  const overpriceComparison = comparePhysicalVsOnline(overpricedListing, matchContext)
  assert(overpriceComparison.overallMatchStatus === 'MISMATCH', 'Overpriced listing evaluates to overallMatchStatus: MISMATCH')

  const priceDiscrepancy = overpriceComparison.discrepancies.find((d) => d.discrepancyType === 'PRICE_MISMATCH')
  assert(priceDiscrepancy !== undefined, 'PRICE_MISMATCH discrepancy generated')
  assert(priceDiscrepancy?.severity === 'CRITICAL', 'Price markup discrepancy assigned CRITICAL severity')
  assert(priceDiscrepancy?.isStatutoryConcern === true, 'Price markup flagged with isStatutoryConcern: true')
  assert(Boolean(priceDiscrepancy?.statutoryReference?.includes('Section 36(1)')), 'Statutory reference to Section 36(1) attached in metadata')

  // MANDATORY SAFEGUARD: Comparator does NOT directly create formal violations!
  // The comparator only returns ComparisonResult with discrepancies
  assert(!('violations' in overpriceComparison), 'Comparator does not possess or directly create a legal violations collection')

  // Case 5B: Quantity Mismatch (Online 80g vs Package 100g)
  const qtyMismatchListing = {
    ...normalized,
    netQuantity: normalizeQuantity('80 g'),
  }

  const qtyComparison = comparePhysicalVsOnline(qtyMismatchListing, matchContext)
  assert(
    qtyComparison.discrepancies.some((d) => d.discrepancyType === 'QUANTITY_MISMATCH'),
    'QUANTITY_MISMATCH generated when online quantity differs from physical'
  )

  // Case 5C: Country of Origin Mismatch (Online China vs Package India)
  const originMismatchListing = {
    ...normalized,
    countryOfOrigin: 'China',
  }

  const originComparison = comparePhysicalVsOnline(originMismatchListing, matchContext)
  assert(
    originComparison.discrepancies.some((d) => d.discrepancyType === 'ORIGIN_MISMATCH'),
    'ORIGIN_MISMATCH generated when online country of origin differs from physical'
  )

  // ─────────────────────────────────────────────────────────────
  // 6. Provider Abstraction & Snapshot Hashing
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Provider Abstraction & Snapshot Hashing ---')

  const mockProvider = new MockOnlineProvider()
  mockProvider.registerMock('https://store.example.in/item-555', {
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    htmlContent: sampleHtml,
  })

  assert(mockProvider.supportsUrl('https://store.example.in/item-555'), 'MockProvider recognizes registered URL')

  const fetchResult = await mockProvider.fetchListing('https://store.example.in/item-555')
  assert(fetchResult.httpStatus === 200, 'MockProvider returns HTTP 200')
  assert(fetchResult.contentHash.length === 64, 'SHA-256 contentHash generated for audit trail')
  assert(fetchResult.htmlContent === sampleHtml, 'Fetched HTML matches registered mock')

  // Graceful handling of unavailable source
  mockProvider.registerMock('https://store.example.in/unavailable-404', {
    httpStatus: 404,
    htmlContent: '<html><body>Product Not Found</body></html>',
  })

  const failResult = await mockProvider.fetchListing('https://store.example.in/unavailable-404')
  assert(failResult.httpStatus === 404, 'Unavailable source returns 404 gracefully without crash')

  // ─────────────────────────────────────────────────────────────
  // 7. Rule Engine Bridge Integration
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Rule Engine Bridge Integration ---')

  const rules = VERIFIED_STATUTORY_RULES as any
  const bridgedResult = evaluateOnlineComplianceWithRuleEngine(overpriceComparison, matchContext, rules)

  assert(bridgedResult.engineSummary !== undefined, 'Phase 3A deterministic rule engine executed via bridge')
  assert(bridgedResult.onlineEvidence.length > 0, 'Online statutory concern passed as structured evidence to engine')
  assert(
    bridgedResult.onlineEvidence.some((e) => e.ruleNumber === 'LMPC-2011-R06-1-E'),
    'Online price evidence mapped to Rule 6(1)(e) (MRP)'
  )

  console.log('\n======================================================')
  console.log(`  PHASE 3C TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase3cTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
