'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

interface FooterConfig {
  columns?: { title: string; links: { label: string; url: string }[] }[]
  showNewsletter?: boolean
  newsletterTitle?: string
  socialLinks?: { platform: string; url: string }[]
  copyrightText?: string
  backgroundColor?: string
  textColor?: string
  padding?: 'compact' | 'default' | 'spacious'
  columnGap?: 'tight' | 'default' | 'wide'
  bottomLinks?: { label: string; url: string }[]
  logoSize?: 'small' | 'medium' | 'large'
  description?: string
}

function parseFooterConfig(raw: any): FooterConfig | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const data = parsed?.value ? (typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value) : parsed
    if (data && typeof data === 'object') return data
    return null
  } catch { return null }
}

function SocialIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const p = platform.toLowerCase()
  if (p === 'twitter' || p === 'x') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  if (p === 'facebook') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  if (p === 'instagram') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  if (p === 'youtube') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  if (p === 'discord') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
  if (p === 'linkedin') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  if (p === 'tiktok') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
  if (p === 'github') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  return <Icon name="globe" size={size} />
}

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subError, setSubError] = useState(false)
  const { siteName, siteDescription, logoUrl, rawSettings, isLoaded } = useSiteSettings()
  const currentYear = new Date().getFullYear()
  const config = parseFooterConfig(rawSettings?.site_footer)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    setSubError(false)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success || res.ok) {
        setSubscribed(true)
        setEmail('')
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      setSubError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't render fallback content until settings are loaded
  if (!isLoaded) {
    return <footer className="border-t border-border-dark bg-surface-dark pt-12 sm:pt-16 pb-8" />
  }

  const paddingMap: Record<string, string> = { compact: 'pt-8 sm:pt-10 pb-4', default: 'pt-12 sm:pt-16 pb-8', spacious: 'pt-16 sm:pt-20 pb-12' }
  const paddingClass = paddingMap[config?.padding || 'default'] || 'pt-12 sm:pt-16 pb-8'
  const gapMap: Record<string, string> = { tight: 'gap-4 md:gap-6', default: 'gap-8 md:gap-12', wide: 'gap-12 md:gap-16' }
  const gapClass = gapMap[config?.columnGap || 'default'] || 'gap-8 md:gap-12'
  const bottomLinks = config?.bottomLinks && config.bottomLinks.length > 0
    ? config.bottomLinks
    : [{ label: 'Terms', url: '/terms' }, { label: 'Privacy', url: '/privacy' }, { label: 'Cookies', url: '/cookies' }]

  return (
    <footer
      className={`border-t border-border-dark ${config?.backgroundColor ? '' : 'bg-surface-dark'} ${paddingClass}`}
      style={{
        ...(config?.backgroundColor ? { backgroundColor: config.backgroundColor } : {}),
        ...(config?.textColor ? { color: config.textColor } : {}),
      }}
    >
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 mb-12 sm:mb-16">
        {/* Main footer grid - Brand column, middle 2-col section, newsletter column */}
        <div className={`grid grid-cols-2 md:grid-cols-12 ${gapClass}`}>
          {/* Brand Column - full width on mobile, 3 cols on md+ */}
          <div className="col-span-2 md:col-span-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary mb-6"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className={`${({ small: 'h-7 sm:h-7 md:h-7', medium: 'h-8 sm:h-9 md:h-10', large: 'h-10 sm:h-11 md:h-12' })[config?.logoSize || 'medium'] || 'h-8 sm:h-9 md:h-10'} w-auto object-contain`} />
              ) : siteName ? (
                <span>{siteName}</span>
              ) : null}
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              {config?.description || siteDescription || 'The premier destination for high-quality scripts, global connectivity solutions, and digital tools for professionals.'}
            </p>
            {/* Payment Icons */}
            <div className="flex flex-wrap gap-3 mt-6">
              {/* Bitcoin */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Bitcoin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="#F7931A"/><path d="M15.3 10.5c.2-1.3-.8-2-2.1-2.5l.4-1.7-1-.3-.4 1.6c-.3-.1-.5-.1-.8-.2l.4-1.6-1-.3-.4 1.7c-.2-.1-.4-.1-.6-.2l-1.4-.3-.3 1.1s.7.2.7.2c.4.1.5.4.5.6l-.5 2.1c0 0 .1 0 .1 0l-.1 0-.7 2.9c-.1.2-.2.4-.6.3 0 0-.7-.2-.7-.2l-.5 1.2 1.3.3c.2.1.5.1.7.2l-.4 1.7 1 .3.4-1.7c.3.1.5.1.8.2l-.4 1.7 1 .3.4-1.7c1.8.3 3.1.2 3.6-1.4.4-1.3 0-2-.9-2.5.7-.2 1.2-.6 1.3-1.5zm-2.3 3.3c-.3 1.3-2.4.6-3 .4l.5-2.2c.7.2 2.8.5 2.5 1.8zm.3-3.3c-.3 1.1-2 .6-2.5.4l.5-2c.6.1 2.3.4 2 1.6z" fill="white"/></svg>
              </div>
              {/* Ethereum */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Ethereum">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#627EEA"/><path d="M12 3v7.5l6 2.7L12 3z" fill="white" fillOpacity="0.6"/><path d="M12 3L6 13.2l6-2.7V3z" fill="white"/><path d="M12 16.5v4.5l6-8.5-6 4z" fill="white" fillOpacity="0.6"/><path d="M12 21v-4.5L6 12.5l6 8.5z" fill="white"/><path d="M12 15.5l6-2.8-6-2.7v5.5z" fill="white" fillOpacity="0.2"/><path d="M6 12.7l6 2.8V10l-6 2.7z" fill="white" fillOpacity="0.5"/></svg>
              </div>
              {/* USDC */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="USDC">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2775CA"/><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm-.5 13.7v.8h-1v-.8c-1.5-.2-2.5-.9-2.7-2h1.4c.2.6.7 1 1.5 1 .9 0 1.4-.4 1.4-1s-.4-.9-1.5-1.1c-1.5-.3-2.6-.8-2.6-2.1 0-1 .7-1.8 2-2v-.8h1v.8c1.3.2 2.2.9 2.4 1.9h-1.4c-.1-.5-.6-.9-1.3-.9-.8 0-1.2.4-1.2.9 0 .6.5.8 1.5 1 1.5.3 2.6.8 2.6 2.2 0 1.1-.8 1.9-2.1 2.1z" fill="white"/></svg>
              </div>
              {/* Tether */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Tether (USDT)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#26A17B"/><path d="M13.5 10.8v-2h3.2V6.5H7.3v2.3h3.2v2c-2.7.1-4.8.7-4.8 1.4 0 .7 2.1 1.3 4.8 1.4v4.9h2.1v-4.9c2.7-.1 4.7-.7 4.7-1.4 0-.7-2-1.3-4.8-1.4zm-1 2.4c-2.8 0-4.7-.5-4.7-1.1 0-.5 1.6-.9 3.7-1v1.6h.1c.3 0 .6 0 .9 0v-1.6c2.1.1 3.7.5 3.7 1 0 .6-1.9 1.1-4.7 1.1h1z" fill="white"/></svg>
              </div>
              {/* Solana */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Solana">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#9945FF"/><path d="M7.5 14.5l1.3-1.3h7.7l-1.3 1.3H7.5zm0-3l1.3-1.3h7.7l-1.3 1.3H7.5zm8.9-1.7H8.8l1.3-1.3h7.7l-1.4 1.3z" fill="white"/></svg>
              </div>
              {/* Visa */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Visa">
                <svg width="24" height="14" viewBox="0 0 48 16" fill="none"><path d="M19.2 1.3l-3.8 13.4h-3.1l3.8-13.4h3.1zm15.4 8.7l1.6-4.5.9 4.5h-2.5zm3.5 4.7h2.9l-2.5-13.4H35.8c-.6 0-1.2.4-1.4 1l-5 11.4h3.5l.7-1.9h4.3l.2 1.9zm-8.7-4.4c0-3.5-4.9-3.7-4.9-5.3 0-.5.5-1 1.5-1.1.5 0 1.9-.1 3.4.6l.6-2.8c-.8-.3-1.9-.6-3.2-.6-3.4 0-5.8 1.8-5.8 4.4 0 1.9 1.7 3 3 3.6 1.3.7 1.8 1.1 1.7 1.7 0 .9-1 1.3-2 1.3-1.7 0-2.6-.5-3.4-.8l-.6 2.9c.8.4 2.2.7 3.7.7 3.6 0 6-1.8 6-4.6zM10.7 1.3L5 14.7H1.4L-1.5 4c-.2-.7-.3-.9-.9-1.2-.9-.5-2.3-.9-3.6-1.2l.1-.3h5.7c.7 0 1.4.5 1.5 1.3l1.4 7.5 3.5-8.8h3.5z" transform="translate(6 0)" fill="#94a3b8"/></svg>
              </div>
              {/* Mastercard */}
              <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center" title="Mastercard">
                <svg width="20" height="14" viewBox="0 0 32 20" fill="none"><rect width="32" height="20" rx="2" fill="none"/><circle cx="12" cy="10" r="7" fill="#EB001B" fillOpacity="0.5"/><circle cx="20" cy="10" r="7" fill="#F79E1B" fillOpacity="0.5"/><path d="M16 4.8a7 7 0 010 10.4 7 7 0 000-10.4z" fill="#FF5F00" fillOpacity="0.5"/></svg>
              </div>
            </div>
          </div>

          {/* Link Columns - each takes 1 col on mobile, 2 on desktop */}
          {(config?.columns && config.columns.length > 0 ? config.columns : [
            { title: 'Products', links: [{ label: 'Premium Scripts', url: '/scripts' }, { label: 'Global eSIMs', url: '/esim' }, { label: 'Virtual Numbers', url: '/virtual-numbers' }, { label: 'Gift Cards', url: '/gift-cards' }] },
            { title: 'Support', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }, { label: 'Product Request', url: '/product-request' }, { label: 'My Account', url: '/profile' }, { label: 'Terms of Service', url: '/terms' }, { label: 'Privacy Policy', url: '/privacy' }] },
            { title: 'Company', links: [{ label: 'About Us', url: '/about' }, { label: 'Blog', url: '/blog' }, { label: 'Careers', url: '/careers' }] },
          ]).map((col, i) => (
            <div key={i} className="col-span-1 md:col-span-2">
              <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">{col.title}</h4>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-500">
                {col.links.map((link, li) => (
                  <li key={li}>
                    <Link href={link.url || '#'} prefetch={false} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter & Social Column - right column on mobile, 3 cols on desktop */}
          <div className="col-span-1 md:col-span-3">
            {(config?.showNewsletter !== false) && (
              <>
                <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">
                  {config?.newsletterTitle || 'Newsletter'}
                </h4>
                {subscribed ? (
                  <p className="text-primary text-sm">Thanks for subscribing!</p>
                ) : (<>
                  <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                    <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                    <input
                      id="newsletter-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="bg-background-dark border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary w-full text-slate-200 placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? '...' : 'Join'}
                    </button>
                  </form>
                  {subError && <p className="text-red-400 text-xs mt-2">Failed to subscribe. Please try again.</p>}
                </>)}
              </>
            )}
          </div>

          {/* Social Links */}
          <div className="col-span-2 md:col-span-3 md:col-start-10 flex gap-4 justify-center md:justify-start">
            {(config?.socialLinks && config.socialLinks.length > 0) && (
              config.socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-primary transition-colors"
                  aria-label={social.platform}
                >
                  <SocialIcon platform={social.platform} size={22} />
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 border-t border-border-dark pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <p>{config?.copyrightText || `\u00A9 ${currentYear} ${siteName}. All rights reserved.`}</p>
        <div className="flex gap-8">
          {bottomLinks.map((link, i) => (
            <Link key={i} href={link.url || '#'} className="hover:text-slate-300 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
