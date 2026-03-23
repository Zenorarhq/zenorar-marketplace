'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/contexts/AuthContext'

const SCRIPT_TYPE_OPTIONS = [
  'PHP / Laravel scripts',
  'Node.js / Express scripts',
  'Python scripts',
  'React / Next.js components',
  'WordPress plugins',
  'Browser extensions',
  'CLI tools',
  'Other',
]

export default function ContributorApplyPage() {
  const { user } = useAuth()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    country: '',
    websiteUrl: '',
    bio: '',
    scriptTypes: '',
    plannedSubmissions: '',
    marketplaceExperience: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: user.email, fullName: f.fullName || user.name || '' }))
    apiFetch<any>('/contributor/application').then((res) => {
      if (res.success && res.data) setExistingStatus(res.data.status)
    }).catch(() => {}).finally(() => setCheckingStatus(false))
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.fullName || !form.email || !form.country || !form.bio || !form.scriptTypes) {
      setError('Full name, email, country, bio, and script types are required')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch<any>('/contributor/apply', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          country: form.country,
          websiteUrl: form.websiteUrl || undefined,
          bio: form.bio,
          scriptTypes: form.scriptTypes,
          plannedSubmissions: form.plannedSubmissions ? Number(form.plannedSubmissions) : undefined,
          marketplaceExperience: form.marketplaceExperience || undefined,
        }),
      })
      if (!res.success) throw new Error(res.error || 'Application failed')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors'
  const labelCls = 'block text-sm font-medium text-slate-300 mb-2'

  if (checkingStatus) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background-dark flex flex-col">
          <Header />
          <CategoryNav />
          <main className="flex-grow flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  if (existingStatus) {
    const messages: Record<string, { icon: string; title: string; body: string }> = {
      PENDING:  { icon: 'clock',    title: 'Application Under Review',     body: "Your application has been submitted and is being reviewed. We'll be in touch soon." },
      APPROVED: { icon: 'check',    title: "You're Already a Contributor!", body: 'Your application was approved. Head to your Contributor dashboard to submit scripts.' },
      REJECTED: { icon: 'x-circle', title: 'Application Not Approved',     body: 'Your previous application was not approved. Contact support if you believe this is an error.' },
    }
    const m = messages[existingStatus] || messages.PENDING
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background-dark flex flex-col">
          <Header />
          <CategoryNav />
          <main className="flex-grow flex items-center justify-center px-4 py-20">
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-10 text-center max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-6">
                <Icon name={m.icon} size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{m.title}</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">{m.body}</p>
              <Link
                href={existingStatus === 'APPROVED' ? '/profile/contributor' : '/profile'}
                className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all"
              >
                {existingStatus === 'APPROVED' ? 'Go to Contributor Dashboard' : 'Back to Profile'}
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  if (success) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background-dark flex flex-col">
          <Header />
          <CategoryNav />
          <main className="flex-grow flex items-center justify-center px-4 py-20">
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-10 text-center max-w-md w-full">
              <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-6">
                <Icon name="check" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Application Submitted!</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Thanks for applying! Our team will review your application and get back to you.
              </p>
              <Link
                href="/profile"
                className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all"
              >
                Back to Profile
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />

        <main className="flex-grow max-w-container mx-auto px-4 sm:px-8 lg:px-12 py-12 w-full">
          <Link href="/become-a-contributor" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm mb-8">
            <Icon name="arrow-left" size={16} />
            Back to Contributor Programme
          </Link>

          <div className="max-w-xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Contributor Application</h1>
              <p className="text-slate-400">Tell us about yourself and what you build. Our team reviews each application personally.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface-dark rounded-2xl border border-border-dark p-8 space-y-6">
              {/* Full Name */}
              <div>
                <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Your full name" className={inputCls} />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com" className={inputCls} />
              </div>

              {/* Country */}
              <div>
                <label className={labelCls}>Country <span className="text-red-400">*</span></label>
                <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. United States, Nigeria, UK" className={inputCls} />
              </div>

              {/* Website */}
              <div>
                <label className={labelCls}>Website / Portfolio <span className="text-slate-500 font-normal">(optional)</span></label>
                <input type="text" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://yoursite.com" className={inputCls} />
              </div>

              {/* Bio */}
              <div>
                <label className={labelCls}>About You <span className="text-red-400">*</span></label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell us about your development background, experience, and why you want to contribute to Zenorar."
                  rows={4} className={`${inputCls} resize-none`} />
              </div>

              {/* Script Types */}
              <div>
                <label className={labelCls}>What types of scripts do you build? <span className="text-red-400">*</span></label>
                <textarea value={form.scriptTypes} onChange={(e) => setForm({ ...form, scriptTypes: e.target.value })}
                  placeholder="e.g. PHP automation tools, Node.js bots, browser extensions, WordPress plugins..."
                  rows={3} className={`${inputCls} resize-none`} />
                <p className="text-slate-500 text-xs mt-1.5">Common: {SCRIPT_TYPE_OPTIONS.join(', ')}</p>
              </div>

              {/* Planned Submissions */}
              <div>
                <label className={labelCls}>How many scripts do you plan to submit? <span className="text-slate-500 font-normal">(optional)</span></label>
                <input type="number" min="1" value={form.plannedSubmissions} onChange={(e) => setForm({ ...form, plannedSubmissions: e.target.value })}
                  placeholder="e.g. 3" className={inputCls} />
              </div>

              {/* Marketplace Experience */}
              <div>
                <label className={labelCls}>Marketplace Experience <span className="text-slate-500 font-normal">(optional)</span></label>
                <input type="text" value={form.marketplaceExperience} onChange={(e) => setForm({ ...form, marketplaceExperience: e.target.value })}
                  placeholder="e.g. Sold on CodeCanyon, Envato, Gumroad, own store..."
                  className={inputCls} />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
