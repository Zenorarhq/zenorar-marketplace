'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { formatPrice as formatPriceUtil, setExchangeRates } from '@/lib/currency'

interface Country {
  code: string
  name: string
  flag: string
}

interface Language {
  code: string
  name: string
}

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Preferences {
  country: Country
  language: Language
  currency: Currency
}

interface PreferencesContextType {
  preferences: Preferences
  setCountry: (country: Country) => void
  setLanguage: (language: Language) => void
  setCurrency: (currency: Currency) => void
  savePreferences: (prefs: Partial<Preferences>) => void
  formatPrice: (priceInUSD: number) => string
}

const defaultCountry: Country = { code: 'US', name: 'United States', flag: '🇺🇸' }
const defaultLanguage: Language = { code: 'en', name: 'English' }
const defaultCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$' }

const defaultPreferences: Preferences = {
  country: defaultCountry,
  language: defaultLanguage,
  currency: defaultCurrency,
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userPreferences')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setPreferences({
            country: parsed.country || defaultCountry,
            language: parsed.language || defaultLanguage,
            currency: parsed.currency || defaultCurrency,
          })
        } catch {
          // Invalid JSON, use defaults
        }
      }
      setIsLoaded(true)
    }
  }, [])

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetch('/api/rates/current')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setExchangeRates(data.data)
        }
      })
      .catch(() => {}) // Fallback rates remain active
  }, [])

  // Save to localStorage whenever preferences change (after initial load)
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('userPreferences', JSON.stringify(preferences))
    }
  }, [preferences, isLoaded])

  const setCountry = useCallback((country: Country) => {
    setPreferences(prev => ({ ...prev, country }))
  }, [])

  const setLanguage = useCallback((language: Language) => {
    setPreferences(prev => ({ ...prev, language }))
  }, [])

  const setCurrency = useCallback((currency: Currency) => {
    setPreferences(prev => ({ ...prev, currency }))
  }, [])

  const savePreferences = useCallback((prefs: Partial<Preferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...prefs,
    }))
  }, [])

  const formatPrice = useCallback((priceInUSD: number) => {
    return formatPriceUtil(priceInUSD, preferences.currency)
  }, [preferences.currency])

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        setCountry,
        setLanguage,
        setCurrency,
        savePreferences,
        formatPrice,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
