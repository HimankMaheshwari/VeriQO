import dns from 'dns'
import crypto from 'crypto'
import type { FetchOptions, FetchResult } from './types'

export class SecurityValidationError extends Error {
  readonly code: string
  constructor(message: string, code: string = 'SECURITY_VALIDATION_FAILED') {
    super(message)
    this.name = 'SecurityValidationError'
    this.code = code
    Object.setPrototypeOf(this, SecurityValidationError.prototype)
  }
}

/**
 * Checks if an IPv4 address string falls into private, loopback, or reserved ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true // Malformed -> reject
  }

  const [a, b] = parts

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true
  // 169.254.0.0/16 (Link-local / AWS & GCP cloud metadata service 169.254.169.254)
  if (a === 169 && b === 254) return true
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true
  // 240.0.0.0/4 (Reserved for future use)
  if (a >= 240) return true
  // 255.255.255.255 (Broadcast)
  if (parts.every((p) => p === 255)) return true

  return false
}

/**
 * Checks if an IPv6 address string falls into private, loopback, or link-local ranges.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const clean = ip.toLowerCase().trim()

  // Loopback ::1
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1' || clean === '::') return true

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (clean.startsWith('::ffff:') || clean.startsWith('0:0:0:0:0:ffff:')) {
    const v4Part = clean.substring(clean.lastIndexOf(':') + 1)
    if (v4Part.includes('.')) {
      return isPrivateOrReservedIPv4(v4Part)
    }
  }

  // Unique Local Address fc00::/7 (fc00:: - fdff::)
  if (clean.startsWith('fc') || clean.startsWith('fd')) return true

  // Link-Local Address fe80::/10
  if (
    clean.startsWith('fe8') ||
    clean.startsWith('fe9') ||
    clean.startsWith('fea') ||
    clean.startsWith('feb')
  ) {
    return true
  }

  return false
}

/**
 * Validates a URL against SSRF attack vectors, checking scheme, hostname, and resolved IP.
 */
export async function validateUrlForSsrf(
  rawUrl: string,
  dnsLookup: (hostname: string) => Promise<string[]> = resolveDnsAddresses
): Promise<{ valid: boolean; normalizedUrl: string; hostname: string; ip: string }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new SecurityValidationError('URL must be a non-empty string', 'INVALID_URL')
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new SecurityValidationError(`Malformed URL: '${rawUrl}'`, 'MALFORMED_URL')
  }

  // 1. Strict protocol whitelist (HTTP / HTTPS only)
  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new SecurityValidationError(
      `Unsupported protocol '${protocol}'. Only 'http:' and 'https:' are allowed.`,
      'DISALLOWED_PROTOCOL'
    )
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new SecurityValidationError(
      'URLs containing embedded credentials are not allowed.',
      'EMBEDDED_CREDENTIALS_REJECTED'
    )
  }

  const hostname = parsed.hostname.toLowerCase()

  // 3. Reject known dangerous hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'local' ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    throw new SecurityValidationError(
      `Access to internal/private hostname '${hostname}' is prohibited.`,
      'SSRF_HOST_BLOCKED'
    )
  }

  // 4. If hostname is already an IP address literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      throw new SecurityValidationError(
        `Access to private/reserved IP address '${hostname}' is prohibited.`,
        'SSRF_IP_BLOCKED'
      )
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname,
      ip: hostname,
    }
  }

  if (hostname.includes(':') || hostname.startsWith('[') || hostname.endsWith(']')) {
    const cleanIpv6 = hostname.replace(/^\[|\]$/g, '')
    if (isPrivateOrReservedIPv6(cleanIpv6)) {
      throw new SecurityValidationError(
        `Access to private/reserved IPv6 address '${cleanIpv6}' is prohibited.`,
        'SSRF_IP_BLOCKED'
      )
    }
    return {
      valid: true,
      normalizedUrl: parsed.toString(),
      hostname,
      ip: cleanIpv6,
    }
  }

  // 5. DNS Resolution
  const resolvedIps = await dnsLookup(hostname)
  if (!resolvedIps || resolvedIps.length === 0) {
    throw new SecurityValidationError(
      `Could not resolve IP address for hostname '${hostname}'.`,
      'DNS_RESOLUTION_FAILED'
    )
  }

  for (const resolvedIp of resolvedIps) {
    if (resolvedIp.includes('.')) {
      if (isPrivateOrReservedIPv4(resolvedIp)) {
        throw new SecurityValidationError(
          `Resolved IP '${resolvedIp}' for hostname '${hostname}' is private or reserved.`,
          'SSRF_RESOLVED_PRIVATE_IP'
        )
      }
    } else {
      if (isPrivateOrReservedIPv6(resolvedIp)) {
        throw new SecurityValidationError(
          `Resolved IPv6 '${resolvedIp}' for hostname '${hostname}' is private or reserved.`,
          'SSRF_RESOLVED_PRIVATE_IP'
        )
      }
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
    ip: resolvedIps[0],
  }
}

/**
 * Resolves all IP addresses for a given hostname using Node.js dns promises.
 */
export async function resolveDnsAddresses(hostname: string): Promise<string[]> {
  try {
    const results = await dns.promises.lookup(hostname, { all: true })
    return results.map((r) => r.address)
  } catch (err: any) {
    throw new SecurityValidationError(
      `DNS lookup failed for hostname '${hostname}': ${err.message}`,
      'DNS_LOOKUP_ERROR'
    )
  }
}

/**
 * Executes a secure HTTP/HTTPS fetch with SSRF validation, size cap, timeout, and redirect protection.
 */
export async function safeFetchUrl(
  targetUrl: string,
  options: FetchOptions = {},
  customDnsLookup?: (hostname: string) => Promise<string[]>
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? 10000
  const maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024 // 5 MB default
  const maxRedirects = 5

  let currentUrl = targetUrl
  let redirectCount = 0

  while (redirectCount <= maxRedirects) {
    // Validate current hop against SSRF rules
    await validateUrlForSsrf(currentUrl, customDnsLookup)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const headers: Record<string, string> = {
        'User-Agent':
          'VeriQO-LegalMetrology-ComplianceAudit/1.0 (+https://veri-qo.gov.in/bot; public verification)',
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        ...(options.headers || {}),
      }

      // Explicitly remove sensitive or internal headers
      delete (headers as any)['Authorization']
      delete (headers as any)['Cookie']
      delete (headers as any)['authorization']
      delete (headers as any)['cookie']

      const res = await fetch(currentUrl, {
        method: 'GET',
        headers,
        redirect: 'manual', // Handle redirects manually to validate each hop!
        signal: controller.signal,
      })

      // Check for redirect responses (301, 302, 303, 307, 308)
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) {
          throw new SecurityValidationError(
            `Redirect response ${res.status} missing Location header`,
            'INVALID_REDIRECT'
          )
        }

        const nextUrl = new URL(location, currentUrl).toString()
        redirectCount++
        if (redirectCount > maxRedirects) {
          throw new SecurityValidationError(
            `Too many redirects (exceeded ${maxRedirects} hops)`,
            'TOO_MANY_REDIRECTS'
          )
        }

        currentUrl = nextUrl
        continue
      }

      // Check Content-Length if present
      const contentLengthHeader = res.headers.get('content-length')
      if (contentLengthHeader) {
        const declaredLength = parseInt(contentLengthHeader, 10)
        if (!isNaN(declaredLength) && declaredLength > maxSizeBytes) {
          throw new SecurityValidationError(
            `Response content-length (${declaredLength} bytes) exceeds limit of ${maxSizeBytes} bytes`,
            'RESPONSE_TOO_LARGE'
          )
        }
      }

      // Read response body with size capping
      const buffer = await res.arrayBuffer()
      if (buffer.byteLength > maxSizeBytes) {
        throw new SecurityValidationError(
          `Response size (${buffer.byteLength} bytes) exceeded maximum allowed limit of ${maxSizeBytes} bytes`,
          'RESPONSE_TOO_LARGE'
        )
      }

      const decoder = new TextDecoder('utf-8')
      const htmlContent = decoder.decode(buffer)
      const contentHash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex')

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val
      })

      return {
        url: targetUrl,
        finalUrl: currentUrl,
        httpStatus: res.status,
        contentType: res.headers.get('content-type') || 'text/html',
        htmlContent,
        contentHash,
        retrievedAt: new Date(),
        headers: responseHeaders,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new SecurityValidationError(
          `Request to '${currentUrl}' timed out after ${timeoutMs}ms`,
          'FETCH_TIMEOUT'
        )
      }
      if (err instanceof SecurityValidationError) {
        throw err
      }
      throw new SecurityValidationError(
        `Failed to retrieve online listing: ${err.message}`,
        'FETCH_FAILED'
      )
    } finally {
      clearTimeout(timer)
    }
  }

  throw new SecurityValidationError(
    `Too many redirects (exceeded ${maxRedirects} hops)`,
    'TOO_MANY_REDIRECTS'
  )
}
