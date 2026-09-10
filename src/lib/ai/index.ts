import type { ProductAnalysisService } from './types'
import { GeminiAnalysisProvider } from './gemini-analyzer'
import { HeuristicAnalysisProvider } from './heuristic-analyzer'
import { getGeminiApiKey } from '@/lib/ocr/env'

export function getProductAnalysisService(): ProductAnalysisService {
  const apiKey = getGeminiApiKey()
  const provider = process.env.AI_ANALYZER_PROVIDER?.toLowerCase() || 'gemini'

  if (apiKey && provider === 'gemini') {
    return new GeminiAnalysisProvider(apiKey)
  }

  return new HeuristicAnalysisProvider()
}

export * from './types'
