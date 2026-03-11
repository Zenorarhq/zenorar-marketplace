// Card Providers Index
// Export all card provider implementations

export { sudoProvider } from './sudo'
export { lithicProvider } from './lithic'
export { reloadlyCardsProvider } from './reloadly-cards'

import { sudoProvider } from './sudo'
import { lithicProvider } from './lithic'
import { reloadlyCardsProvider } from './reloadly-cards'
import type { CardProvider, CardProviderInterface } from '../types'

// Get provider instance by name
export function getProvider(name: CardProvider): CardProviderInterface | null {
  switch (name) {
    case 'sudo':
      return sudoProvider
    case 'lithic':
      return lithicProvider
    case 'reloadly':
      return reloadlyCardsProvider
    default:
      return null
  }
}

// Get all providers
export function getAllProviders(): CardProviderInterface[] {
  return [sudoProvider, lithicProvider, reloadlyCardsProvider]
}
