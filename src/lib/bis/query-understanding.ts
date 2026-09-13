import { classifyBisIntent } from './intent-classifier'
import type { StructuredBisQuery } from './types'

// Common product-to-category mappings
const PRODUCT_CATEGORY_MAP: Array<{
  pattern: RegExp
  productName: string
  category: string
}> = [
  {
    pattern: /\bpackaged\s*drinking\s*water\b/i,
    productName: 'packaged drinking water',
    category: 'Food & Beverages',
  },
  {
    pattern: /\b(?:drinking\s*water|potable\s*water|piped\s*water)\b/i,
    productName: 'drinking water',
    category: 'Water & Environment',
  },
  {
    pattern: /\b(?:gold|jewellery|jewelry|gold\s*artefacts?|silver)\b/i,
    productName: 'gold jewellery',
    category: 'Precious Metals & Jewellery',
  },
  {
    pattern: /\b(?:toys?|children\s*toys?)\b/i,
    productName: 'toys',
    category: 'Toys & Children Products',
  },
  {
    pattern: /\b(?:laptops?|mobiles?|phones?|power\s*adapters?|it\s*equipment|electronics)\b/i,
    productName: 'information technology equipment',
    category: 'Electronics & IT',
  },
]

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'what',
  'which',
  'where',
  'how',
  'is',
  'are',
  'does',
  'do',
  'tell',
  'me',
  'about',
  'for',
  'to',
  'in',
  'of',
  'applies',
  'apply',
  'please',
  'can',
  'you',
  'give',
  'info',
  'information',
  'standard',
  'standards',
  'specification',
  'specifications',
  'find',
  'list',
  'show',
  'any',
  'some',
  'exist',
  'exists',
])

/**
 * Parses and normalizes a user's natural language query into a structured query representation.
 */
export function understandBisQuery(rawQuery: string): StructuredBisQuery {
  const query = (rawQuery || '').trim()
  const intentResult = classifyBisIntent(query)

  // 1. Extract Indian Standard number if explicitly mentioned
  let standardNumber: string | null = null
  const isMatch = query.match(/\b(IS\s*[-/:]?\s*[0-9]{3,6}(?:\s*\([^)]+\))?)\b/i)
  if (isMatch) {
    // Normalize e.g. "IS-14543" or "is 14543" -> "IS 14543"
    standardNumber = isMatch[1].replace(/^is[-/:]?/i, 'IS ').replace(/\s+/g, ' ').trim()
  }

  // 2. Identify known product name and category
  let productName: string | null = null
  let category: string | null = null

  for (const entry of PRODUCT_CATEGORY_MAP) {
    if (entry.pattern.test(query)) {
      productName = entry.productName
      category = entry.category
      break
    }
  }

  // 3. Extract keywords (filtering common question/filler stop words)
  const tokens = query
    .replace(/[^\w\s()-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t.toLowerCase()))

  const keywords = Array.from(new Set(tokens))

  // 4. Normalized query for search matching
  const normalizedQuery = keywords.join(' ').trim() || query

  return {
    originalQuery: query,
    normalizedQuery,
    productName,
    category,
    intent: intentResult.intent,
    keywords,
    standardNumber,
  }
}
