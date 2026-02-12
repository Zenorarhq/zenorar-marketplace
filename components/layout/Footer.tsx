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
        <div className={`grid grid-cols-1 md:grid-cols-12 ${gapClass}`}>
          {/* Brand Column - full width on mobile, 3 cols on md+ */}
          <div className="md:col-span-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary mb-6"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-9 w-auto object-contain" />
              ) : siteName ? (
                <span>{siteName}</span>
              ) : null}
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              {siteDescription || 'The premier destination for high-quality scripts, global connectivity solutions, and digital tools for professionals.'}
            </p>
          </div>

          {/* Middle Section - Dynamic columns from CMS or defaults */}
          <div className={`md:col-span-6 grid grid-cols-2 ${(config?.columns?.length || 3) >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-8`}>
            {(config?.columns && config.columns.length > 0 ? config.columns : [
              { title: 'Products', links: [{ label: 'Premium Scripts', url: '/products?category=scripts' }, { label: 'Global eSIMs', url: '/products?category=esims' }, { label: 'Virtual Numbers', url: '/products?category=virtual-numbers' }, { label: 'API Services', url: '/products?category=api' }] },
              { title: 'Support', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }, { label: 'My Account', url: '/profile' }, { label: 'Terms of Service', url: '/terms' }, { label: 'Privacy Policy', url: '/privacy' }] },
              { title: 'Community', links: [{ label: 'Developer Forum', url: '/forum' }, { label: 'Discord Server', url: '/discord' }, { label: 'Partner Program', url: '/partners' }] },
            ]).map((col, i) => (
              <div key={i} className={i === 2 ? 'col-span-2 sm:col-span-1' : ''}>
                <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">{col.title}</h4>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-500">
                  {col.links.map((link, li) => (
                    <li key={li}>
                      <Link href={link.url} className="hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter & Social Column - full width on mobile, 3 cols on md+ */}
          <div className="md:col-span-3">
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
            <div className={`flex gap-4 ${config?.showNewsletter !== false ? 'mt-6 sm:mt-8' : ''}`}>
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
      </div>

      {/* Bottom Bar */}
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 border-t border-border-dark pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <p>{config?.copyrightText || `\u00A9 ${currentYear} ${siteName}. All rights reserved.`}</p>
        <div className="flex gap-8">
          {bottomLinks.map((link, i) => (
            <Link key={i} href={link.url} className="hover:text-slate-300 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
