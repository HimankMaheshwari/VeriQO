import { processScan } from '@/lib/pipeline/process-scan'
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('===============================================================')
  console.log('Testing processScan on real user scan cmtomnp5r001tc9xrg837zukn')
  console.log('===============================================================')
  
  const result = await processScan('cmtomnp5r001tc9xrg837zukn')
  
  console.log(`Scan Status:        ${result.scan.status}`)
  console.log(`OCR Status:         ${result.scan.ocrStatus}`)
  console.log(`Product Name:       ${result.scan.identifiedProductName}`)
  console.log(`Brand:              ${result.scan.identifiedBrand}`)
  console.log(`OCR Raw Text Size:  ${result.scan.rawOcrText?.length || 0} characters`)
  console.log('\n--- OCR Raw Text Preview ---')
  console.log(result.scan.rawOcrText?.substring(0, 500) || '(none)')
  console.log('----------------------------\n')
  
  const FIELD_LABEL_MAP: Record<string, string> = {
    product_name: 'Product / Commodity Name',
    brand: 'Brand Name',
    manufacturer: 'Manufacturer Name',
    packer: 'Packer Name',
    importer: 'Importer Name',
    address: 'Complete Physical Address',
    net_quantity: 'Net Quantity / Weight / Volume',
    mrp: 'Maximum Retail Price (MRP)',
    date_of_manufacture: 'Date of Manufacture',
    date_of_packing: 'Date of Packing',
    best_before: 'Best Before / Expiry Date',
    customer_care: 'Customer Care Details',
    country_of_origin: 'Country of Origin',
    batch_number: 'Batch / Lot Number',
  }

  const detected = result.scan.extractedDeclarations.filter((d) => d.detectionStatus === 'DETECTED')
  console.log(`Detected Mandatory Declarations (${detected.length} of ${result.scan.extractedDeclarations.length}):`)
  for (const d of detected) {
    const label = FIELD_LABEL_MAP[d.fieldName] || d.fieldName
    console.log(`  • ${label} [${d.fieldName}]: "${d.normalizedValue || d.rawValue}" (Confidence: ${d.confidence})`)
    if (d.sourceText) {
      console.log(`    ↳ Source: "${d.sourceText}"`)
    }
  }

  const notDetected = result.scan.extractedDeclarations.filter((d) => d.detectionStatus !== 'DETECTED')
  console.log(`\nNot Detected Declarations (${notDetected.length}):`)
  for (const d of notDetected) {
    const label = FIELD_LABEL_MAP[d.fieldName] || d.fieldName
    console.log(`  - ${label} [${d.fieldName}]`)
  }

  // Assertions for verification
  if (result.scan.status !== 'COMPLETE') {
    throw new Error(`Expected scan status COMPLETE, got ${result.scan.status}`)
  }
  if (!result.scan.rawOcrText || result.scan.rawOcrText.trim().length === 0) {
    throw new Error('Expected non-empty raw OCR text!')
  }
  if (detected.length === 0) {
    throw new Error('Expected at least one declaration to be detected!')
  }

  console.log('\n✅ Verification of Real Uploaded Scan Passed with flying colors!')
}

main()
  .catch((err) => {
    console.error('Test execution failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
