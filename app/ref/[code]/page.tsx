'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import { validateReferralCode } from '@/lib/api/referrals'
import { formatCurrency } from '@/lib/currency'
import { apiFetch } from '@/lib/api/client'

export default function ReferralLandingPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string
  const [validation, setValidation] = useState<{
    valid: boolean
    referrerName?: string
    message?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch branding settings for logo (using public endpoint like AdminLayout)
  const { data: brandingData } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000
  })

  const logoUrl = brandingData?.logoUrl || null
  const siteName = brandingData?.siteName || 'Marketplace'

  useEffect(() => {
    const validate = async () => {
      if (!code) {
        router.push('/')
        return
      }

      setIsLoading(true)
      try {
        const result = await validateReferralCode(code)
        if (result.success && result.data) {
          setValidation(result.data)
        } else {
          setValidation({ valid: false, message: 'Invalid referral code' })
        }
      } catch (error) {
        setValidation({ valid: false, message: 'Failed to validate code' })
      } finally {
        setIsLoading(false)
      }
    }

    validate()
  }, [code, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Icon name="loading" size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Validating referral code...</p>
        </div>
      </div>
    )
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Icon name="close-circle" size={48} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Invalid Referral Code</h1>
          <p className="text-slate-400 mb-8">
            {validation?.message || 'This referral code is not valid or has expired.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <header className="border-b border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl text-white">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black">
                <Icon name="grid-view" size={24} />
              </div>
            )}
            {siteName}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6">
            <Icon name="gift" size={56} className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            You've Been Invited!
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            <span className="text-primary font-bold">{validation.referrerName}</span> has invited you to join Zenorar Marketplace
          </p>
          <p className="text-slate-400">
            Sign up now and get a special welcome bonus
          </p>
        </div>

        {/* Rewards Card */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-3xl p-8 mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Icon name="wallet" size={32} className="text-primary" />
            <h2 className="text-2xl font-bold text-white">Welcome Bonus</h2>
          </div>

          <div className="text-center mb-8">
            <p className="text-slate-300 mb-4">When you sign up and make your first purchase, you'll receive:</p>
            <div className="inline-block bg-black/40 border border-primary/40 rounded-2xl px-8 py-6">
              <p className="text-5xl font-bold text-primary mb-2">{formatCurrency(10)}</p>
              <p className="text-slate-400 text-sm">Credit to your wallet</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <p className="text-white font-semibold mb-1">Sign Up</p>
              <p className="text-slate-400 text-sm">Create your account using this link</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <p className="text-white font-semibold mb-1">Make a Purchase</p>
              <p className="text-slate-400 text-sm">Buy any product from our marketplace</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <p className="text-white font-semibold mb-1">Get Rewarded</p>
              <p className="text-slate-400 text-sm">Receive {formatCurrency(10)} in your wallet</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={`/signup?ref=${code}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-bold text-lg rounded-xl hover:brightness-105 transition-all"
            >
              <Icon name="user-plus" size={20} />
              Sign Up & Claim Bonus
            </Link>
            <p className="text-slate-500 text-xs mt-3">Already have an account? <Link href="/login" className="text-primary hover:underline">Login</Link></p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black border border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Icon name="shield" size={24} className="text-primary" />
            </div>
            <h3 className="text-white font-bold mb-2">Secure Platform</h3>
            <p className="text-slate-400 text-sm">
              Your purchases and personal information are protected with industry-leading security
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Icon name="flash" size={24} className="text-primary" />
            </div>
            <h3 className="text-white font-bold mb-2">Instant Delivery</h3>
            <p className="text-slate-400 text-sm">
              Get immediate access to your digital products after purchase
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Icon name="star" size={24} className="text-primary" />
            </div>
            <h3 className="text-white font-bold mb-2">Premium Quality</h3>
            <p className="text-slate-400 text-sm">
              All products are carefully curated and verified for quality
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div className="bg-black border border-border-dark rounded-xl p-6">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Icon name="info" size={18} className="text-primary" />
                How do I get my welcome bonus?
              </h4>
              <p className="text-slate-400 text-sm">
                Simply sign up using this referral link and make your first purchase. Your {formatCurrency(10)} bonus will be automatically credited to your wallet after your purchase is complete.
              </p>
            </div>

            <div className="bg-black border border-border-dark rounded-xl p-6">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Icon name="info" size={18} className="text-primary" />
                How can I use my wallet credit?
              </h4>
              <p className="text-slate-400 text-sm">
                Your wallet credit can be used at checkout to reduce your order total. You can use it in combination with other payment methods or save it for future purchases.
              </p>
            </div>

            <div className="bg-black border border-border-dark rounded-xl p-6">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Icon name="info" size={18} className="text-primary" />
                Can I refer my own friends?
              </h4>
              <p className="text-slate-400 text-sm">
                Yes! Once you sign up, you'll get your own referral code. Share it with friends and earn {formatCurrency(10)} for each person who makes a purchase using your code.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-dark mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
