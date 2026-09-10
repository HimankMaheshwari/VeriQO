import crypto from 'crypto'
import type { OnlineVerificationProvider } from './provider-interface'
import type { FetchOptions, FetchResult } from '../types'
import { SecurityValidationError } from '../security'

export interface MockListingResponse {
  httpStatus?: number
  contentType?: string
  htmlContent: string
  headers?: Record<string, string>
  delayMs?: number
  shouldThrow?: Error
}

/**
 * In-memory Mock Provider for deterministic testing and unit test suites.
 */
export class MockOnlineProvider implements OnlineVerificationProvider {
  readonly name = 'mock-provider'
  private mocks = new Map<string, MockListingResponse>()
  private defaultResponse: MockListingResponse | null = null

  registerMock(urlOrPattern: string, response: MockListingResponse): void {
    this.mocks.set(urlOrPattern.toLowerCase(), response)
  }

  setDefaultMock(response: MockListingResponse | null): void {
    this.defaultResponse = response
  }

  clearMocks(): void {
    this.mocks.clear()
    this.defaultResponse = null
  }

  supportsUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false
    const lower = url.toLowerCase()
    return (
      lower.startsWith('mock://') ||
      this.mocks.has(lower) ||
      Array.from(this.mocks.keys()).some((k) => lower.includes(k)) ||
      this.defaultResponse !== null
    )
  }

  async fetchListing(url: string, _options?: FetchOptions): Promise<FetchResult> {
    const lower = url.toLowerCase()

    let mock = this.mocks.get(lower)
    if (!mock) {
      for (const [key, val] of Array.from(this.mocks.entries())) {
        if (lower.includes(key)) {
          mock = val
          break
        }
      }
    }

    if (!mock && this.defaultResponse) {
      mock = this.defaultResponse
    }

    if (!mock) {
      throw new SecurityValidationError(
        `MockOnlineProvider: No mock response registered for URL '${url}'`,
        'MOCK_NOT_FOUND'
      )
    }

    if (mock.shouldThrow) {
      throw mock.shouldThrow
    }

    if (mock.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, mock.delayMs))
    }

    const htmlContent = mock.htmlContent
    const contentHash = crypto.createHash('sha256').update(htmlContent).digest('hex')

    return {
      url,
      finalUrl: url,
      httpStatus: mock.httpStatus ?? 200,
      contentType: mock.contentType ?? 'text/html; charset=utf-8',
      htmlContent,
      contentHash,
      retrievedAt: new Date(),
      headers: mock.headers ?? { 'content-type': mock.contentType ?? 'text/html; charset=utf-8' },
    }
  }
}
