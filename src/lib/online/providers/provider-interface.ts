import type { FetchOptions, FetchResult } from '../types'

export interface OnlineVerificationProvider {
  /**
   * Unique name of the provider (e.g. 'safe-http', 'mock-provider').
   */
  readonly name: string

  /**
   * Determines whether this provider can handle the given URL.
   */
  supportsUrl(url: string): boolean

  /**
   * Fetches public product listing content safely.
   */
  fetchListing(url: string, options?: FetchOptions): Promise<FetchResult>
}
