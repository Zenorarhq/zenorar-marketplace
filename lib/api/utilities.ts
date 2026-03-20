// Utilities API Client - Frontend

import { localApiFetch } from './client'

export interface UtilityOperator {
  id: string
  name: string
  country: string
  regions: string[]
  offers: UtilityOffer[]
}

export interface UtilityOffer {
  offerId: string
  priceType: string
  price: number
  priceCurrency: string
  cost: number | null
  sendAmount: number
  sendCurrency: string
  priceMin?: number
  priceMax?: number
  sendMin?: number
  sendMax?: number
  notes: string
  shortNotes: string
}

/**
 * Get available electricity/utility operators
 */
export async function getElectricityOperators(country?: string): Promise<{
  success: boolean
  data?: UtilityOperator[]
  error?: string
}> {
  const params = country ? `?country=${country}` : ''
  return localApiFetch(`/utilities/electricity${params}`)
}

/**
 * Get available mobile data + bundle operators
 */
export async function getDataOperators(country?: string): Promise<{
  success: boolean
  data?: UtilityOperator[]
  error?: string
}> {
  const params = country ? `?country=${country}` : ''
  return localApiFetch(`/utilities/data${params}`)
}

/**
 * Purchase a utility/data top-up
 */
export async function purchaseUtility(params: {
  offerId: string
  recipientPhone: string
  value?: number
}): Promise<{
  success: boolean
  data?: { transactionId: string; status: string }
  error?: string
}> {
  return localApiFetch('/utilities/purchase', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
