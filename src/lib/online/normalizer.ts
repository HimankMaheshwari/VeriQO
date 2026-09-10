import type {
  RawOnlineListing,
  NormalizedOnlineListing,
  NormalizedQuantity,
  NormalizedPrice,
} from './types'
import { extractNumeric } from '../rules/operators'

/**
 * Normalizes an arbitrary quantity string into an SI-standardized NormalizedQuantity.
 */
export function normalizeQuantity(raw: string | null | undefined): NormalizedQuantity | null {
  if (!raw || typeof raw !== 'string') return null
  const clean = raw.trim()
  if (!clean) return null

  const num = extractNumeric(clean)
  if (num === null || num <= 0) return null

  const lower = clean.toLowerCase()
  let unit: NormalizedQuantity['unit'] = 'unknown'
  let baseGramsOrMl: number | null = null
  let standardDisplay = `${num}`

  if (/\b(kg|kilos?|kilograms?)\b/i.test(lower)) {
    unit = 'kg'
    baseGramsOrMl = num * 1000
    standardDisplay = `${num} kg`
  } else if (/\b(gm|g|grams?)\b/i.test(lower)) {
    unit = 'g'
    baseGramsOrMl = num
    standardDisplay = `${num} g`
  } else if (/\b(mg|milligrams?)\b/i.test(lower)) {
    unit = 'mg'
    baseGramsOrMl = num / 1000
    standardDisplay = `${num} mg`
  } else if (/\b(l|ltrs?|litres?)\b/i.test(lower)) {
    unit = 'l'
    baseGramsOrMl = num * 1000
    standardDisplay = `${num} L`
  } else if (/\b(ml|milli-?litres?)\b/i.test(lower)) {
    unit = 'ml'
    baseGramsOrMl = num
    standardDisplay = `${num} ml`
  } else if (/\b(m|meters?|metres?)\b/i.test(lower)) {
    unit = 'm'
    standardDisplay = `${num} m`
  } else if (/\b(cm|centimeters?|centimetres?)\b/i.test(lower)) {
    unit = 'cm'
    standardDisplay = `${num} cm`
  } else if (/\b(mm|millimeters?|millimetres?)\b/i.test(lower)) {
    unit = 'mm'
    standardDisplay = `${num} mm`
  } else if (/\b(pieces?|pcs|pc)\b/i.test(lower)) {
    unit = 'piece'
    standardDisplay = `${num} piece`
  } else if (/\b(units?|items?|packs?|count|n|no)\b/i.test(lower)) {
    unit = 'units'
    standardDisplay = `${num} units`
  }

  return {
    raw: clean,
    numericValue: num,
    unit,
    standardDisplay,
    baseGramsOrMl,
  }
}

/**
 * Normalizes an arbitrary price string into decimal coinage in INR.
 */
export function normalizePrice(raw: string | null | undefined): NormalizedPrice | null {
  if (!raw || typeof raw !== 'string') return null
  const clean = raw.trim()
  if (!clean) return null

  // Remove commas used in formatting (e.g. "1,499.00" -> "1499.00")
  const stripped = clean.replace(/,/g, '')
  const num = extractNumeric(stripped)
  if (num === null || num <= 0) return null

  return {
    raw: clean,
    numericValue: Math.round(num * 100) / 100,
    currency: 'INR',
    formatted: `₹ ${num.toFixed(2)}`,
  }
}

/**
 * Normalizes corporate, manufacturer, or brand names.
 */
export function normalizeEntityName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  let clean = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\w\s.,&-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean || clean.length < 2) return null

  // Standardize common corporate suffixes
  clean = clean.replace(/\bprivate\s+limited\b/gi, 'Pvt Ltd')
  clean = clean.replace(/\bpvt\.?\s*ltd\.?\b/gi, 'Pvt Ltd')
  clean = clean.replace(/\blimited\b/gi, 'Ltd')
  clean = clean.replace(/\bltd\.?\b/gi, 'Ltd')
  clean = clean.replace(/\bincorporated\b/gi, 'Inc')
  clean = clean.replace(/\binc\.?\b/gi, 'Inc')
  clean = clean.replace(/\bcorporation\b/gi, 'Corp')
  clean = clean.replace(/\bcorp\.?\b/gi, 'Corp')

  return clean.trim()
}

/**
 * Standardizes Country of Origin names to canonical representations.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const clean = raw.trim().toLowerCase()
  if (!clean) return null

  if (/^(in|ind|india|bharat)$/i.test(clean)) return 'India'
  if (/^(de|deu|germany|deutschland)$/i.test(clean)) return 'Germany'
  if (/^(us|usa|united states|united states of america)$/i.test(clean)) return 'United States'
  if (/^(cn|chn|china|prc)$/i.test(clean)) return 'China'
  if (/^(jp|jpn|japan)$/i.test(clean)) return 'Japan'
  if (/^(gb|gbr|uk|united kingdom|great britain|england)$/i.test(clean)) return 'United Kingdom'
  if (/^(fr|fra|france)$/i.test(clean)) return 'France'
  if (/^(it|ita|italy)$/i.test(clean)) return 'Italy'
  if (/^(ch|che|switzerland)$/i.test(clean)) return 'Switzerland'
  if (/^(kr|kor|south korea|korea)$/i.test(clean)) return 'South Korea'
  if (/^(tw|twn|taiwan)$/i.test(clean)) return 'Taiwan'
  if (/^(th|tha|thailand)$/i.test(clean)) return 'Thailand'
  if (/^(vn|vnm|vietnam)$/i.test(clean)) return 'Vietnam'
  if (/^(id|idn|indonesia)$/i.test(clean)) return 'Indonesia'
  if (/^(my|mys|malaysia)$/i.test(clean)) return 'Malaysia'
  if (/^(bd|bgd|bangladesh)$/i.test(clean)) return 'Bangladesh'
  if (/^(lk|lka|sri lanka)$/i.test(clean)) return 'Sri Lanka'
  if (/^(np|npl|nepal)$/i.test(clean)) return 'Nepal'

  // Default: capitalize words
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normalizes URL by removing tracking parameters and standardizing protocol/host.
 */
export function normalizeUrl(rawUrl: string): { canonicalUrl: string; domain: string } {
  try {
    const parsed = new URL(rawUrl.trim())
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'ref_',
      'tag',
      'fbclid',
      'gclid',
      'msclkid',
      'pf_rd_r',
      'pf_rd_p',
    ]

    for (const param of trackingParams) {
      parsed.searchParams.delete(param)
    }

    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '')
    return {
      canonicalUrl: parsed.toString(),
      domain,
    }
  } catch {
    return {
      canonicalUrl: rawUrl,
      domain: 'unknown',
    }
  }
}

/**
 * Normalizes an entire RawOnlineListing into a NormalizedOnlineListing.
 */
export function normalizeOnlineListing(raw: RawOnlineListing): NormalizedOnlineListing {
  const { canonicalUrl, domain } = normalizeUrl(raw.sourceUrl)

  const title = raw.title ? raw.title.trim() : null
  const brand = normalizeEntityName(raw.brand)
  const genericName = raw.genericName ? raw.genericName.trim() : null

  const manufacturer = normalizeEntityName(raw.manufacturer)
  const packer = normalizeEntityName(raw.packer)
  const importer = normalizeEntityName(raw.importer)
  const countryOfOrigin = normalizeCountry(raw.countryOfOrigin)

  const netQuantity = normalizeQuantity(raw.netQuantity)
  const mrp = normalizePrice(raw.mrp)
  const sellingPrice = normalizePrice(raw.sellingPrice)
  const unitSalePrice = raw.unitSalePrice ? raw.unitSalePrice.trim() : null

  const consumerCare = raw.consumerCare ? raw.consumerCare.trim() : null
  const dateInfo = raw.dateOfPackingOrExpiry ? raw.dateOfPackingOrExpiry.trim() : null
  const images = (raw.images || []).filter(Boolean).map((s) => s.trim())

  let confidence = 0.8
  if (raw.extractionSource === 'json_ld') confidence = 0.95
  else if (raw.extractionSource === 'mixed') confidence = 0.9
  else if (raw.extractionSource === 'dom_tables') confidence = 0.85
  else if (raw.extractionSource === 'meta_tags') confidence = 0.75

  return {
    sourceUrl: raw.sourceUrl,
    canonicalUrl,
    domain,
    retrievedAt: raw.retrievedAt || new Date(),
    title,
    brand,
    genericName,
    manufacturer,
    packer,
    importer,
    countryOfOrigin,
    netQuantity,
    mrp,
    sellingPrice,
    unitSalePrice,
    consumerCare,
    dateInfo,
    images,
    extractionSource: raw.extractionSource || 'metadata',
    confidence,
  }
}
