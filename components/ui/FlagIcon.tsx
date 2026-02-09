import { useMemo } from 'react'

interface FlagIconProps {
  countryCode: string
  className?: string
}

export default function FlagIcon({ countryCode, className = '' }: FlagIconProps) {
  const FlagComponent = useMemo(() => {
    try {
      // Dynamically import the flag component
      const flags = require('country-flag-icons/react/1x1')
      return flags[countryCode.toUpperCase()]
    } catch {
      return null
    }
  }, [countryCode])

  if (!FlagComponent) {
    return null
  }

  return <FlagComponent className={className} title={countryCode} />
}
