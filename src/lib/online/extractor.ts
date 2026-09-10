import type { RawOnlineListing } from './types'

/**
 * Extracts structured product fields from HTML content using:
 * 1. JSON-LD Schema.org Product markup
 * 2. OpenGraph and Meta tags
 * 3. Structured specification tables/lists
 */
export function extractRawListingFromHtml(
  html: string,
  sourceUrl: string
): RawOnlineListing {
  let domain = ''
  try {
    domain = new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    domain = 'unknown'
  }

  const result: RawOnlineListing = {
    sourceUrl,
    domain,
    retrievedAt: new Date(),
    rawFields: {},
    images: [],
  }

  // 1. JSON-LD Extraction (Highest fidelity)
  const jsonLdData = extractJsonLdProduct(html)
  if (jsonLdData) {
    result.title = jsonLdData.name || null
    result.brand = extractEntityName(jsonLdData.brand)
    result.manufacturer = extractEntityName(jsonLdData.manufacturer)
    result.countryOfOrigin = extractEntityName(jsonLdData.countryOfOrigin)
    result.genericName = jsonLdData.category || jsonLdData.disambiguatingDescription || null

    if (jsonLdData.weight) {
      result.netQuantity = typeof jsonLdData.weight === 'object' ? `${jsonLdData.weight.value || ''} ${jsonLdData.weight.unitCode || ''}`.trim() : String(jsonLdData.weight)
    }

    // Offers / Pricing
    const offer = Array.isArray(jsonLdData.offers) ? jsonLdData.offers[0] : jsonLdData.offers
    if (offer) {
      if (offer.price !== undefined) {
        result.sellingPrice = String(offer.price)
      }
      if (offer.maxPrice !== undefined || offer.highPrice !== undefined) {
        result.mrp = String(offer.maxPrice ?? offer.highPrice)
      } else if (offer.priceSpecification) {
        const spec = offer.priceSpecification
        if (spec.priceType?.toLowerCase()?.includes('list') || spec.priceType?.toLowerCase()?.includes('mrp')) {
          result.mrp = String(spec.price)
        }
      }
    }

    if (jsonLdData.image) {
      if (Array.isArray(jsonLdData.image)) {
        result.images = jsonLdData.image.map(String)
      } else if (typeof jsonLdData.image === 'string') {
        result.images = [jsonLdData.image]
      }
    }

    result.extractionSource = 'json_ld'
  }

  // 2. OpenGraph & Meta Tags (Fills missing fields)
  const metaTags = extractMetaTags(html)
  if (!result.title && metaTags['og:title']) {
    result.title = metaTags['og:title']
  }
  if (!result.title && metaTags['title']) {
    result.title = metaTags['title']
  }

  if (!result.brand && metaTags['product:brand']) {
    result.brand = metaTags['product:brand']
  }
  if (!result.brand && metaTags['brand']) {
    result.brand = metaTags['brand']
  }

  if (!result.sellingPrice && metaTags['product:price:amount']) {
    result.sellingPrice = metaTags['product:price:amount']
  }
  if (!result.sellingPrice && metaTags['og:price:amount']) {
    result.sellingPrice = metaTags['og:price:amount']
  }

  if (result.images && result.images.length === 0 && metaTags['og:image']) {
    result.images = [metaTags['og:image']]
  }

  // 3. Specification Table / Key-Value Extraction
  const specFields = extractSpecificationAttributes(html)
  for (const [k, v] of Object.entries(specFields)) {
    result.rawFields![k] = v
  }

  if (!result.netQuantity && (specFields['net_quantity'] || specFields['net_weight'] || specFields['weight'])) {
    result.netQuantity = specFields['net_quantity'] || specFields['net_weight'] || specFields['weight']
  }

  if (!result.countryOfOrigin && (specFields['country_of_origin'] || specFields['origin'])) {
    result.countryOfOrigin = specFields['country_of_origin'] || specFields['origin']
  }

  if (!result.manufacturer && (specFields['manufacturer'] || specFields['manufactured_by'])) {
    result.manufacturer = specFields['manufacturer'] || specFields['manufactured_by']
  }

  if (!result.packer && (specFields['packer'] || specFields['packed_by'])) {
    result.packer = specFields['packer'] || specFields['packed_by']
  }

  if (!result.importer && (specFields['importer'] || specFields['imported_by'])) {
    result.importer = specFields['importer'] || specFields['imported_by']
  }

  if (!result.mrp && (specFields['mrp'] || specFields['maximum_retail_price'])) {
    result.mrp = specFields['mrp'] || specFields['maximum_retail_price']
  }

  if (!result.unitSalePrice && (specFields['unit_sale_price'] || specFields['usp'])) {
    result.unitSalePrice = specFields['unit_sale_price'] || specFields['usp']
  }

  if (!result.consumerCare && (specFields['consumer_care'] || specFields['customer_care'])) {
    result.consumerCare = specFields['consumer_care'] || specFields['customer_care']
  }

  if (!result.genericName && (specFields['generic_name'] || specFields['common_name'])) {
    result.genericName = specFields['generic_name'] || specFields['common_name']
  }

  if (!result.extractionSource) {
    result.extractionSource = Object.keys(specFields).length > 0 ? 'dom_tables' : 'meta_tags'
  } else if (Object.keys(specFields).length > 0) {
    result.extractionSource = 'mixed'
  }

  return result
}

/**
 * Extracts and parses JSON-LD script tags looking for Product definitions.
 */
function extractJsonLdProduct(html: string): any {
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const product = findProductInJsonLd(parsed)
      if (product) return product
    } catch {
      // Ignore JSON parse errors in script tags
    }
  }

  return null
}

function findProductInJsonLd(obj: any): any {
  if (!obj || typeof obj !== 'object') return null

  if (obj['@type'] === 'Product' || obj['@type'] === 'IndividualProduct' || obj['@type'] === 'ProductGroup') {
    return obj
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findProductInJsonLd(item)
      if (found) return found
    }
  }

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findProductInJsonLd(item)
      if (found) return found
    }
  }

  return null
}

function extractEntityName(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object' && val.name) return String(val.name).trim()
  return null
}

/**
 * Extracts all meta and OpenGraph tags from HTML.
 */
function extractMetaTags(html: string): Record<string, string> {
  const metaRegex = /<meta\s+[^>]*>/gi
  const results: Record<string, string> = {}

  let match: RegExpExecArray | null
  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[0]
    const nameMatch = /name=["']([^"']+)["']/i.exec(tag) || /property=["']([^"']+)["']/i.exec(tag)
    const contentMatch = /content=["']([^"']*)["']/i.exec(tag)

    if (nameMatch && contentMatch) {
      results[nameMatch[1].toLowerCase()] = contentMatch[1].trim()
    }
  }

  // Also check <title>
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html)
  if (titleMatch) {
    results['title'] = titleMatch[1].trim()
  }

  return results
}

/**
 * Extracts key-value pairs from standard table rows, definition lists, or span specifications.
 */
function extractSpecificationAttributes(html: string): Record<string, string> {
  const specs: Record<string, string> = {}

  // Pattern 1: <tr><th/td>Label</th/td><td/th>Value</td></tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null

  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = trMatch[1].match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)
    if (cells && cells.length >= 2) {
      const rawKey = stripHtmlTags(cells[0])
      const rawVal = stripHtmlTags(cells[1])
      const normKey = normalizeSpecKey(rawKey)
      if (normKey && rawVal) {
        specs[normKey] = rawVal
      }
    }
  }

  // Pattern 2: Key-value spans or divs (e.g. class="key">Country of Origin</span><span class="value">India</span>)
  const kvRegex = /<(span|div|dt|p)[^>]*class=["'][^"']*(label|key|title|spec-name)[^"']*["'][^>]*>([\s\S]*?)<\/\1>\s*<(span|div|dd|p)[^>]*class=["'][^"']*(value|spec-value|desc)[^"']*["'][^>]*>([\s\S]*?)<\/\4>/gi
  let kvMatch: RegExpExecArray | null

  while ((kvMatch = kvRegex.exec(html)) !== null) {
    const rawKey = stripHtmlTags(kvMatch[3])
    const rawVal = stripHtmlTags(kvMatch[6])
    const normKey = normalizeSpecKey(rawKey)
    if (normKey && rawVal && !specs[normKey]) {
      specs[normKey] = rawVal
    }
  }

  return specs
}

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeSpecKey(key: string): string | null {
  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()

  if (/country\s+of\s+origin|origin/i.test(clean)) return 'country_of_origin'
  if (/net\s+(quantity|wt|weight|content|vol|volume)/i.test(clean)) return 'net_quantity'
  if (/^weight$|^volume$/i.test(clean)) return 'net_weight'
  if (/manufacturer|manufactured\s+by/i.test(clean)) return 'manufacturer'
  if (/packer|packed\s+by/i.test(clean)) return 'packer'
  if (/importer|imported\s+by/i.test(clean)) return 'importer'
  if (/max(imum)?\s+retail\s+price|mrp/i.test(clean)) return 'mrp'
  if (/unit\s+sale\s+price|usp/i.test(clean)) return 'unit_sale_price'
  if (/consumer\s+care|customer\s+care|grievance/i.test(clean)) return 'consumer_care'
  if (/common\s+name|generic\s+name/i.test(clean)) return 'generic_name'

  return null
}
