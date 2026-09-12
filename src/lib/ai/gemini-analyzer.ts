import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  ProductAnalysisService,
  AnalysisResult,
  ExtractedDeclarationItem,
  ProductIdentificationResult,
} from './types'
import { MANDATORY_DECLARATION_FIELDS, BIS_DECLARATION_FIELDS } from './types'
import { HeuristicAnalysisProvider } from './heuristic-analyzer'
import type { DetectionStatus } from '@prisma/client'

function normalizeMimeType(mime: string): string {
  const lower = (mime || '').toLowerCase().trim()
  if (lower === 'image/jpg' || lower === 'image/pjpeg') return 'image/jpeg'
  if (lower === 'image/x-png') return 'image/png'
  if (lower === 'image/webp') return 'image/webp'
  if (lower === 'image/heic') return 'image/heic'
  return lower || 'image/jpeg'
}

export class GeminiAnalysisProvider implements ProductAnalysisService {
  readonly providerName = 'gemini-packaged-commodity-analyzer'
  private genAI: GoogleGenerativeAI
  private primaryModel: string

  constructor(apiKey: string, modelName = 'gemini-flash-latest') {
    this.genAI = new GoogleGenerativeAI(apiKey.trim())
    this.primaryModel = process.env.GEMINI_AI_MODEL || process.env.GEMINI_MODEL || modelName
  }

  async analyzePackage(
    rawOcrText: string,
    images?: { buffer: Buffer; mimeType: string }[]
  ): Promise<AnalysisResult> {
    const candidateModels = [
      this.primaryModel,
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
    ]
    const uniqueModels = Array.from(new Set(candidateModels))

    const fieldsListing = MANDATORY_DECLARATION_FIELDS.map(
      (f) => `  - "${f.fieldName}": ${f.label}`
    ).join('\n')

    const bisListing = BIS_DECLARATION_FIELDS.map(
      (f) => `  - "${f.fieldName}": ${f.label}`
    ).join('\n')

    const prompt = `You are an expert packaging inspection and text extraction engine for packaged commodities sold in India under the Legal Metrology Act, 2009 and Legal Metrology (Packaged Commodities) Rules, 2011.

TASK:
1. Identify the packaged product (Product Name, Brand, General Category, Likely Manufacturer, Confidence score 0.0-1.0, Identification Status: IDENTIFIED | UNCERTAIN | FAILED).
2. Extract visible package declarations for all mandatory Indian packaging fields.
3. Extract visible Bureau of Indian Standards (BIS) certification identifiers if clearly present on the packaging.

MANDATORY DECLARATION FIELDS:
${fieldsListing}

OPTIONAL BIS CERTIFICATION IDENTIFIERS:
${bisListing}

MANDATORY SAFETY & AUDITING RULES:
- DO NOT INVENT, FABRICATE, OR GUESS MISSING VALUES.
- For each of the mandatory declaration fields and optional BIS fields listed above, return an object in the "declarations" array with its exact "fieldName".
- If a declaration or identifier is not clearly visible in the text or images, set its rawValue to null, normalizedValue to null, sourceText to null, confidence to 0, and detectionStatus to "NOT_DETECTED".
- If text is present and legible, extract the detected value into "rawValue", a clean normalized version into "normalizedValue", the verbatim snippet from the package into "sourceText", a confidence score (0.0 - 1.0), and set detectionStatus to "DETECTED".
- If text is cut off or ambiguous, set detectionStatus to "UNCLEAR".
- For "unit_sale_price": Look across all surfaces, including top seal, coding area, or main panel (e.g. "₹ 0.15/ml", "USP ₹ 0.20/g", "Rs. 1.00/unit"). If the main panel has a pointer like "For USP... See Top/Seal", extract the actual unit price printed on the seal/coding area into rawValue/normalizedValue.
- For "mrp": Ensure sourceText preserves the complete verbatim phrase (e.g. "*MRP ₹ 20.00 (Incl. of all taxes).").
- BIS IDENTIFIER RULES:
  * NEVER invent, fabricate, or guess a BIS identifier.
  * For "isi_mark": Detect presence of ISI mark text or certification stamp. Do NOT claim certification merely because the word "BIS" appears without standard mark context.
  * For "cml_number": Extract the numeric BIS CM/L license number following "CM/L" or "CML" (e.g. "123456789" from "CM/L-123456789"). Normalize to digits.
  * For "crs_registration_number": Extract the Compulsory Registration Scheme number in format "R-XXXXXXXX" (R- followed by 8 digits). Normalize to canonical format e.g. "R-12345678".
  * For "hallmark_huid": Extract the 6-character alphanumeric Hallmark Unique Identification code ONLY when surrounding text or context indicates hallmarking/HUID (e.g. "HUID ABC123", "Hallmark HUID: ABC123"). Do NOT extract generic 6-character strings as HUID without hallmarking context.
- DO NOT DECIDE LEGAL COMPLIANCE. Your role is purely factual: "What text appears on this packaging?" and "What product does this appear to be?".

INPUT RAW OCR TEXT:
"""
${rawOcrText || '[No OCR text provided]'}
"""

REQUIRED JSON OUTPUT FORMAT:
{
  "product": {
    "productName": "string or null",
    "brand": "string or null",
    "category": "e.g. Packaged Food / Biscuits, Personal Care / Soap, Household / Detergent, Beverages, etc.",
    "likelyManufacturer": "string or null",
    "confidence": 0.92,
    "status": "IDENTIFIED" | "UNCERTAIN" | "FAILED"
  },
  "declarations": [
    {
      "fieldName": "product_name | brand | manufacturer | packer | importer | address | net_quantity | mrp | unit_sale_price | date_of_manufacture | date_of_packing | best_before | customer_care | country_of_origin | batch_number | isi_mark | cml_number | hallmark_huid | crs_registration_number",
      "rawValue": "string or null",
      "normalizedValue": "string or null",
      "confidence": 0.95,
      "sourceText": "exact quote from package or null",
      "detectionStatus": "DETECTED" | "NOT_DETECTED" | "UNCLEAR" | "NOT_APPLICABLE" | "REQUIRES_REVIEW"
    }
  ]
}`

    const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [prompt]

    // Only attach image buffers if OCR raw text was not already extracted
    const hasOcrText = Boolean(rawOcrText && rawOcrText.trim().length > 0)
    if (!hasOcrText && images && images.length > 0) {
      images.slice(0, 2).forEach((img) => {
        parts.push({
          inlineData: {
            data: img.buffer.toString('base64'),
            mimeType: normalizeMimeType(img.mimeType),
          },
        })
      })
    }

    let parsed: any = null
    let lastError: Error | null = null

    for (const modelName of uniqueModels) {
      try {
        const model = this.genAI.getGenerativeModel(
          {
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1, // low temperature to minimize hallucinations
            },
          },
          { timeout: 25000 }
        )

        const response = await model.generateContent(parts)
        const rawJson = response.response.text().trim()
        if (rawJson) {
          parsed = JSON.parse(rawJson)
          console.log(`[GeminiAnalysisProvider] Analysis completed with model "${modelName}"`)
          break
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`[GeminiAnalysisProvider] Model "${modelName}" failed: ${lastError.message}`)
        continue
      }
    }

    if (!parsed) {
      console.warn('[GeminiAnalysisProvider] All Gemini models failed, falling back to heuristic analyzer:', lastError)
      const fallback = new HeuristicAnalysisProvider()
      return await fallback.analyzePackage(rawOcrText)
    }

    const productResult: ProductIdentificationResult = {
      productName: parsed.product?.productName || null,
      brand: parsed.product?.brand || null,
      category: parsed.product?.category || null,
      likelyManufacturer: parsed.product?.likelyManufacturer || null,
      confidence: typeof parsed.product?.confidence === 'number' ? parsed.product.confidence : 0.5,
      status: ['IDENTIFIED', 'UNCERTAIN', 'FAILED'].includes(parsed.product?.status)
        ? parsed.product.status
        : parsed.product?.productName ? 'IDENTIFIED' : 'UNCERTAIN',
    }

    // Map declarations and ensure all standard mandatory fields are represented
    const fieldMap = new Map<string, any>()
    if (Array.isArray(parsed.declarations)) {
      parsed.declarations.forEach((d: any) => {
        if (d.fieldName) fieldMap.set(d.fieldName, d)
      })
    }

    const validStatuses: DetectionStatus[] = [
      'DETECTED',
      'NOT_DETECTED',
      'UNCLEAR',
      'NOT_APPLICABLE',
      'REQUIRES_REVIEW',
    ]

    const mandatoryDeclarations: ExtractedDeclarationItem[] = MANDATORY_DECLARATION_FIELDS.map((spec) => {
      const item = fieldMap.get(spec.fieldName)
      if (!item || !item.rawValue) {
        return {
          fieldName: spec.fieldName,
          label: spec.label,
          rawValue: null,
          normalizedValue: null,
          confidence: 0,
          sourceText: null,
          detectionStatus: 'NOT_DETECTED' as DetectionStatus,
        }
      }

      const status = validStatuses.includes(item.detectionStatus)
        ? (item.detectionStatus as DetectionStatus)
        : 'DETECTED'

      return {
        fieldName: spec.fieldName,
        label: spec.label,
        rawValue: String(item.rawValue || '').trim(),
        normalizedValue: item.normalizedValue ? String(item.normalizedValue).trim() : null,
        confidence: typeof item.confidence === 'number' ? Math.min(Math.max(item.confidence, 0), 1) : 0.8,
        sourceText: item.sourceText ? String(item.sourceText).trim() : null,
        detectionStatus: status,
      }
    })

    const bisMap: Record<string, ExtractedDeclarationItem> = {}
    for (const spec of BIS_DECLARATION_FIELDS) {
      const item = fieldMap.get(spec.fieldName)
      if (!item || !item.rawValue) {
        bisMap[spec.fieldName] = {
          fieldName: spec.fieldName,
          label: spec.label,
          rawValue: null,
          normalizedValue: null,
          confidence: 0,
          sourceText: null,
          detectionStatus: 'NOT_DETECTED' as DetectionStatus,
        }
      } else {
        const status = validStatuses.includes(item.detectionStatus)
          ? (item.detectionStatus as DetectionStatus)
          : 'DETECTED'

        bisMap[spec.fieldName] = {
          fieldName: spec.fieldName,
          label: spec.label,
          rawValue: String(item.rawValue || '').trim(),
          normalizedValue: item.normalizedValue ? String(item.normalizedValue).trim() : null,
          confidence: typeof item.confidence === 'number' ? Math.min(Math.max(item.confidence, 0), 1) : 0.85,
          sourceText: item.sourceText ? String(item.sourceText).trim() : null,
          detectionStatus: status,
        }
      }
    }

    const declarations: ExtractedDeclarationItem[] = [
      ...mandatoryDeclarations,
      ...BIS_DECLARATION_FIELDS.map((spec) => bisMap[spec.fieldName]),
    ]

    return {
      product: productResult,
      declarations,
      isi_mark: bisMap.isi_mark.detectionStatus === 'DETECTED' ? bisMap.isi_mark : null,
      cml_number: bisMap.cml_number.detectionStatus === 'DETECTED' ? bisMap.cml_number : null,
      hallmark_huid: bisMap.hallmark_huid.detectionStatus === 'DETECTED' ? bisMap.hallmark_huid : null,
      crs_registration_number: bisMap.crs_registration_number.detectionStatus === 'DETECTED' ? bisMap.crs_registration_number : null,
    }
  }
}
