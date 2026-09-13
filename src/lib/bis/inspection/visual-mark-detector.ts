/**
 * VisualBisMarkDetector — Additive vision analysis for BIS physical marks.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. DOES NOT REPLACE OCR.
 * 2. DOES NOT DUPLICATE THE OCR PIPELINE.
 * 3. Operates strictly on existing uploaded image buffers.
 * 4. Distinguishes DETECTED / NOT_DETECTED / UNCERTAIN.
 * 5. Visual mark presence NEVER by itself establishes legal compliance.
 * 6. Graceful degradation: returns UNCERTAIN when offline or GEMINI_API_KEY is absent.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey } from '@/lib/ocr/env'
import type { DetectionState } from '@/types/bis-inspection'

export interface VisualMarkDetectionInput {
  imageBuffers: Array<{
    buffer: Buffer
    mimeType: string
    imageId?: string
  }>
  isDemoRecord?: boolean
}

export interface VisualMarkDetectionResult {
  markType: 'ISI_MARK' | 'CRS_MARK' | 'HALLMARK' | 'NONE'
  status: DetectionState
  confidence: number
  visualDescription: string
  detectedStandardText?: string | null
  detectedLicenseText?: string | null
  isDemoRecord: boolean
}

export class VisualBisMarkDetector {
  private primaryModel: string

  constructor() {
    this.primaryModel = process.env.GEMINI_OCR_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest'
  }

  /**
   * Evaluates packaging images specifically for graphical BIS certification marks
   * (e.g., the rectangular ISI mark frame, CRS logo, or Hallmark purity triangle).
   */
  async detectVisualMark(input: VisualMarkDetectionInput): Promise<VisualMarkDetectionResult> {
    const isDemoRecord = input.isDemoRecord ?? false

    if (!input.imageBuffers || input.imageBuffers.length === 0) {
      return {
        markType: 'NONE',
        status: 'NOT_DETECTED',
        confidence: 0,
        visualDescription: 'No uploaded images available for visual mark analysis',
        isDemoRecord,
      }
    }

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      // Offline fallback: without vision API, mark is marked UNCERTAIN
      return {
        markType: 'NONE',
        status: 'UNCERTAIN',
        confidence: 0,
        visualDescription: 'Visual mark analysis unavailable in offline mode without GEMINI_API_KEY; relying on text OCR',
        isDemoRecord,
      }
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim())
      const model = genAI.getGenerativeModel(
        {
          model: this.primaryModel,
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        },
        { timeout: 25000 }
      )

      // Take the first 2 images to conserve quota and processing time
      const targetImages = input.imageBuffers.slice(0, 2)
      const imageParts = targetImages.map((img) => ({
        inlineData: {
          data: img.buffer.toString('base64'),
          mimeType: img.mimeType || 'image/jpeg',
        },
      }))

      const prompt = `You are a forensic packaging inspector inspecting Indian consumer goods for Bureau of Indian Standards (BIS) certification marks.
Examine the attached image(s) ONLY for the physical graphical appearance of:
1. ISI Mark (the official rectangular frame containing the stylized "IS" symbol, with the Indian Standard number above and the CM/L number below).
2. CRS Registration Mark (the stylized Bureau of Indian Standards CRS monogram).
3. BIS Hallmark (the triangular mark accompanied by purity in carats/fineness and 6-character HUID).

Analyze whether a physical graphical certification logo/mark is present.
Respond ONLY with this exact JSON schema:
{
  "markType": "ISI_MARK" | "CRS_MARK" | "HALLMARK" | "NONE",
  "status": "DETECTED" | "NOT_DETECTED" | "UNCERTAIN",
  "confidence": 0.0 to 1.0,
  "visualDescription": "short description of visual findings",
  "detectedStandardText": "IS number if printed near mark or null",
  "detectedLicenseText": "CML / CRS number if printed near mark or null"
}
Do not include conversational text or markdown code blocks.`

      const response = await model.generateContent([prompt, ...imageParts])
      const rawText = response.response.text().trim()

      const parsed = JSON.parse(rawText)
      return {
        markType: ['ISI_MARK', 'CRS_MARK', 'HALLMARK'].includes(parsed.markType) ? parsed.markType : 'NONE',
        status: ['DETECTED', 'NOT_DETECTED', 'UNCERTAIN'].includes(parsed.status) ? parsed.status : 'UNCERTAIN',
        confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        visualDescription: parsed.visualDescription || 'Visual mark inspected',
        detectedStandardText: parsed.detectedStandardText || null,
        detectedLicenseText: parsed.detectedLicenseText || null,
        isDemoRecord,
      }
    } catch (err) {
      // Safe degradation: error during vision analysis degrades to UNCERTAIN
      return {
        markType: 'NONE',
        status: 'UNCERTAIN',
        confidence: 0,
        visualDescription: 'Visual mark analysis completed with uncertain outcome; relying on textual OCR declarations',
        isDemoRecord,
      }
    }
  }
}

export const defaultVisualBisMarkDetector = new VisualBisMarkDetector()
