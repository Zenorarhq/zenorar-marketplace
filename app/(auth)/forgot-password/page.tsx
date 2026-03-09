'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { data: brandingData } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000,
  })

  const siteLogo = brandingData?.logoUrl || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'An error occurred')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
            {siteLogo ? (
              <img src={siteLogo} alt="Site Logo" className="h-8 w-auto object-contain" />
            ) : (
              <>
                <Icon name="grid-view" size={24} />
                Marketplace
              </>
            )}
          </Link>
        </div>

        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="mail" size={30} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Check your email</h1>
              <p className="text-slate-400 mb-8">
                We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-primary hover:underline"
                >
                  try again
                </button>
              </p>
              <Link
                href="/login"
                className="text-primary font-bold hover:underline flex items-center justify-center gap-2"
              >
                <Icon name="arrow-left" size={18} />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon name="lock" size={30} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
                <p className="text-slate-400">
                  No worries, we&apos;ll send you reset instructions.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Icon name="mail" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="Enter your email"
                      className="w-full bg-background-dark border border-border-dark rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/login"
                  className="text-slate-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon name="arrow-left" size={18} />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
