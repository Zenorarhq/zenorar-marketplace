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

const SOCIAL_ICONS: Record<string, string> = {
  twitter: 'globe', facebook: 'globe', instagram: 'globe',
  youtube: 'globe', discord: 'forum', linkedin: 'globe',
  tiktok: 'globe', github: 'globe',
}

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { siteName, siteDescription, logoUrl, rawSettings } = useSiteSettings()
  const currentYear = new Date().getFullYear()
  const config = parseFooterConfig(rawSettings?.site_footer)

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    try {
      // TODO: Implement actual newsletter subscription
      await new Promise(resolve => setTimeout(resolve, 500))
      setSubscribed(true)
      setEmail('')
    } catch (error) {
      console.error('Newsletter subscription error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const paddingClass = ({ compact: 'pt-8 sm:pt-10 pb-4', default: 'pt-12 sm:pt-16 pb-8', spacious: 'pt-16 sm:pt-20 pb-12' } as Record<string, string>)[config?.padding || 'default'] || 'pt-12 sm:pt-16 pb-8'
  const gapClass = ({ tight: 'gap-4 md:gap-6', default: 'gap-8 md:gap-12', wide: 'gap-12 md:gap-16' } as Record<string, string>)[config?.columnGap || 'default'] || 'gap-8 md:gap-12'
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
          </div>

          {/* Link Columns - each takes 1 col on mobile, 2 on desktop */}
          {(config?.columns && config.columns.length > 0 ? config.columns : [
            { title: 'Products', links: [{ label: 'Premium Scripts', url: '/scripts' }, { label: 'Global eSIMs', url: '/esim' }, { label: 'Virtual Numbers', url: '/virtual-numbers' }, { label: 'Gift Cards', url: '/gift-cards' }] },
            { title: 'Support', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }, { label: 'My Account', url: '/profile' }, { label: 'Terms of Service', url: '/terms' }, { label: 'Privacy Policy', url: '/privacy' }] },
            { title: 'Community', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }] },
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
                ) : (
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
                )}
              </>
            )}
          </div>

          {/* Payment Icons - full width centered on mobile, under newsletter on desktop */}
          <div className="col-span-2 md:col-span-3 md:col-start-10 flex flex-wrap gap-3 justify-center md:justify-start">
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

          {/* Social Links - full width centered on mobile, under payment icons on desktop */}
          <div className="col-span-2 md:col-span-3 md:col-start-10 flex gap-4 justify-center md:justify-start">
            {(config?.socialLinks && config.socialLinks.length > 0) ? (
              config.socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-primary transition-colors"
                  aria-label={social.platform}
                >
                  <Icon name={(SOCIAL_ICONS[social.platform.toLowerCase()] || 'globe') as any} size={24} />
                </a>
              ))
            ) : (
              <>
                <a href="https://twitter.com/marketplace" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition-colors" aria-label="Follow us on Twitter">
                  <Icon name="globe" size={24} />
                </a>
                <a href="mailto:hello@marketplace.com" className="text-slate-400 hover:text-primary transition-colors" aria-label="Email us">
                  <Icon name="mail" size={24} />
                </a>
                <a href="https://discord.gg/marketplace" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition-colors" aria-label="Join our Discord">
                  <Icon name="forum" size={24} />
                </a>
              </>
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
