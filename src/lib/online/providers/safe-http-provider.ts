import type { OnlineVerificationProvider } from './provider-interface'
import type { FetchOptions, FetchResult } from '../types'
import { safeFetchUrl } from '../security'

/**
 * Standard HTTP/HTTPS provider with integrated SSRF protection.
 * Retrieves only publicly accessible web pages without authentication bypass or CAPTCHA circumvention.
 */
export class SafeHttpProvider implements OnlineVerificationProvider {
  readonly name = 'safe-http'

  supportsUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false
    try {
      const parsed = new URL(url.trim())
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  async fetchListing(url: string, options?: FetchOptions): Promise<FetchResult> {
    return safeFetchUrl(url, options)
  }
}
