'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface Thresholds {
  light: { min: number; max: number }
  medium: { min: number; max: number }
  heavy: { min: number; max: number }
}

const LEVELS = [
  {
    key: 'light' as const,
    label: 'Light Protection',
    description: 'Basic: comments stripped, variables renamed, license checks in 5-10 files',
    shield: 1,
  },
  {
    key: 'medium' as const,
    label: 'Medium Protection',
    description: 'Standard: + string encoding, dead code, function renaming, checks in 10-20 files',
    shield: 2,
  },
  {
    key: 'heavy' as const,
    label: 'Heavy Protection',
    description: 'Maximum: + control flow flattening, self-defending, checks in 20-50 files',
    shield: 3,
  },
]

export default function ProtectionLevelsSection() {
  const [thresholds, setThresholds] = useState<Thresholds>({
    light: { min: 0, max: 30 },
    medium: { min: 30, max: 100 },
    heavy: { min: 100, max: 999999 },
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    apiFetch<Thresholds>('/settings/protection-levels').then(res => {
      if (res.success && res.data) setThresholds(res.data)
    })
  }, [])

  const handleChange = (level: keyof Thresholds, field: 'min' | 'max', value: string) => {
    const num = value === '' ? 0 : Number(value)
    setThresholds(prev => ({
      ...prev,
      [level]: { ...prev[level], [field]: num },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await apiFetch<Thresholds>('/settings/protection-levels', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds),
    })

    setSaving(false)
    if (res.success && res.data) {
      setThresholds(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(res.error || 'Failed to save')
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4 sm:p-6 border border-white/5">
      <button onClick={() => setIsExpanded(prev => !prev)} className="w-full flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-white">Script Protection Levels</h3>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
      </button>

      {isExpanded && (
        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-4">Auto-applied based on product price during file upload.</p>

          <div className="space-y-3">
            {LEVELS.map(level => (
              <div key={level.key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: level.shield }).map((_, i) => (
                    <Icon key={i} name="shield" size={16} className="text-primary" />
                  ))}
                  <span className="text-sm font-semibold text-white">{level.label}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">{level.description}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Min Price $</label>
                    <input
                      type="number"
                      value={thresholds[level.key].min}
                      onChange={e => handleChange(level.key, 'min', e.target.value)}
                      className="w-20 bg-[#111] border border-[#333] rounded px-2 py-1 text-sm text-white"
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Max Price $</label>
                    <input
                      type="number"
                      value={level.key === 'heavy' && thresholds[level.key].max >= 999999 ? '' : thresholds[level.key].max}
                      onChange={e => handleChange(level.key, 'max', e.target.value || '999999')}
                      placeholder={level.key === 'heavy' ? '∞' : ''}
                      className="w-20 bg-[#111] border border-[#333] rounded px-2 py-1 text-sm text-white placeholder:text-slate-500"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          {saved && <p className="text-green-400 text-sm mt-3">Settings saved!</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Protection Settings'}
          </button>
        </div>
      )}
    </div>
  )
}