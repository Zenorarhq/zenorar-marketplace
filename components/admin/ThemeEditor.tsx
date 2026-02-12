'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { settingsApi } from '@/lib/api/settings'

// ─── Types ──────────────────────────────────────────────────────────────

interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  surfaceLight: string
  border: string
  textPrimary: string
  textSecondary: string
}

interface ThemeData {
  preset: string
  colors: ThemeColors
  typography: { headingFont: string; bodyFont: string }
}

// ─── Presets ─────────────────────────────────────────────────────────────

const DEFAULT_COLORS: ThemeColors = {
  primary: '#43D678',
  secondary: '#3B82F6',
  background: '#000000',
  surface: '#121212',
  surfaceLight: '#1A1A1A',
  border: '#1F1F1F',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
}

const PRESETS: Record<string, { name: string; colors: ThemeColors }> = {
  'default-dark': {
    name: 'Default Dark',
    colors: DEFAULT_COLORS,
  },
  'midnight-blue': {
    name: 'Midnight Blue',
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      background: '#030712',
      surface: '#111827',
      surfaceLight: '#1F2937',
      border: '#1F2937',
      textPrimary: '#F9FAFB',
      textSecondary: '#9CA3AF',
    },
  },
  'purple-haze': {
    name: 'Purple Haze',
    colors: {
      primary: '#A855F7',
      secondary: '#EC4899',
      background: '#09090B',
      surface: '#18181B',
      surfaceLight: '#27272A',
      border: '#27272A',
      textPrimary: '#FAFAFA',
      textSecondary: '#A1A1AA',
    },
  },
  'ember-glow': {
    name: 'Ember Glow',
    colors: {
      primary: '#F97316',
      secondary: '#EAB308',
      background: '#0C0A09',
      surface: '#1C1917',
      surfaceLight: '#292524',
      border: '#292524',
      textPrimary: '#FAFAF9',
      textSecondary: '#A8A29E',
    },
  },
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'system-ui', label: 'System Default' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Georgia', label: 'Georgia' },
]

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  background: 'Background',
  surface: 'Surface',
  surfaceLight: 'Surface Light',
  border: 'Border',
  textPrimary: 'Text Primary',
  textSecondary: 'Text Secondary',
}

// ─── Component ───────────────────────────────────────────────────────────

export default function ThemeEditor() {
  const [expanded, setExpanded] = useState(false)
  const [preset, setPreset] = useState('default-dark')
  const [colors, setColors] = useState<ThemeColors>({ ...DEFAULT_COLORS })
  const [headingFont, setHeadingFont] = useState('Inter')
  const [bodyFont, setBodyFont] = useState('Inter')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Load saved theme
  useEffect(() => {
    settingsApi.getSetting('site_theme').then((res) => {
      if (res.success && res.data?.value) {
        try {
          const parsed = typeof res.data.value === 'string' ? JSON.parse(res.data.value) : res.data.value
          if (parsed?.colors) {
            setColors({ ...DEFAULT_COLORS, ...parsed.colors })
            setPreset(parsed.preset || 'custom')
          } else if (parsed?.primaryColor) {
            // Backward compat with old format
            setColors({ ...DEFAULT_COLORS, primary: parsed.primaryColor })
            setPreset('custom')
          }
          if (parsed?.typography?.headingFont) setHeadingFont(parsed.typography.headingFont)
          if (parsed?.typography?.bodyFont) setBodyFont(parsed.typography.bodyFont)
        } catch {}
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const applyPreset = (presetId: string) => {
    const p = PRESETS[presetId]
    if (!p) return
    setPreset(presetId)
    setColors({ ...p.colors })
  }

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
    setPreset('custom')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const themeData: ThemeData = {
        preset,
        colors,
        typography: { headingFont, bodyFont },
      }
      await settingsApi.updateSettings([
        { key: 'site_theme', value: JSON.stringify(themeData), group: 'cms', isPublic: true },
      ])

      // Apply CSS variables immediately
      const colorMap: Record<string, string> = {
        primary: '--theme-primary',
        secondary: '--theme-secondary',
        background: '--theme-background',
        surface: '--theme-surface',
        surfaceLight: '--theme-surface-light',
        border: '--theme-border',
        textPrimary: '--theme-text-primary',
        textSecondary: '--theme-text-secondary',
      }
      for (const [key, varName] of Object.entries(colorMap)) {
        if (colors[key as keyof ThemeColors]) {
          document.documentElement.style.setProperty(varName, colors[key as keyof ThemeColors])
        }
      }
      if (headingFont) {
        document.documentElement.style.setProperty('--theme-font-heading', `'${headingFont}', sans-serif`)
      }
      if (bodyFont) {
        document.documentElement.style.setProperty('--theme-font-body', `'${bodyFont}', sans-serif`)
      }

      setSaveMessage('Theme saved!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to save theme.')
    }
    setSaving(false)
  }

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 p-4 w-full text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
          {/* Color swatch preview */}
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            <div style={{ backgroundColor: colors.primary }} />
            <div style={{ backgroundColor: colors.secondary }} />
            <div style={{ backgroundColor: colors.surface }} />
            <div style={{ backgroundColor: colors.border }} />
          </div>
        </div>
        <div className="flex-1">
          <span className="text-white font-medium text-sm block">Design & Theme</span>
          <span className="text-slate-500 text-xs">
            {preset === 'custom' ? 'Custom theme' : PRESETS[preset]?.name || 'Default Dark'} — {Object.keys(COLOR_LABELS).length} colors, fonts
          </span>
        </div>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} className="text-slate-400" />
      </button>

      {/* Expanded Editor */}
      {expanded && (
        <div className="border-t border-[#1f1f1f] p-4 space-y-6">
          {loading ? (
            <div className="text-center py-6">
              <Icon name="loading" size={24} className="text-primary animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Presets */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-3">Theme Presets</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(PRESETS).map(([id, p]) => (
                    <button
                      key={id}
                      onClick={() => applyPreset(id)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        preset === id
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-[#2a2a2a] bg-[#0e0e0e] hover:border-[#3a3a3a]'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        {[p.colors.primary, p.colors.secondary, p.colors.surface, p.colors.border, p.colors.textSecondary].map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-white/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-white text-xs font-medium">{p.name}</span>
                    </button>
                  ))}
                  {/* Custom indicator */}
                  {preset === 'custom' && (
                    <div className="p-3 rounded-xl border border-primary/50 bg-primary/5">
                      <div className="flex gap-1 mb-2">
                        {[colors.primary, colors.secondary, colors.surface, colors.border, colors.textSecondary].map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-white/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-white text-xs font-medium">Custom</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-3">Color Palette</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((key) => (
                    <div key={key}>
                      <label className="text-slate-500 text-xs mb-1 block">{COLOR_LABELS[key]}</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={colors[key] || '#000000'}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={colors[key] || ''}
                          onChange={(e) => updateColor(key, e.target.value)}
                          placeholder="#000000"
                          className="flex-1 min-w-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-3">Typography</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Heading Font</label>
                    <select
                      value={headingFont}
                      onChange={(e) => { setHeadingFont(e.target.value); setPreset('custom') }}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                    >
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Body Font</label>
                    <select
                      value={bodyFont}
                      onChange={(e) => { setBodyFont(e.target.value); setPreset('custom') }}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
                    >
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between pt-2">
                {saveMessage && (
                  <span className={`text-xs ${saveMessage.includes('saved') ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Icon name="loading" size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      Save Theme
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
