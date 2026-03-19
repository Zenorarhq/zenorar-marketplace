'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface CommissionTier {
  min: number
  max: number
  commission: number
}

interface ScriptCommissionTiers {
  tier1: CommissionTier
  tier2: CommissionTier
  tier3: CommissionTier
}

const TIERS: { key: keyof ScriptCommissionTiers; label: string; hint: string }[] = [
  { key: 'tier1', label: 'Tier 1 (Low Price)', hint: 'e.g. $0 – $50' },
  { key: 'tier2', label: 'Tier 2 (Mid Price)', hint: 'e.g. $50 – $150' },
  { key: 'tier3', label: 'Tier 3 (High Price)', hint: 'e.g. $150+' },
]

const empty = (): CommissionTier => ({ min: 0, max: 0, commission: 0 })

export default function ScriptCommissionTiersSection() {
  const [tiers, setTiers] = useState<ScriptCommissionTiers>({
    tier1: empty(),
    tier2: empty(),
    tier3: empty(),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    apiFetch<ScriptCommissionTiers>('/settings/script-commission-tiers').then(res => {
      if (res.success && res.data) setTiers(res.data)
    })
  }, [])

  const handleChange = (tier: keyof ScriptCommissionTiers, field: keyof CommissionTier, value: string) => {
    const num = value === '' ? 0 : Number(value)
    setTiers(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: num },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await apiFetch<ScriptCommissionTiers>('/settings/script-commission-tiers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tiers),
    })

    setSaving(false)
    if (res.success && res.data) {
      setTiers(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError((res as any).error || 'Failed to save')
    }
  }

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
      <button onClick={() => setIsExpanded(prev => !prev)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Icon name="layers" size={24} className="text-orange-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">Script Commission Tiers</p>
            <p className="text-slate-500 text-sm">Vendor commission % based on script sale price range</p>
          </div>
        </div>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400 flex-shrink-0" />
      </button>

      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-3">
          <p className="text-sm text-slate-500 mb-4">Commission is calculated from markup profit (sale price − cost price). If no tier matches, commission is 0%.</p>

          {TIERS.map(({ key, label, hint }) => (
            <div key={key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-xs text-slate-500">{hint}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Min Price $</label>
                  <input
                    type="number"
                    value={tiers[key].min || ''}
                    onChange={e => handleChange(key, 'min', e.target.value)}
                    placeholder="0"
                    className="w-24 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    min={0}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Max Price $</label>
                  <input
                    type="number"
                    value={tiers[key].max || ''}
                    onChange={e => handleChange(key, 'max', e.target.value)}
                    placeholder="∞"
                    className="w-24 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                    min={0}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Commission %</label>
                  <input
                    type="number"
                    value={tiers[key].commission || ''}
                    onChange={e => handleChange(key, 'commission', e.target.value)}
                    placeholder="0"
                    className="w-20 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </div>
              </div>
            </div>
          ))}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          {saved && <p className="text-green-400 text-sm mt-3">Saved successfully.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-primary text-black text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Commission Tiers'}
          </button>
        </div>
      )}
    </div>
  )
}
