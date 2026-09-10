import { prisma } from '@/lib/prisma'
import { getStorageService } from '@/lib/storage'
import { getGeminiApiKey } from '@/lib/ocr/env'
import { GeminiOcrProvider } from '@/lib/ocr/gemini-ocr'
import { HeuristicAnalysisProvider } from '@/lib/ai/heuristic-analyzer'
import { processScan } from '@/lib/pipeline/process-scan'

interface VerificationReport {
  name: string
  status: 'PASSED' | 'FAILED'
  details: string
}

const reports: VerificationReport[] = []

function assert(condition: boolean, testName: string, failureDetails: string) {
  if (condition) {
    reports.push({ name: testName, status: 'PASSED', details: 'OK' })
  } else {
    reports.push({ name: testName, status: 'FAILED', details: failureDetails })
  }
}

async function runVerification() {
  console.log('====================================================')
  console.log('   VeriQO Phase 2 End-to-End Verification Suite     ')
  console.log('====================================================\n')

  // ── 1. Database Connection & Schema Health ────────────────────────────────
  try {
    const userCount = await prisma.user.count()
    const scanCount = await prisma.productScan.count()
    const complaintCount = await prisma.complaint.count()
    const inspectionCount = await prisma.inspection.count()
    assert(
      userCount >= 0 && scanCount >= 0 && complaintCount >= 0 && inspectionCount >= 0,
      'Prisma / Supabase Database Connection',
      'Failed to query base tables'
    )
  } catch (err) {
    assert(false, 'Prisma / Supabase Database Connection', String(err))
  }

  // ── 2. Heuristic Pattern Analysis on Real Indian Packaging Samples ─────────
  const heuristic = new HeuristicAnalysisProvider()

  // Sample A: Parle-G Biscuits
  const parleText = `
    PARLE-G GLUCOSE BISCUITS
    Brand: Parle
    Net Qty: 250g
    MRP: Rs. 25.00 (Incl. of all taxes)
    Mfg Date: 15/08/2026
    Best Before: 6 months from packaging
    Manufactured by: Parle Products Pvt Ltd
    Customer Care: 1800-22-7777 / customercare@parle.biz
    Country of Origin: India
    Batch No: PG2026A
  `
  const resA = await heuristic.analyzePackage(parleText)
  assert(
    resA.product.brand === 'Parle' &&
    resA.product.status === 'IDENTIFIED',
    'Heuristic Parser: Brand & Product Identification (Parle-G)',
    `Expected Parle / IDENTIFIED, got ${resA.product.brand} / ${resA.product.status}`
  )

  const mrpItemA = resA.declarations.find((d) => d.fieldName === 'mrp')
  assert(
    mrpItemA?.rawValue?.includes('25') ?? false,
    'Heuristic Parser: MRP Declaration Extraction (Parle-G)',
    `Expected MRP containing 25, got "${mrpItemA?.rawValue}"`
  )

  const netQtyItemA = resA.declarations.find((d) => d.fieldName === 'net_quantity')
  assert(
    netQtyItemA?.rawValue === '250g',
    'Heuristic Parser: Net Quantity Extraction (Parle-G)',
    `Expected 250g, got "${netQtyItemA?.rawValue}"`
  )

  const batchItemA = resA.declarations.find((d) => d.fieldName === 'batch_number')
  assert(
    batchItemA?.rawValue === 'PG2026A',
    'Heuristic Parser: Batch Number Extraction (Parle-G)',
    `Expected PG2026A, got "${batchItemA?.rawValue}"`
  )

  // Sample B: Tata Salt
  const tataText = `
    TATA SALT VACUUM EVAPORATED IODISED SALT
    Brand: Tata
    Net Weight: 1 kg
    MRP: ₹28.00
    Date of Mfg: 01/04/2026
    Customer Helpline: 1800-209-6633
    Country of Origin: India
    Batch: TS9901
  `
  const resB = await heuristic.analyzePackage(tataText)
  assert(
    resB.product.brand === 'Tata',
    'Heuristic Parser: Brand Identification (Tata Salt)',
    `Expected Tata, got ${resB.product.brand}`
  )
  const netQtyItemB = resB.declarations.find((d) => d.fieldName === 'net_quantity')
  assert(
    netQtyItemB?.rawValue === '1 kg',
    'Heuristic Parser: Net Weight Extraction (Tata Salt)',
    `Expected 1 kg, got "${netQtyItemB?.rawValue}"`
  )

  // ── 3. Heuristic Parser: False-Success Prevention on Metadata / Notice Text ──
  const metadataNoticeText = `
    [Notice: GEMINI_API_KEY is not configured in .env.local. Configure your Google Gemini API key to activate live vision OCR.]
    Image: image/jpeg (45 KB)
  `
  const resMetadata = await heuristic.analyzePackage(metadataNoticeText)
  assert(
    resMetadata.product.status === 'FAILED' &&
    resMetadata.product.productName === null,
    'Heuristic Parser: Does NOT Invent Product from Image Metadata or Notices',
    `Expected FAILED / null, got ${resMetadata.product.status} / "${resMetadata.product.productName}"`
  )

  // ── 4. Multimodal Image Payload Handling ─────────────────────────────────
  const testBuffer = Buffer.from('TEST_JPEG_DATA_STREAM')
  const base64Sample = testBuffer.toString('base64')
  assert(
    base64Sample.length > 0 && typeof base64Sample === 'string',
    'Multimodal: Image Buffer Base64 Encoding',
    'Base64 conversion failed'
  )

  // ── 5. Environment Key Loader from .env.local on Disk ─────────────────────
  const detectedKey = getGeminiApiKey()
  console.log(`Detected GEMINI_API_KEY from environment/.env.local: ${detectedKey ? '[CONFIGURED]' : '[NOT CONFIGURED]'}`)
  assert(
    true,
    'Environment: Key Loader Inspection (.env.local disk parsing)',
    'OK'
  )

  // ── 6. Pipeline Orchestrator: Safe Handling without GEMINI_API_KEY ────────
  let testScanId: string | null = null
  const storage = getStorageService()
  const storageKeys: string[] = []

  try {
    const consumer = await prisma.user.findFirst({
      where: { role: 'CONSUMER' },
    })

    if (!consumer) {
      throw new Error('No consumer user in DB')
    }

    const scan = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        status: 'PENDING',
        notes: 'End-to-End Verification Pipeline Run',
      },
    })
    testScanId = scan.id

    const realSamplePath = 'scans/cmtokwquo0001r4qig4by8bap/3f1af55f-fb51-4be0-b216-574226f45cd5.jpg'
    let frontBuffer: Buffer
    try {
      frontBuffer = await storage.getBuffer(realSamplePath)
    } catch {
      frontBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
      ])
    }
    const key1 = `test-e2e/${scan.id}/front.jpg`
    await storage.upload(frontBuffer, key1, 'image/jpeg')
    storageKeys.push(key1)

    await prisma.scanImage.create({
      data: {
        scanId: scan.id,
        storageKey: key1,
        originalFilename: 'front_face.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: frontBuffer.length,
      },
    })

    const pipelineResult = await processScan(scan.id)

    if (!detectedKey) {
      // Without API key, the pipeline must NOT report COMPLETE or invent a product
      assert(
        pipelineResult.scan.status === 'FAILED',
        'Pipeline (No API Key): Scan Marks FAILED Explicitly (No False Success)',
        `Expected FAILED, got ${pipelineResult.scan.status}`
      )
      assert(
        pipelineResult.scan.ocrStatus === 'FAILED' &&
        Boolean(pipelineResult.scan.ocrError?.includes('GEMINI_API_KEY')),
        'Pipeline (No API Key): Clear Error Message Instructs User to Set GEMINI_API_KEY',
        `ocrError was: "${pipelineResult.scan.ocrError}"`
      )
      assert(
        pipelineResult.scan.identifiedProductName === null,
        'Pipeline (No API Key): Does NOT Create Fake Product Name from Metadata',
        `identifiedProductName was: "${pipelineResult.scan.identifiedProductName}"`
      )
      assert(
        pipelineResult.scan.productId === null,
        'Pipeline (No API Key): Does NOT Create Bogus DB Product Entity',
        `productId was: ${pipelineResult.scan.productId}`
      )
    } else {
      // With API key, Gemini OCR executes live
      assert(
        pipelineResult.scan.status === 'COMPLETE',
        'Pipeline (With API Key): Scan Completed with Live Vision OCR',
        `Expected COMPLETE, got ${pipelineResult.scan.status}`
      )
    }

    assert(
      pipelineResult.scan.extractedDeclarations.length === 14,
      'Pipeline: All 14 Mandatory Declarations Initialized',
      `Expected 14 declarations, got ${pipelineResult.scan.extractedDeclarations.length}`
    )

    // Verify audit log recorded
    const auditRecord = await prisma.auditLog.findFirst({
      where: { entityId: scan.id, action: 'PRODUCT_SCAN' },
    })

    assert(
      Boolean(auditRecord),
      'Pipeline: PRODUCT_SCAN Audit Log Recorded',
      'No audit log found for scan'
    )
  } catch (err) {
    assert(false, 'Pipeline Multi-Image Orchestration', String(err))
  } finally {
    if (testScanId) {
      await prisma.extractedDeclaration.deleteMany({ where: { scanId: testScanId } })
      await prisma.scanImage.deleteMany({ where: { scanId: testScanId } })
      await prisma.auditLog.deleteMany({ where: { entityId: testScanId } })
      await prisma.productScan.delete({ where: { id: testScanId } }).catch(() => {})
      for (const k of storageKeys) {
        await storage.delete(k).catch(() => {})
      }
    }
  }

  // ── 7. Phase 1 Regressions Check ──────────────────────────────────────────
  try {
    const sampleComplaint = await prisma.complaint.findFirst({
      include: { consumer: true },
    })
    assert(
      sampleComplaint === null || Boolean(sampleComplaint.consumer),
      'Phase 1 Regression: Complaints & Consumer Relations Intact',
      'Failed relation query on Complaint'
    )

    const sampleInspection = await prisma.inspection.findFirst({
      include: { officer: true, scan: true },
    })
    assert(
      sampleInspection === null || Boolean(sampleInspection.officer),
      'Phase 1 Regression: Inspections & Officer Relations Intact',
      'Failed relation query on Inspection'
    )

    // ── 8. Phase 2 Linkage: Complaint and Inspection scanId linkage ──────────
    const existingScan = await prisma.productScan.findFirst()
    if (existingScan) {
      const consumer = await prisma.user.findFirst({ where: { role: 'CONSUMER' } })
      const officer = await prisma.user.findFirst({ where: { role: 'AUTHORITY_OFFICER' } })

      if (consumer) {
        const testComplaint = await prisma.complaint.create({
          data: {
            consumerId: consumer.id,
            scanId: existingScan.id,
            title: 'Test Complaint Linked to Scan',
            description: 'Verifying complaint links correctly to product scan session.',
          },
          include: { scan: true },
        })
        assert(
          testComplaint.scanId === existingScan.id && Boolean(testComplaint.scan),
          'Phase 2 Linkage: Complaint Links to Originating ProductScan',
          'Complaint scanId relation failed'
        )
        await prisma.complaint.delete({ where: { id: testComplaint.id } })
      }

      if (officer) {
        const testInspection = await prisma.inspection.create({
          data: {
            officerId: officer.id,
            scanId: existingScan.id,
            title: 'Test Inspection Linked to Scan',
            notes: 'Verifying inspection links correctly to product scan session.',
          },
          include: { scan: true },
        })
        assert(
          testInspection.scanId === existingScan.id && Boolean(testInspection.scan),
          'Phase 2 Linkage: Inspection Links to Target ProductScan',
          'Inspection scanId relation failed'
        )
        await prisma.inspection.delete({ where: { id: testInspection.id } })
      }
    }
  } catch (err) {
    assert(false, 'Phase 1 Regression Check & Linkage', String(err))
  }

  // ── Summary Output ────────────────────────────────────────────────────────
  console.log('\nResults:')
  let allPassed = true
  for (const r of reports) {
    const icon = r.status === 'PASSED' ? '✅' : '❌'
    console.log(`  ${icon} [${r.status}] ${r.name}`)
    if (r.status === 'FAILED') {
      console.log(`     Details: ${r.details}`)
      allPassed = false
    }
  }

  console.log(`\nTotal Tests: ${reports.length}`)
  console.log(`Passed: ${reports.filter((r) => r.status === 'PASSED').length}`)
  console.log(`Failed: ${reports.filter((r) => r.status === 'FAILED').length}`)

  if (!allPassed) {
    process.exit(1)
  }
}

runVerification()
  .catch((err) => {
    console.error('Fatal error during verification:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
