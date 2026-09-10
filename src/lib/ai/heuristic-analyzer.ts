import type {
  ProductAnalysisService,
  AnalysisResult,
  ExtractedDeclarationItem,
  ProductIdentificationResult,
} from './types'
import { MANDATORY_DECLARATION_FIELDS } from './types'
import type { DetectionStatus } from '@prisma/client'

export class HeuristicAnalysisProvider implements ProductAnalysisService {
  readonly providerName = 'deterministic-pattern-analyzer'

  async analyzePackage(rawOcrText: string): Promise<AnalysisResult> {
    const text = (rawOcrText || '').trim()

    // Filter out technical headers, image labels, and OCR status notices
    const IGNORED_LINE_PATTERNS = [
      /^\[.*\]$/,                          // [Notice: ...] or [Image ...]
      /^===.*===$/,                        // === Image 1 ===
      /^---\s*\[.*\]\s*---$/,              // --- [Packaging Surface 1] ---
      /^image\s*[:/]/i,                    // Image: image/jpeg ...
      /\b(?:image\/jpeg|image\/png|image\/webp|image\/heic)\b/i,
      /\b\d+\s*(?:kb|mb|bytes)\b/i,        // (45 KB)
      /\b(?:gemini_api_key|api_key|fallback-mock-ocr)\b/i,
    ]

    const allLines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const cleanLines = allLines.filter((line) => !IGNORED_LINE_PATTERNS.some((p) => p.test(line)))

    // If no meaningful text remains after filtering
    if (cleanLines.length === 0) {
      return {
        product: {
          productName: null,
          brand: null,
          category: null,
          likelyManufacturer: null,
          confidence: 0,
          status: 'FAILED',
        },
        declarations: MANDATORY_DECLARATION_FIELDS.map((spec) => ({
          fieldName: spec.fieldName,
          label: spec.label,
          rawValue: null,
          normalizedValue: null,
          confidence: 0,
          sourceText: null,
          detectionStatus: 'NOT_DETECTED' as DetectionStatus,
        })),
      }
    }

    const cleanText = cleanLines.join('\n')

    // ── 1. Pattern Extractors ──────────────────────────────────────────────
    const mrpMatch = cleanText.match(
      /(?:MRP|M\.R\.P\.|Max(?:imum)?\s*Retail\s*Price)[\s:.-]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*([^\n\r]*)/i
    )
    const netQtyMatch = cleanText.match(
      /(?:Net\s*(?:Qty|Quantity|Weight|Contents|Wt\.?|Vol\.?|Volume))[\s:.-]*([0-9.]+\s*(?:g|kg|ml|l|ltr|gm|gms|pieces|units|N\b|g\b|ml\b))/i
    )
    const mfdMatch = cleanText.match(
      /(?:Mfg|Mfd|Date of Mfg|Manufactured on)[\s:.-]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Za-z]{3}[-/\s]*[0-9]{2,4})/i
    )
    const pkdMatch = cleanText.match(
      /(?:Pkg|Packed|Date of Pkg|Date of Packing)[\s:.-]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[A-Za-z]{3}[-/\s]*[0-9]{2,4})/i
    )
    const expMatch = cleanText.match(
      /(?:Best\s*Before|Exp(?:iry)?\s*Date|Use\s*By)[\s:.-]*([A-Za-z0-9\s/.-]{4,25})/i
    )
    const batchMatch = cleanText.match(
      /(?:Batch|Lot)[\s]*(?:No\.?|Number)?[\s:.-]*([A-Za-z0-9/-]{3,15})/i
    )
    const originMatch = cleanText.match(
      /(?:Made in|Country of Origin)[\s:.-]*([A-Za-z]+)/i
    )
    const mfgByNameMatch = cleanText.match(
      /(?:Mfd\s*by|Manufactured\s*by|Produced\s*by)[\s:.-]*([^\n\r,]+)/i
    )
    const careMatch = cleanText.match(
      /(?:Customer\s*Care|Helpline|Feedback|Consumer\s*Care)[\s\S]{0,100}?(1800[-\s]?[0-9]{3}[-\s]?[0-9]{3,4}|[0-9]{10}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    )
    const uspMatch = cleanText.match(
      /(?:USP|U\.S\.P\.|Unit\s*Sale\s*Price)[\s:.-]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\s*\.\s*[0-9]{1,4})?)\s*(?:\/|\s*per\s*)([a-zA-Z]+)|(?:₹|Rs\.?)\s*([0-9]+(?:\s*\.\s*[0-9]{1,2})?)\s*\/\s*(ml|l|g|kg|piece|unit|item|cm|m)\b/i
    )

    // ── 2. Product Name & Brand Heuristics ─────────────────────────────────
    let detectedBrand: string | null = null
    let detectedProductName: string | null = null
    let detectedCategory: string | null = null

    // Known common brands for fast local detection
    const KNOWN_BRANDS = [
      { brand: 'Britannia', category: 'Packaged Food / Biscuits' },
      { brand: 'Parle', category: 'Packaged Food / Biscuits' },
      { brand: 'Amul', category: 'Dairy / Milk Products' },
      { brand: 'Nestle', category: 'Packaged Food / Beverages' },
      { brand: 'Haldiram', category: 'Packaged Food / Snacks' },
      { brand: 'Tata', category: 'Packaged Food / Salt & Spices' },
      { brand: 'ITC', category: 'Packaged Food / FMCG' },
      { brand: 'Dabur', category: 'Consumer Health / Personal Care' },
      { brand: 'Hindustan Unilever', category: 'Personal Care / FMCG' },
      { brand: 'Colgate', category: 'Personal Care / Oral Care' },
      { brand: 'Cadbury', category: 'Packaged Food / Chocolates' },
      { brand: 'Lay\'s', category: 'Packaged Food / Snacks' },
      { brand: 'Kurkure', category: 'Packaged Food / Snacks' },
      { brand: 'Maggi', category: 'Packaged Food / Noodles' },
    ]

    for (const kb of KNOWN_BRANDS) {
      if (new RegExp(`\\b${kb.brand}\\b`, 'i').test(cleanText)) {
        detectedBrand = kb.brand
        detectedCategory = kb.category
        break
      }
    }

    // Inspect top clean lines for product name
    const topLines = cleanLines.slice(0, 4)
    for (const line of topLines) {
      if (
        line.length >= 3 &&
        line.length <= 60 &&
        !line.toLowerCase().startsWith('declarations') &&
        !line.toLowerCase().startsWith('mrp') &&
        !line.toLowerCase().startsWith('net')
      ) {
        if (!detectedProductName) {
          detectedProductName = line
        }
      }
    }

    const hasIdentification = Boolean(detectedBrand || detectedProductName)

    const product: ProductIdentificationResult = {
      productName: detectedProductName || (detectedBrand ? `${detectedBrand} Product` : null),
      brand: detectedBrand || null,
      category: detectedCategory || 'Packaged Commodity',
      likelyManufacturer: mfgByNameMatch ? mfgByNameMatch[1].trim() : detectedBrand,
      confidence: hasIdentification ? (detectedBrand ? 0.85 : 0.6) : 0,
      status: hasIdentification ? 'IDENTIFIED' : 'FAILED',
    }

    // ── 3. Build Declarations Map ──────────────────────────────────────────
    const extractedMap: Record<
      string,
      { raw: string | null; norm: string | null; source: string | null; conf: number }
    > = {
      product_name: {
        raw: product.productName,
        norm: product.productName,
        source: product.productName,
        conf: product.productName ? product.confidence : 0,
      },
      brand: {
        raw: product.brand,
        norm: product.brand,
        source: product.brand,
        conf: product.brand ? 0.9 : 0,
      },
      manufacturer: {
        raw: mfgByNameMatch ? mfgByNameMatch[1].trim() : null,
        norm: mfgByNameMatch ? mfgByNameMatch[1].trim() : null,
        source: mfgByNameMatch ? mfgByNameMatch[0].trim() : null,
        conf: mfgByNameMatch ? 0.85 : 0,
      },
      packer: { raw: null, norm: null, source: null, conf: 0 },
      importer: { raw: null, norm: null, source: null, conf: 0 },
      address: {
        raw: mfgByNameMatch ? `Mfd at address stated on packaging` : null,
        norm: null,
        source: null,
        conf: mfgByNameMatch ? 0.5 : 0,
      },
      net_quantity: {
        raw: netQtyMatch ? netQtyMatch[1].trim() : null,
        norm: netQtyMatch ? netQtyMatch[1].trim() : null,
        source: netQtyMatch ? netQtyMatch[0].trim() : null,
        conf: netQtyMatch ? 0.92 : 0,
      },
      mrp: {
        raw: mrpMatch ? `₹${mrpMatch[1].trim()}` : null,
        norm: mrpMatch ? mrpMatch[1].trim() : null,
        source: mrpMatch ? mrpMatch[0].trim() : null,
        conf: mrpMatch ? 0.94 : 0,
      },
      unit_sale_price: {
        raw: uspMatch ? uspMatch[0].trim() : null,
        norm: uspMatch
          ? `₹${(uspMatch[1] || uspMatch[3] || '').replace(/\s+/g, '')}/${(uspMatch[2] || uspMatch[4] || '').toLowerCase()}`
          : null,
        source: uspMatch ? uspMatch[0].trim() : null,
        conf: uspMatch ? 0.9 : 0,
      },
      date_of_manufacture: {
        raw: mfdMatch ? mfdMatch[1].trim() : null,
        norm: mfdMatch ? mfdMatch[1].trim() : null,
        source: mfdMatch ? mfdMatch[0].trim() : null,
        conf: mfdMatch ? 0.88 : 0,
      },
      date_of_packing: {
        raw: pkdMatch ? pkdMatch[1].trim() : null,
        norm: pkdMatch ? pkdMatch[1].trim() : null,
        source: pkdMatch ? pkdMatch[0].trim() : null,
        conf: pkdMatch ? 0.88 : 0,
      },
      best_before: {
        raw: expMatch ? expMatch[1].trim() : null,
        norm: expMatch ? expMatch[1].trim() : null,
        source: expMatch ? expMatch[0].trim() : null,
        conf: expMatch ? 0.85 : 0,
      },
      customer_care: {
        raw: careMatch ? careMatch[1].trim() : null,
        norm: careMatch ? careMatch[1].trim() : null,
        source: careMatch ? careMatch[0].trim() : null,
        conf: careMatch ? 0.85 : 0,
      },
      country_of_origin: {
        raw: originMatch ? originMatch[1].trim() : cleanText.length > 50 ? 'India' : null,
        norm: originMatch ? originMatch[1].trim() : cleanText.length > 50 ? 'India' : null,
        source: originMatch ? originMatch[0].trim() : null,
        conf: originMatch ? 0.9 : 0.5,
      },
      batch_number: {
        raw: batchMatch ? batchMatch[1].trim() : null,
        norm: batchMatch ? batchMatch[1].trim() : null,
        source: batchMatch ? batchMatch[0].trim() : null,
        conf: batchMatch ? 0.9 : 0,
      },
    }

    const declarations: ExtractedDeclarationItem[] = MANDATORY_DECLARATION_FIELDS.map((spec) => {
      const data = extractedMap[spec.fieldName]
      const isDetected = Boolean(data && data.raw)
      const status: DetectionStatus = isDetected ? 'DETECTED' : 'NOT_DETECTED'

      return {
        fieldName: spec.fieldName,
        label: spec.label,
        rawValue: data?.raw || null,
        normalizedValue: data?.norm || null,
        confidence: data?.conf || 0,
        sourceText: data?.source || null,
        detectionStatus: status,
      }
    })

    return {
      product,
      declarations,
    }
  }
}
