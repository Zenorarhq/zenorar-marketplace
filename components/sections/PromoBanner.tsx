'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { discountsApi, type ValidateDiscountResponse } from '@/lib/api/discounts'

export default function PromoBanner({ config }: { config?: Record<string, any> } = {}) {
  const { promoBannerCode } = useSiteSettings()
  const [discount, setDiscount] = useState<ValidateDiscountResponse | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [codeRevealed, setCodeRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasPromoCode = !!promoBannerCode

  // Validate the promo code on mount to get real discount info
  useEffect(() => {
    if (!promoBannerCode) return
    discountsApi.validate(promoBannerCode, 0).then((res) => {
      if (res.success && res.data) {
        setDiscount(res.data)
      }
    }).catch(() => {})
  }, [promoBannerCode])

  const discountLabel = discount
    ? discount.type === 'PERCENTAGE'
      ? `${discount.value}% Off`
      : `$${discount.value} Off`
    : 'Special Offer'

  const handleRevealCode = () => {
    if (!email.trim()) return
    localStorage.setItem('promo_email', email.trim())
    sessionStorage.setItem('promo_code', promoBannerCode)
    setCodeRevealed(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promoBannerCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = promoBannerCode
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <div className={`relative rounded-2xl p-10 text-black mb-12 overflow-hidden shadow-2xl shadow-primary/20 ${config?.style?.backgroundColor ? '' : 'bg-gradient-to-r from-primary to-green-600'}`}
        style={config?.style?.backgroundColor ? { backgroundColor: config.style.backgroundColor } : undefined}>
        {/* Decorative Circle */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-extrabold mb-2">
            {hasPromoCode ? `${discountLabel} on All Scripts – Limited Time!` : 'Special Offers on All Scripts!'}
          </h2>
          <p className="font-medium text-black/80 mb-6">
            {hasPromoCode
              ? `Upgrade your toolkit and save ${discountLabel.toLowerCase()} when you buy any premium script or tool.`
              : 'Upgrade your toolkit with our premium scripts and tools at great prices.'}
          </p>

          {hasPromoCode ? (
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
              <Icon name="tag" size={20} />
              Grab Offer Now
            </button>
          ) : (
            <Link
              href="/scripts"
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <Icon name="tag" size={20} />
              Browse Scripts
            </Link>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <Icon name="x" size={20} />
            </button>

            {!codeRevealed ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="gift" size={32} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Get Your {discountLabel} Discount
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Enter your email to reveal your exclusive discount code.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Icon name="mail" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRevealCode()}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    onClick={handleRevealCode}
                    disabled={!email.trim()}
                    className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get My Discount
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="check-circle" size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Your Discount Code
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Use this code at checkout to save {discountLabel.toLowerCase()}.
                  </p>
                </div>

                <div className="bg-[#0a0a0a] border-2 border-dashed border-primary rounded-lg p-4 flex items-center justify-between mb-4">
                  <span className="font-mono text-xl font-bold text-white tracking-wider">
                    {promoBannerCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-sm text-primary hover:opacity-80"
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={16} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <Link
                  href="/scripts"
                  onClick={() => setShowModal(false)}
                  className="block w-full bg-primary text-black font-bold py-3 rounded-lg hover:opacity-90 transition-opacity text-center"
                >
                  Shop Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
