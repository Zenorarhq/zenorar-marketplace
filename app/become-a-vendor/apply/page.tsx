'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { apiFetch } from '@/lib/api/client'

const AVG_ORDER_OPTIONS = [
  { value: 'under_500', label: 'Under $500 / month' },
  { value: '500_2000', label: '$500 – $2,000 / month' },
  { value: '2000_5000', label: '$2,000 – $5,000 / month' },
  { value: '5000_10000', label: '$5,000 – $10,000 / month' },
  { value: 'over_10000', label: 'Over $10,000 / month' },
]

export default function VendorApplyPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    country: '',
    avgOrderVolume: '',
  })
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idPreview, setIdPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }
    setIdFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setIdPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadId(): Promise<string> {
    if (!idFile) throw new Error('No file selected')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', idFile)
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success || !data.data?.url) throw new Error(data.error || 'Upload failed')
      return data.data.url as string
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.fullName || !form.businessName || !form.country || !form.avgOrderVolume) {
      setError('All fields are required')
      return
    }
    if (!idFile) {
      setError('Please upload a photo of your ID')
      return
    }

    setSubmitting(true)
    try {
      const idDocumentUrl = await uploadId()
      const res = await apiFetch<any>('/vendor/apply', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          businessName: form.businessName,
          country: form.country,
          avgOrderVolume: form.avgOrderVolume,
          idDocumentUrl,
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
                Thanks! Our team will review your application and email you within 1–3 business days.
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
          {/* Back link */}
          <Link href="/become-a-vendor" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm mb-8">
            <Icon name="arrow-left" size={16} />
            Back to Vendor Programme
          </Link>

          <div className="max-w-xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Vendor Application</h1>
              <p className="text-slate-400">All fields are required. Your application will be reviewed within 1–3 business days.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface-dark rounded-2xl border border-border-dark p-8 space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Legal Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Your full legal name"
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Business / Trade Name</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Your business or reseller brand name"
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Country of Operation</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. United States, Nigeria, UAE"
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Average Order Volume */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Average Monthly Order Volume</label>
                <select
                  value={form.avgOrderVolume}
                  onChange={(e) => setForm({ ...form, avgOrderVolume: e.target.value })}
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled>Select a range</option>
                  {AVG_ORDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* ID Document Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Government-Issued ID{' '}
                  <span className="text-slate-500 font-normal">(front photo only — passport, national ID, driver&apos;s licence)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border-dark rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {idPreview ? (
                    <div className="space-y-3">
                      <img src={idPreview} alt="ID preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <p className="text-slate-400 text-sm">{idFile?.name}</p>
                      <p className="text-primary text-xs">Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-border-dark rounded-xl flex items-center justify-center mx-auto">
                        <Icon name="upload" size={20} className="text-slate-400" />
                      </div>
                      <p className="text-slate-300 font-medium">Click to upload ID photo</p>
                      <p className="text-slate-500 text-xs">JPG, PNG or PDF — max 10 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Privacy note */}
              <p className="text-slate-500 text-xs leading-relaxed">
                Your ID is used solely for identity verification and is stored securely. It will not be shared with third parties.
              </p>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading ID...' : submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}