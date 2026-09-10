import { GoogleGenerativeAI } from '@google/generative-ai'
import type { OcrService, OcrImageInput, OcrResult } from './types'

function normalizeMimeType(mime: string): string {
  const lower = (mime || '').toLowerCase().trim()
  if (lower === 'image/jpg' || lower === 'image/pjpeg') return 'image/jpeg'
  if (lower === 'image/x-png') return 'image/png'
  if (lower === 'image/webp') return 'image/webp'
  if (lower === 'image/heic') return 'image/heic'
  return lower || 'image/jpeg'
}

export class GeminiOcrProvider implements OcrService {
  readonly providerName = 'gemini-vision-ocr'
  private genAI: GoogleGenerativeAI
  private primaryModel: string

  constructor(apiKey: string, modelName = 'gemini-flash-latest') {
    this.genAI = new GoogleGenerativeAI(apiKey.trim())
    this.primaryModel = process.env.GEMINI_OCR_MODEL || process.env.GEMINI_MODEL || modelName
  }

  async extractText(images: OcrImageInput[]): Promise<OcrResult> {
    if (images.length === 0) {
      return { rawText: '', images: [] }
    }

    const candidateModels = [
      this.primaryModel,
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemma-4-26b-a4b-it',
    ]
    const uniqueModels = Array.from(new Set(candidateModels))

    const imageResults: { imageId: string; text: string; confidence?: number }[] = []

    for (const img of images) {
      const mimeType = normalizeMimeType(img.mimeType)
      const base64Data = img.buffer.toString('base64')

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      }

      const prompt = `You are a high-precision OCR transcription engine for packaged commodities sold in India under the Legal Metrology Act, 2009 and Packaged Commodities Rules.
Transcribe ALL visible text on this packaging image verbatim.

Extract all visible sections, including:
1. Brand name, commodity / product name, sub-brand, variety
2. Net quantity / net weight / volume with units (e.g. 100g, 250 g, 500 ml, 1 kg, 1 N, 5 pieces)
3. Maximum Retail Price (MRP), price figures, "incl. of all taxes"
4. Dates: Date of manufacture (Mfg / Mfd), Date of packaging (Pkg / Pkd), Expiry date, Best Before date / period
5. Manufacturer / Packer / Importer: Company name, factory address, registered office, complete physical address
6. Consumer Care / Customer Helpline details: Toll-free number, phone, email address, website, physical postal address
7. Country of Origin (e.g. "Made in India", "Country of Origin: India")
8. Batch number, lot number, code stamps, barcode numbers
9. Nutritional information table, ingredient list, vegetarian / green dot mark, non-veg red dot mark, FSSAI license numbers
10. Any regional / bilingual Hindi text printed on the packaging

Output ONLY the exact transcribed text as visible on the packaging. Do not invent text. Do not add conversational commentary.`

      let extracted = ''
      let lastError: Error | null = null

      for (const modelName of uniqueModels) {
        try {
          const model = this.genAI.getGenerativeModel(
            {
              model: modelName,
              generationConfig: {
                temperature: 0.0,
              },
            },
            { timeout: 30000 }
          )

          const response = await model.generateContent([prompt, imagePart])
          const text = response.response.text().trim()
          if (text) {
            extracted = text
            console.log(`[GeminiOcrProvider] Successfully transcribed image ${img.imageId} with model "${modelName}" (${text.length} chars)`)
            break
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          console.warn(`[GeminiOcrProvider] Model "${modelName}" attempt failed: ${lastError.message}`)
          continue
        }
      }

      if (extracted) {
        imageResults.push({
          imageId: img.imageId,
          text: extracted,
          confidence: 0.95,
        })
      } else {
        const errorDetail = lastError?.message || 'No visible text could be recognized'
        imageResults.push({
          imageId: img.imageId,
          text: '',
          confidence: 0,
        })
        console.warn(`[GeminiOcrProvider] All candidate models failed for image ${img.imageId}: ${errorDetail}`)
      }
    }

    const validTexts = imageResults.filter((r) => r.text.length > 0)
    const combinedText = validTexts
      .map((r, i) => `--- [Packaging Surface ${i + 1}] ---\n${r.text}`)
      .join('\n\n')

    return {
      rawText: combinedText,
      images: imageResults,
    }
  }
}
