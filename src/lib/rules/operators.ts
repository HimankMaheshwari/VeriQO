import type { ConditionOperator } from './types'

export function extractNumeric(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val !== 'string') return null
  const cleaned = val.replace(/,/g, '').trim()
  const match = cleaned.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const num = parseFloat(match[0])
  return isNaN(num) ? null : num
}

export function parseDateSafe(val: any): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val
  if (typeof val !== 'string' || !val.trim()) return null

  // Explicit ISO format: YYYY-MM-DD or YYYY/MM/DD
  const partsIso = val.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (partsIso) {
    const year = parseInt(partsIso[1], 10)
    const month = parseInt(partsIso[2], 10) - 1
    const day = parseInt(partsIso[3], 10)
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }

  // Legal Metrology standard DD/MM/YYYY or DD-MM-YYYY (Day/Month/Year)
  const partsDmy = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (partsDmy) {
    const day = parseInt(partsDmy[1], 10)
    const month = parseInt(partsDmy[2], 10) - 1
    let year = parseInt(partsDmy[3], 10)
    if (year < 100) year += year < 50 ? 2000 : 1900
    const d = new Date(year, month, day)
    return isNaN(d.getTime()) ? null : d
  }

  // Support MM/YYYY or MM-YYYY (Month/Year)
  const partsMy = val.match(/^(\d{1,2})[/-](\d{2,4})$/)
  if (partsMy) {
    const month = parseInt(partsMy[1], 10) - 1
    let year = parseInt(partsMy[2], 10)
    if (year < 100) year += year < 50 ? 2000 : 1900
    const d = new Date(year, month, 1)
    return isNaN(d.getTime()) ? null : d
  }

  // Fallback to Date.parse
  const parsedTime = Date.parse(val)
  if (!isNaN(parsedTime)) return new Date(parsedTime)

  return null
}

export function evaluateOperator(
  operator: ConditionOperator,
  actualValue: any,
  expectedValue?: any,
  params?: Record<string, any>
): boolean {
  switch (operator) {
    case 'EXISTS': {
      if (actualValue === null || actualValue === undefined) return false
      if (typeof actualValue === 'string') return actualValue.trim().length > 0
      return true
    }

    case 'NOT_EXISTS': {
      if (actualValue === null || actualValue === undefined) return true
      if (typeof actualValue === 'string') return actualValue.trim().length === 0
      return false
    }

    case 'EQUALS': {
      if (params?.caseSensitive === false && typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.trim().toLowerCase() === expectedValue.trim().toLowerCase()
      }
      return actualValue === expectedValue
    }

    case 'NOT_EQUALS': {
      if (params?.caseSensitive === false && typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.trim().toLowerCase() !== expectedValue.trim().toLowerCase()
      }
      return actualValue !== expectedValue
    }

    case 'MATCHES_REGEX': {
      if (typeof actualValue !== 'string' || typeof expectedValue !== 'string') return false
      try {
        let pattern = expectedValue
        let flags = params?.caseSensitive === true ? '' : 'i'
        if (pattern.startsWith('(?i)')) {
          pattern = pattern.slice(4)
          flags = 'i'
        }
        const regex = new RegExp(pattern, flags)
        return regex.test(actualValue.trim())
      } catch {
        return false
      }
    }

    case 'CONTAINS': {
      if (typeof actualValue !== 'string' || typeof expectedValue !== 'string') return false
      if (params?.caseSensitive === false) {
        return actualValue.toLowerCase().includes(expectedValue.toLowerCase())
      }
      return actualValue.includes(expectedValue)
    }

    case 'NOT_CONTAINS': {
      if (typeof actualValue !== 'string' || typeof expectedValue !== 'string') return true
      if (params?.caseSensitive === false) {
        return !actualValue.toLowerCase().includes(expectedValue.toLowerCase())
      }
      return !actualValue.includes(expectedValue)
    }

    case 'ONE_OF': {
      if (!Array.isArray(expectedValue)) return false
      if (actualValue === null || actualValue === undefined) return false
      if (params?.caseSensitive === false && typeof actualValue === 'string') {
        const lower = actualValue.trim().toLowerCase()
        return expectedValue.some((item) => String(item).trim().toLowerCase() === lower)
      }
      return expectedValue.includes(actualValue)
    }

    case 'NUMERIC_GT': {
      const numActual = extractNumeric(actualValue)
      const numExpected = extractNumeric(expectedValue)
      if (numActual === null || numExpected === null) return false
      return numActual > numExpected
    }

    case 'NUMERIC_GTE': {
      const numActual = extractNumeric(actualValue)
      const numExpected = extractNumeric(expectedValue)
      if (numActual === null || numExpected === null) return false
      return numActual >= numExpected
    }

    case 'NUMERIC_LT': {
      const numActual = extractNumeric(actualValue)
      const numExpected = extractNumeric(expectedValue)
      if (numActual === null || numExpected === null) return false
      return numActual < numExpected
    }

    case 'NUMERIC_LTE': {
      const numActual = extractNumeric(actualValue)
      const numExpected = extractNumeric(expectedValue)
      if (numActual === null || numExpected === null) return false
      return numActual <= numExpected
    }

    case 'NUMERIC_RANGE': {
      const numActual = extractNumeric(actualValue)
      if (numActual === null || !Array.isArray(expectedValue) || expectedValue.length < 2) return false
      const [min, max] = expectedValue.map(extractNumeric)
      if (min === null || max === null) return false
      return numActual >= min && numActual <= max
    }

    case 'DATE_FORMAT_VALID': {
      const parsed = parseDateSafe(actualValue)
      return parsed !== null
    }

    case 'DATE_BEFORE_NOW': {
      const parsed = parseDateSafe(actualValue)
      if (!parsed) return false
      const referenceDate = params?.referenceDate instanceof Date ? params.referenceDate : new Date()
      // Allow current day (compare to end of day)
      const eod = new Date(referenceDate)
      eod.setHours(23, 59, 59, 999)
      return parsed.getTime() <= eod.getTime()
    }

    case 'DAYS_BETWEEN': {
      // params.secondField or value could be target date or days threshold
      const d1 = parseDateSafe(actualValue)
      const d2 = parseDateSafe(expectedValue)
      if (!d1 || !d2) return false
      const diffMs = Math.abs(d2.getTime() - d1.getTime())
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      if (params?.maxDays !== undefined) return diffDays <= params.maxDays
      if (params?.minDays !== undefined) return diffDays >= params.minDays
      return true
    }

    default:
      return false
  }
}
