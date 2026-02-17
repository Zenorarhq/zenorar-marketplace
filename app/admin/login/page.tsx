'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, logout, isAuthenticated, isLoading, isStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Fetch branding settings for logo
  const { data: brandingData } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000,
  })

  const siteLogo = brandingData?.logoUrl || null

  useEffect(() => {
    if (!isLoading && isAuthenticated && isStaff) {
      router.push('/admin')
    }
  }, [isAuthenticated, isLoading, isStaff, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await login(email, password)

    if (result.success) {
      if (!result.user?.isStaff) {
        logout()
        setError('Invalid credentials. Admin access only')
        setSubmitting(false)
        return
      }
      router.push('/admin')
    } else {
      setError(result.error || 'Login failed')
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Icon name="loading" size={40} className="text-primary animate-spin" />
      </div>
    )
  }

  if (isAuthenticated && isStaff) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            {siteLogo ? (
              <img src={siteLogo} alt="Site Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="inline-flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-xl">Z</span>
                </div>
                <span className="text-white text-xl font-bold">Zenorar</span>
              </div>
            )}
          </Link>
          <p className="text-slate-500 mt-2">Sign in to Admin Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                <Icon name="alert-circle" size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email Address
              </label>
              <div className="relative">
                <Icon
                  name="mail"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zenorar.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <Icon
                  name="lock"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 pl-10 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-black font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Icon name="loading" size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Icon name="login" size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-[#1f1f1f]">
            <p className="text-slate-500 text-xs text-center mb-3">Demo Credentials</p>
            <div className="bg-[#1a1a1a] rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <button
                  type="button"
                  onClick={() => setEmail('admin@zenorar.com')}
                  className="text-primary hover:underline"
                >
                  admin@zenorar.com
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <button
                  type="button"
                  onClick={() => setPassword('admin123')}
                  className="text-primary hover:underline"
                >
                  admin123
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Site */}
        <p className="text-center mt-6">
          <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  )
}
