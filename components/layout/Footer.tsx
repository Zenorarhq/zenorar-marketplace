'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { siteName, siteDescription, logoUrl } = useSiteSettings()
  const currentYear = new Date().getFullYear()

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

  return (
    <footer className="bg-surface-dark border-t border-border-dark pt-12 sm:pt-16 pb-8">
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 mb-12 sm:mb-16">
        {/* Main footer grid - Brand column, middle 2-col section, newsletter column */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
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

          {/* Middle Section - 2 columns containing Products, Support, Community */}
          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Products Column */}
            <div>
              <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">Products</h4>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-500">
                <li>
                  <Link href="/products?category=scripts" className="hover:text-primary transition-colors">
                    Premium Scripts
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=esims" className="hover:text-primary transition-colors">
                    Global eSIMs
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=virtual-numbers" className="hover:text-primary transition-colors">
                    Virtual Numbers
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=api" className="hover:text-primary transition-colors">
                    API Services
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">Support</h4>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-500">
                <li>
                  <Link href="/help" className="hover:text-primary transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-primary transition-colors">
                    My Account
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community Column */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">Community</h4>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-500">
                <li>
                  <Link href="/forum" className="hover:text-primary transition-colors">
                    Developer Forum
                  </Link>
                </li>
                <li>
                  <Link href="/discord" className="hover:text-primary transition-colors">
                    Discord Server
                  </Link>
                </li>
                <li>
                  <Link href="/partners" className="hover:text-primary transition-colors">
                    Partner Program
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter Column - full width on mobile, 3 cols on md+ */}
          <div className="md:col-span-3">
            <h4 className="font-bold mb-4 sm:mb-6 text-white text-sm sm:text-base">Newsletter</h4>
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
            <div className="flex gap-4 mt-6 sm:mt-8">
              <a
                href="https://twitter.com/marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Icon name="globe" size={24} />
              </a>
              <a
                href="mailto:hello@marketplace.com"
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Email us"
              >
                <Icon name="mail" size={24} />
              </a>
              <a
                href="https://discord.gg/marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Join our Discord"
              >
                <Icon name="forum" size={24} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 border-t border-border-dark pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <p>&copy; {currentYear} {siteName}. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/terms" className="hover:text-slate-300 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-slate-300 transition-colors">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  )
}
