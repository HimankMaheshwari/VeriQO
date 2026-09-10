import type { OnlineVerificationProvider } from './provider-interface'
import { SafeHttpProvider } from './safe-http-provider'
import { MockOnlineProvider } from './mock-provider'
import { SecurityValidationError } from '../security'

export class ProviderRegistry {
  private providers: OnlineVerificationProvider[] = []
  private mockProviderInstance: MockOnlineProvider

  constructor() {
    this.mockProviderInstance = new MockOnlineProvider()
    // Priority order: Mock provider (for explicit mocks/tests), then SafeHttpProvider
    this.providers.push(this.mockProviderInstance)
    this.providers.push(new SafeHttpProvider())
  }

  registerProvider(provider: OnlineVerificationProvider, prepend = false): void {
    if (prepend) {
      this.providers.unshift(provider)
    } else {
      this.providers.push(provider)
    }
  }

  getMockProvider(): MockOnlineProvider {
    return this.mockProviderInstance
  }

  resolveProvider(url: string): OnlineVerificationProvider {
    for (const provider of this.providers) {
      if (provider.supportsUrl(url)) {
        return provider
      }
    }

    throw new SecurityValidationError(
      `No online verification provider available to handle URL '${url}'`,
      'NO_PROVIDER_AVAILABLE'
    )
  }

  listProviders(): string[] {
    return this.providers.map((p) => p.name)
  }
}

// Singleton instance
export const defaultProviderRegistry = new ProviderRegistry()
