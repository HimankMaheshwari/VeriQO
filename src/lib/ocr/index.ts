import type { OcrService } from './types'
import { GeminiOcrProvider } from './gemini-ocr'
import { FallbackOcrProvider } from './fallback-ocr'
import { getGeminiApiKey } from './env'

export function getOcrService(): OcrService {
  const apiKey = getGeminiApiKey()
  const provider = process.env.OCR_PROVIDER?.toLowerCase() || 'gemini'

  if (apiKey && provider === 'gemini') {
    return new GeminiOcrProvider(apiKey)
  }

  return new FallbackOcrProvider()
}

export * from './types'
export { getGeminiApiKey } from './env'
