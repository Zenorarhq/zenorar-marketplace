'use client'

import { useState, useEffect } from 'react'

interface CountdownSectionProps {
  props: {
    targetDate?: string
    title?: string
    expiredMessage?: string
    layout?: 'inline' | 'boxes'
    showDays?: boolean
    showHours?: boolean
    showMinutes?: boolean
    showSeconds?: boolean
    numberColor?: string
    labelColor?: string
    backgroundColor?: string
    boxBackgroundColor?: string
    boxBorderRadius?: 'none' | 'small' | 'medium' | 'large'
    fontSize?: 'small' | 'medium' | 'large' | 'xl'
    alignment?: 'left' | 'center' | 'right'
    padding?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

function calculateTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownSection({ props }: CountdownSectionProps) {
  const {
    targetDate = '',
    title = 'Offer Ends In',
    expiredMessage = 'This offer has expired',
    layout = 'boxes',
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    numberColor,
    labelColor,
    backgroundColor,
    boxBackgroundColor,
    boxBorderRadius = 'medium',
    fontSize = 'large',
    alignment = 'center',
    padding = 'medium',
    customClassName,
    hideOnMobile,
  } = props

  const [timeLeft, setTimeLeft] = useState(targetDate ? calculateTimeLeft(targetDate) : null)

  useEffect(() => {
    if (!targetDate) return
    setTimeLeft(calculateTimeLeft(targetDate))
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  const alignmentClasses: Record<string, string> = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-4 px-4',
    medium: 'py-8 px-4',
    large: 'py-12 px-4',
  }

  const fontSizeClasses: Record<string, string> = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-4xl',
    xl: 'text-5xl',
  }

  const boxRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl',
  }

  if (!targetDate) {
    return (
      <div className={`${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''}`}>
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Set a target date to start the countdown.</p>
        </div>
      </div>
    )
  }

  const units: { key: string; value: number; label: string }[] = []
  if (timeLeft) {
    if (showDays) units.push({ key: 'days', value: timeLeft.days, label: 'Days' })
    if (showHours) units.push({ key: 'hours', value: timeLeft.hours, label: 'Hours' })
    if (showMinutes) units.push({ key: 'minutes', value: timeLeft.minutes, label: 'Minutes' })
    if (showSeconds) units.push({ key: 'seconds', value: timeLeft.seconds, label: 'Seconds' })
  }

  return (
    <div
      className={`flex flex-col ${alignmentClasses[alignment]} ${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      {title && (
        <h3 className="text-white font-bold text-xl mb-6 text-center">{title}</h3>
      )}

      {!timeLeft ? (
        <p className="text-slate-400 text-center">{expiredMessage}</p>
      ) : layout === 'boxes' ? (
        <div className="flex gap-3 sm:gap-4">
          {units.map((unit) => (
            <div
              key={unit.key}
              className={`flex flex-col items-center px-4 py-3 sm:px-6 sm:py-4 ${boxRadiusClasses[boxBorderRadius]}`}
              style={{ backgroundColor: boxBackgroundColor || '#1a1a1a' }}
            >
              <span
                className={`${fontSizeClasses[fontSize]} font-bold tabular-nums`}
                style={{ color: numberColor || '#ffffff' }}
              >
                {String(unit.value).padStart(2, '0')}
              </span>
              <span
                className="text-xs mt-1 uppercase tracking-wide"
                style={{ color: labelColor || '#94a3b8' }}
              >
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`${fontSizeClasses[fontSize]} font-bold tabular-nums`} style={{ color: numberColor || '#ffffff' }}>
          {units.map((u) => `${String(u.value).padStart(2, '0')}${u.label.charAt(0).toLowerCase()}`).join(' ')}
        </p>
      )}
    </div>
  )
}