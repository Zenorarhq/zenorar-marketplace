'use client'

import { useState, useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon'

interface PreferencesDialogProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement>
}

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

const countries: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
]

const languages: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
]

const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'USDT', name: 'Tether', symbol: '₮' },
]

type SettingType = 'country' | 'language' | 'currency' | null

export default function PreferencesDialog({ isOpen, onClose, triggerRef }: PreferencesDialogProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0])
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0])
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0])
  const [activeSetting, setActiveSetting] = useState<SettingType>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        // Check if clicking on the trigger button (to allow toggle)
        if (triggerRef?.current && triggerRef.current.contains(event.target as Node)) {
          return
        }
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    // TODO: Save preferences to localStorage or API
    console.log('Saving preferences:', {
      country: selectedCountry,
      language: selectedLanguage,
      currency: selectedCurrency,
    })
    onClose()
  }

  const renderMainView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-lg font-bold">Preferences</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="space-y-3 flex-grow">
        {/* Country */}
        <button
          onClick={() => setActiveSetting('country')}
          className="w-full bg-[#1C1C1C] hover:bg-[#252525] h-16 rounded-xl flex items-center px-4 cursor-pointer transition-colors group border border-white/5 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 flex-shrink-0 text-xl">
            {selectedCountry.flag}
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Country</p>
            <p className="text-white font-medium text-sm truncate">{selectedCountry.name}</p>
          </div>
          <Icon name="chevron-right" size={18} className="text-white/30 group-hover:text-primary transition-colors ml-2" />
        </button>

        {/* Language */}
        <button
          onClick={() => setActiveSetting('language')}
          className="w-full bg-[#1C1C1C] hover:bg-[#252525] h-16 rounded-xl flex items-center px-4 cursor-pointer transition-colors group border border-white/5 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 flex-shrink-0 text-white/80">
            <Icon name="language" size={20} />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Language</p>
            <p className="text-white font-medium text-sm truncate">{selectedLanguage.name}</p>
          </div>
          <Icon name="chevron-right" size={18} className="text-white/30 group-hover:text-primary transition-colors ml-2" />
        </button>

        {/* Payment Currency */}
        <button
          onClick={() => setActiveSetting('currency')}
          className="w-full bg-[#1C1C1C] hover:bg-[#252525] h-16 rounded-xl flex items-center px-4 cursor-pointer transition-colors group border border-white/5 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 flex-shrink-0 text-[#F7931A]">
            <Icon name="bitcoin" size={20} />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Currency</p>
            <p className="text-white font-medium text-sm truncate">{selectedCurrency.code}</p>
          </div>
          <Icon name="chevron-right" size={18} className="text-white/30 group-hover:text-primary transition-colors ml-2" />
        </button>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-primary text-black font-bold text-sm h-12 rounded-xl mt-6 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center"
      >
        Save Preferences
      </button>
    </>
  )

  const renderCountrySelector = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSetting(null)}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <h2 className="text-white text-lg font-bold">Select Country</h2>
      </div>

      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[280px] no-scrollbar">
        {countries.map((country) => (
          <button
            key={country.code}
            onClick={() => {
              setSelectedCountry(country)
              setActiveSetting(null)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
              selectedCountry.code === country.code
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-[#1C1C1C] hover:bg-[#252525] border border-white/5'
            }`}
          >
            <span className="text-xl">{country.flag}</span>
            <span className={`font-medium text-sm ${selectedCountry.code === country.code ? 'text-primary' : 'text-white'}`}>
              {country.name}
            </span>
            {selectedCountry.code === country.code && (
              <Icon name="check" size={16} className="text-primary ml-auto" />
            )}
          </button>
        ))}
      </div>
    </>
  )

  const renderLanguageSelector = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSetting(null)}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <h2 className="text-white text-lg font-bold">Select Language</h2>
      </div>

      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[280px] no-scrollbar">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => {
              setSelectedLanguage(language)
              setActiveSetting(null)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
              selectedLanguage.code === language.code
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-[#1C1C1C] hover:bg-[#252525] border border-white/5'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Icon name="language" size={14} className="text-white/70" />
            </div>
            <span className={`font-medium text-sm ${selectedLanguage.code === language.code ? 'text-primary' : 'text-white'}`}>
              {language.name}
            </span>
            {selectedLanguage.code === language.code && (
              <Icon name="check" size={16} className="text-primary ml-auto" />
            )}
          </button>
        ))}
      </div>
    </>
  )

  const renderCurrencySelector = () => (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setActiveSetting(null)}
          className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <h2 className="text-white text-lg font-bold">Select Currency</h2>
      </div>

      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[280px] no-scrollbar">
        {currencies.map((currency) => (
          <button
            key={currency.code}
            onClick={() => {
              setSelectedCurrency(currency)
              setActiveSetting(null)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
              selectedCurrency.code === currency.code
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-[#1C1C1C] hover:bg-[#252525] border border-white/5'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              currency.code === 'BTC' ? 'bg-[#F7931A]/20 text-[#F7931A]' :
              currency.code === 'ETH' ? 'bg-[#627EEA]/20 text-[#627EEA]' :
              'bg-white/10 text-white/70'
            }`}>
              {currency.symbol}
            </div>
            <div className="flex-grow">
              <span className={`font-medium text-sm ${selectedCurrency.code === currency.code ? 'text-primary' : 'text-white'}`}>
                {currency.name}
              </span>
              <span className="text-white/40 text-xs ml-1.5">({currency.code})</span>
            </div>
            {selectedCurrency.code === currency.code && (
              <Icon name="check" size={16} className="text-primary ml-auto" />
            )}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dropdown positioned at top right */}
      <div
        ref={dialogRef}
        className="fixed z-[100] top-20 right-8 lg:right-12 w-[320px] bg-[#0D0D0D] rounded-2xl p-5 shadow-2xl border border-white/10 flex flex-col"
      >
        {activeSetting === null && renderMainView()}
        {activeSetting === 'country' && renderCountrySelector()}
        {activeSetting === 'language' && renderLanguageSelector()}
        {activeSetting === 'currency' && renderCurrencySelector()}
      </div>
    </>
  )
}
