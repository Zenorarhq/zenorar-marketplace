// eSIM Provider Factory
// Manages multiple providers with fallback logic

import { EsimProviderInterface, EsimOrderResult } from './types'
import { airaloProvider } from './providers/airalo'
import { esimGoProvider } from './providers/esimgo'
import { mobimatterProvider } from './providers/mobimatter'
import { esimSmProvider } from './providers/esimsm'

// Provider registry - ordered by priority (lower = higher priority)
const providers: { provider: EsimProviderInterface; priority: number }[] = [
  { provider: airaloProvider, priority: 1 },
  { provider: esimGoProvider, priority: 2 },
  { provider: mobimatterProvider, priority: 3 },
  { provider: esimSmProvider, priority: 4 },
]

export class EsimProviderFactory {
  /**
   * Get provider by slug
   */
  static getProvider(slug: string): EsimProviderInterface | null {
    const entry = providers.find((p) => p.provider.slug === slug)
    return entry?.provider || null
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): EsimProviderInterface[] {
    return providers.map((p) => p.provider)
  }

  /**
   * Get providers sorted by priority
   */
  static getProvidersByPriority(): EsimProviderInterface[] {
    return [...providers].sort((a, b) => a.priority - b.priority).map((p) => p.provider)
  }

  /**
   * Get the default/primary provider
   */
  static getDefaultProvider(): EsimProviderInterface {
    const defaultSlug = process.env.DEFAULT_ESIM_PROVIDER || 'airalo'
    return this.getProvider(defaultSlug) || airaloProvider
  }

  /**
   * Order eSIM with automatic fallback
   * Tries providers in priority order until one succeeds
   */
  static async orderWithFallback(
    providerPlanId: string,
    orderId: string,
    preferredProvider?: string
  ): Promise<EsimOrderResult & { providerUsed: string }> {
    const orderedProviders = this.getProvidersByPriority()

    // If preferred provider specified, try it first
    if (preferredProvider) {
      const preferred = this.getProvider(preferredProvider)
      if (preferred) {
        const result = await preferred.orderEsim(providerPlanId, orderId)
        if (result.success) {
          return { ...result, providerUsed: preferred.slug }
        }
        console.warn(`Preferred provider ${preferredProvider} failed, trying fallbacks...`)
      }
    }

    // Try each provider in priority order
    const errors: string[] = []

    for (const provider of orderedProviders) {
      try {
        // Health check first
        const isHealthy = await provider.healthCheck()
        if (!isHealthy) {
          console.warn(`Provider ${provider.slug} health check failed, skipping...`)
          continue
        }

        const result = await provider.orderEsim(providerPlanId, orderId)

        if (result.success) {
          return { ...result, providerUsed: provider.slug }
        }

        errors.push(`${provider.slug}: ${result.error || 'Unknown error'}`)
      } catch (error: any) {
        errors.push(`${provider.slug}: ${error.message}`)
      }
    }

    // All providers failed
    return {
      success: false,
      providerOrderId: '',
      providerEsimId: '',
      iccid: '',
      matchingId: '',
      smdpAddress: '',
      qrCodeData: '',
      error: `All providers failed: ${errors.join('; ')}`,
      providerUsed: '',
    }
  }

  /**
   * Check availability across all providers
   */
  static async checkAvailabilityAcrossProviders(
    providerPlanId: string
  ): Promise<{ provider: string; available: boolean }[]> {
    const results = await Promise.all(
      providers.map(async ({ provider }) => ({
        provider: provider.slug,
        available: await provider.checkAvailability(providerPlanId),
      }))
    )
    return results
  }

  /**
   * Get the first available provider for a plan
   */
  static async getFirstAvailableProvider(
    providerPlanId: string
  ): Promise<EsimProviderInterface | null> {
    for (const { provider } of this.getProvidersByPriority().map((p) => ({
      provider: p,
    }))) {
      const available = await provider.checkAvailability(providerPlanId)
      if (available) {
        return provider
      }
    }
    return null
  }
}

export { airaloProvider, esimGoProvider, mobimatterProvider, esimSmProvider }
