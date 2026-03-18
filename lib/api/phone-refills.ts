// Phone Refills API Client - Frontend

import { localApiFetch } from './client'

export interface TopupOperator {
  id: string
  name: string
  country: string
  regions: string[]
  offers: TopupOffer[]
}

export interface TopupOffer {
  offerId: string
  priceType: string
  price: number
  priceCurrency: string
  sendAmount: number
  sendCurrency: string
  notes: string
  shortNotes: string
}

/**
 * Get available mobile operators/carriers
 */
export async function getOperators(country?: string): Promise<{
  success: boolean
  data?: TopupOperator[]
  error?: string
}> {
  const params = country ? `?country=${country}` : ''
  return localApiFetch(`/phone-refills/operators${params}`)
}

/**
 * Purchase a phone top-up
 */
export async function purchaseTopup(params: {
  offerId: string
  recipientPhone: string
  value?: number
}): Promise<{
  success: boolean
  data?: { transactionId: string; status: string }
  error?: string
}> {
  return localApiFetch('/phone-refills/purchase', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
