/**
 * Normalization utilities for SIH 2026 PS107:
 * BIS Knowledge Base & Retrieval Foundation.
 *
 * Preserves Indian Standards terminology, IS notations, clause hierarchies,
 * units, and statutory limits while standardizing text for deterministic retrieval.
 */

// Stop words that do NOT carry statutory or technical weight
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do',
  'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'let\'s', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves',
])

// Domain terms that must NEVER be stripped even if short
const PRESERVED_DOMAIN_TERMS = new Set([
  'is', 'bis', 'qco', 'cml', 'crs', 'isi', 'huid', 'ph', 'pb', 'as', 'fe', 'cu', 'zn',
  'mg', 'kg', 'mm', 'cm', 'v', 'a', 'w', 'hz', 'kv', 'ac', 'dc',
])

/**
 * Normalizes an arbitrary text string for consistent indexing and chunk comparison:
 * - Collapses multiple spaces, tabs, and newlines
 * - Normalizes unicode characters and dashes
 * - Preserves technical punctuation (hyphens, dots in clause numbers and units)
 */
export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-') // Normalize dashes
    .replace(/[\u2018\u2019]/g, "'") // Normalize single quotes
    .replace(/[\u201C\u201D]/g, '"') // Normalize double quotes
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalizes query string for lexical/retrieval search:
 * - Lowercases while maintaining recognizable IS and Clause patterns
 * - Trims and cleans redundant whitespace
 */
export function normalizeQuery(query: string): string {
  if (!query) return ''
  return normalizeText(query).toLowerCase()
}

/**
 * Extracts and canonicalizes standard numbers (e.g., "IS 10500", "IS 10500:2012", "IS 1293")
 * Handles variations like "is 10500", "IS10500", "is:10500:2012".
 */
export function extractStandardNumbers(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\bIS\s*[:\s-]?\s*(\d+)(?:\s*\([^)]+\))?(?::(\d{4}))?\b/gi) || []
  return Array.from(
    new Set(
      matches.map((m) => {
        // Standardize to "IS <digits>[:<year>]"
        const cleaned = m.toUpperCase().replace(/\s*[:\s-]\s*/g, ' ').trim()
        const parts = cleaned.split(' ')
        if (parts.length >= 2) {
          return `${parts[0]} ${parts.slice(1).join('')}`
        }
        return cleaned
      })
    )
  )
}

/**
 * Extracts clause numbers from queries or text (e.g. "Clause 4.1", "Table 1", "cl. 5.2.1", "clause 4")
 */
export function extractClauseIdentifiers(text: string): string[] {
  if (!text) return []
  const regexes = [
    /\b(?:clause|cl\.?)\s*([0-9]+(?:\.[0-9]+)*)\b/gi,
    /\btable\s*([0-9]+(?:\.[0-9]+)*|[a-z0-9]+)\b/gi,
    /\bsection\s*([0-9]+(?:\.[0-9]+)*)\b/gi,
  ]

  const results: string[] = []
  for (const rx of regexes) {
    let match: RegExpExecArray | null
    while ((match = rx.exec(text)) !== null) {
      if (match[1]) results.push(match[1].trim())
    }
  }

  // Also check for raw dotted numbers if preceded/followed by boundaries (e.g., "4.1")
  const dotted = text.match(/\b\d+\.\d+(?:\.\d+)*\b/g) || []
  for (const d of dotted) {
    if (!results.includes(d)) results.push(d)
  }

  return Array.from(new Set(results))
}

/**
 * Tokenizes text into search tokens, filtering out generic stopwords while
 * strictly retaining statutory/technical terminology.
 */
export function tokenizeAndFilter(text: string): string[] {
  if (!text) return []
  const normalized = normalizeText(text).toLowerCase()

  // Replace punctuation except dots inside numbers and hyphens
  const tokens = normalized
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)

  return tokens.filter((token) => {
    // Strip trailing/leading dots or hyphens
    const clean = token.replace(/^[.-]+|[.-]+$/g, '')
    if (!clean) return false
    if (PRESERVED_DOMAIN_TERMS.has(clean)) return true
    if (STOP_WORDS.has(clean)) return false
    return clean.length >= 2 || !isNaN(Number(clean))
  })
}

/**
 * Calculates a simple character count and rough token count (approx 4 chars per token)
 */
export function computeTokenMetadata(text: string): { characterCount: number; tokenCount: number } {
  const characterCount = text.length
  // Rule of thumb: ~4 characters per token in English technical text
  const tokenCount = Math.max(1, Math.ceil(characterCount / 4))
  return { characterCount, tokenCount }
}
