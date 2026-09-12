import type { BisIntentResult, BisQueryIntent } from './types'

/**
 * Lightweight, deterministic intent classifier for BIS queries.
 * Prioritizes fast, zero-cost heuristic classification with high precision.
 */
export function classifyBisIntent(queryText: string): BisIntentResult {
  const text = (queryText || '').trim().toLowerCase()

  if (!text || text.length < 3) {
    return { intent: 'UNKNOWN', confidence: 0.1 }
  }

  // Check for presence of an Indian Standard number pattern (e.g., "IS 14543", "IS 13252")
  const hasStandardNumber = /\bis\s*[-/:]?\s*[0-9]{3,6}(?:\s*\([^)]+\))?\b/i.test(text)

  // 1. Hallmarking & Precious Metals queries
  if (
    /\b(?:huid|hallmark(?:ed|ing)?|assaying|purity\s*mark|carat|karat|22k916|18k750|24k999)\b/i.test(
      text
    )
  ) {
    return { intent: 'HALLMARKING', confidence: 0.95 }
  }

  // 2. Laboratory Discovery
  if (
    /\b(?:lab|labs|laboratory|laboratories|testing\s*cent(?:er|re)s?|testing\s*facilit(?:y|ies)|approved\s*labs?|recognized\s*labs?)\b/i.test(
      text
    )
  ) {
    return { intent: 'LABORATORY_DISCOVERY', confidence: 0.92 }
  }

  // 3. Testing Requirements & Test Parameters
  if (
    /\b(?:test(?:ing)?\s*(?:requirements?|parameters?|methods?|procedures?)|quality\s*limits?|testing\s*standards?)\b/i.test(
      text
    )
  ) {
    return { intent: 'TESTING_REQUIREMENTS', confidence: 0.92 }
  }

  // 4. Product Regulatory Mandate / Applicability
  if (
    /\b(?:is\s*mandatory|is\s*compulsory|mandatory\s*for|compulsory\s*for|qco\s*applicable|under\s*qco|require(?:s)?\s*mandatory|do\s*i\s*need\s*bis)\b/i.test(
      text
    )
  ) {
    return { intent: 'PRODUCT_ANALYSIS', confidence: 0.92 }
  }

  // 5. Certification Guidance & Application Process
  if (
    /\b(?:how\s*to\s*(?:get|apply|obtain|register)|certification\s*process|apply\s*for\s*(?:isi|crs|bis)|licens(?:e|ing)\s*process|steps\s*to\s*get)\b/i.test(
      text
    )
  ) {
    if (/\b(?:time|days|duration|fee|cost|timeline|audit\s*steps|renewal)\b/i.test(text)) {
      return { intent: 'BIS_PROCESS', confidence: 0.9 }
    }
    return { intent: 'CERTIFICATION_GUIDANCE', confidence: 0.92 }
  }

  // 6. Consumer Verification & Fraud
  if (
    /\b(?:consumer|verify\s*(?:isi|mark|huid|cml)|fake\s*isi|check\s*(?:isi|huid)|genuine\s*bis|complain|complaint)\b/i.test(
      text
    )
  ) {
    return { intent: 'CONSUMER_QUERY', confidence: 0.9 }
  }

  // 7. General BIS Knowledge
  if (
    /\b(?:what\s*is\s*bis|about\s*bis|bureau\s*of\s*indian\s*standards|functions?\s*of\s*bis|role\s*of\s*bis)\b/i.test(
      text
    )
  ) {
    return { intent: 'GENERAL_BIS', confidence: 0.92 }
  }

  // 8. Standard Details (if explicit IS number present with descriptive phrasing)
  if (hasStandardNumber) {
    if (/\b(?:related|similar|alternatives?|other\s*standards?)\b/i.test(text)) {
      return { intent: 'RELATED_STANDARDS', confidence: 0.92 }
    }
    if (/\b(?:technical|limits?|thresholds?|specifications?|tolerance)\b/i.test(text)) {
      return { intent: 'TECHNICAL_QUERY', confidence: 0.9 }
    }
    // "Tell me about IS 14543", "IS 10500 summary", "Details of IS 15820"
    return { intent: 'STANDARD_DETAILS', confidence: 0.95 }
  }

  // 9. Standard Discovery (searching which standard applies to a commodity)
  if (
    /\b(?:which\s*standard|what\s*standard|standard\s*(?:applies|for|governs)|standards?\s*for|find\s*standard|bis\s*for)\b/i.test(
      text
    )
  ) {
    return { intent: 'STANDARD_DISCOVERY', confidence: 0.94 }
  }

  // 10. Technical Query
  if (
    /\b(?:technical\s*(?:specs?|specifications?)|tolerance\s*limits?|chemical\s*composition|max\s*limits?|permissible\s*limits?)\b/i.test(
      text
    )
  ) {
    return { intent: 'TECHNICAL_QUERY', confidence: 0.88 }
  }

  // 11. Keyword-based Commodity matching defaulting to Discovery
  const COMMODITY_KEYWORDS = [
    'water',
    'toy',
    'toys',
    'gold',
    'jewellery',
    'jewelry',
    'laptop',
    'mobile',
    'adapter',
    'electronics',
    'food',
    'packaged',
    'beverage',
    'cement',
    'steel',
    'helmet',
    'tyre',
    'plywood',
  ]

  const hasCommodityKeyword = COMMODITY_KEYWORDS.some((kw) =>
    new RegExp(`\\b${kw}\\b`, 'i').test(text)
  )

  if (hasCommodityKeyword) {
    return { intent: 'STANDARD_DISCOVERY', confidence: 0.85 }
  }

  // 12. Non-BIS / Unknown queries
  return { intent: 'UNKNOWN', confidence: 0.25 }
}
