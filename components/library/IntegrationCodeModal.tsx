'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

interface License {
  id: string
  productId: string
  licenseKey: string
}

interface SnippetResult {
  snippet: string
  language: string
  instructions: string
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'dart', label: 'Dart' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

export default function IntegrationCodeModal({ isOpen, onClose, productId, productName }: Props) {
  const [licenseId, setLicenseId] = useState<string | null>(null)
  const [language, setLanguage] = useState('javascript')
  const [snippet, setSnippet] = useState<SnippetResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's license for this product
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    apiFetch<License[]>('/licenses/my').then(res => {
      if (res.success && res.data) {
        const license = res.data.find(l => l.productId === productId)
        if (license) {
          setLicenseId(license.id)
        } else {
          setError('No license found for this product')
        }
      } else {
        setError(res.error || 'Failed to load licenses')
      }
    })
  }, [isOpen, productId])

  // Fetch snippet when language or licenseId changes
  useEffect(() => {
    if (!licenseId) return
    setLoading(true)
    setError(null)
    apiFetch<SnippetResult>(`/licenses/${licenseId}/snippet?language=${language}`).then(res => {
      setLoading(false)
      if (res.success && res.data) {
        setSnippet(res.data)
      } else {
        setError(res.error || 'Failed to load snippet')
      }
    })
  }, [licenseId, language])

  const handleCopy = () => {
    if (!snippet) return
    navigator.clipboard.writeText(snippet.snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark rounded-2xl p-5 sm:p-8 max-w-2xl w-full border border-border-dark max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Integration Code</h3>
            <p className="text-sm text-slate-400 mt-1">{productName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Language selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Language</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  language === lang.value
                    ? 'bg-primary text-black font-bold'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code display */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Icon name="alert-circle" size={32} className="text-red-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : snippet ? (
            <div>
              <div className="bg-black border border-border-dark rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border-dark">
                  <span className="text-xs text-slate-500">{snippet.language}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={14} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre">
                  {snippet.snippet}
                </pre>
              </div>
              {snippet.instructions && (
                <div className="mt-4 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Instructions</h4>
                  <p className="text-sm text-slate-300 whitespace-pre-line">{snippet.instructions}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}