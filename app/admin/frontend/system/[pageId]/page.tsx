'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { settingsApi } from '@/lib/api/settings'

// ─── Section Registry ───────────────────────────────────────────────────

interface SectionDef {
  id: string
  name: string
  icon: string
  defaultConfig: Record<string, any>
}

const HOME_SECTIONS: SectionDef[] = [
  { id: 'hero-slider', name: 'Hero Slider', icon: 'image', defaultConfig: {} },
  { id: 'most-popular', name: 'Most Popular', icon: 'chart', defaultConfig: { title: 'Most Popular' } },
  { id: 'how-it-works', name: 'How It Works', icon: 'info', defaultConfig: { title: 'How It Works' } },
  { id: 'trust-banner', name: 'Trust Banner', icon: 'shield', defaultConfig: { rating: '4.8', reviewCount: 'Over 1,000 5 star reviews', trustStatement: 'Trusted since 2020', paymentStats: '10k+ payments processed every day' } },
  { id: 'promo-banner', name: 'Promo Banner', icon: 'tag', defaultConfig: {} },
  { id: 'script-categories', name: 'Script Categories', icon: 'grid-view', defaultConfig: { title: 'Scripts Categories' } },
  { id: 'staff-picks', name: 'Staff Picks', icon: 'crown', defaultConfig: { title: 'Staff Picks' } },
  { id: 'connectivity', name: 'Connectivity', icon: 'wifi', defaultConfig: { title: 'Connectivity' } },
]

const DYNAMIC_SECTION_TYPES: SectionDef[] = [
  { id: 'text-block', name: 'Text / HTML Block', icon: 'note', defaultConfig: { title: '', content: '', alignment: 'left' } },
  { id: 'image-banner', name: 'Image Banner', icon: 'image', defaultConfig: { imageUrl: '', title: '', subtitle: '', buttonText: '', buttonLink: '', height: 'medium', overlayDarkness: 'medium' } },
  { id: 'product-showcase', name: 'Product Showcase', icon: 'store', defaultConfig: { title: '', productIds: '', columns: '4' } },
  { id: 'testimonials', name: 'Testimonials', icon: 'chat', defaultConfig: { title: '', testimonials: [] } },
]

const SYSTEM_PAGES: Record<string, { name: string; path: string; sections: SectionDef[] }> = {
  home: { name: 'Home Page', path: '/', sections: HOME_SECTIONS },
}

// ─── Types ──────────────────────────────────────────────────────────────

interface SectionLayout {
  id: string
  type?: string
  visible: boolean
  config: Record<string, any>
}

interface Slide {
  image: string
  title: string
  titleHighlight: string
  subtitle: string
  buttonText: string
  buttonLink: string
}

// Default slides for Hero Slider
const DEFAULT_SLIDES: Slide[] = [
  { image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop', title: 'Premium', titleHighlight: 'Scripts & Tools', subtitle: 'Discover our collection of high-quality automation scripts, bots, and developer tools.', buttonText: 'Browse Scripts', buttonLink: '/scripts' },
  { image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop', title: 'Digital', titleHighlight: 'Gift Cards', subtitle: 'Shop gift cards for your favorite platforms, games, and services worldwide.', buttonText: 'Buy Gift Cards', buttonLink: '/gift-cards' },
  { image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop', title: 'Global', titleHighlight: 'eSIMs', subtitle: 'Stay connected anywhere with instant eSIMs for 190+ countries worldwide.', buttonText: 'Get eSIM', buttonLink: '/esim' },
  { image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2070&auto=format&fit=crop', title: 'Virtual', titleHighlight: 'Phone Numbers', subtitle: 'Get instant virtual numbers for SMS verification and privacy protection.', buttonText: 'Get Number', buttonLink: '/virtual-numbers' },
]

// ─── Input Components ───────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-slate-500 text-xs mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-slate-500 text-xs mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
        />
        {value && (
          <button onClick={() => onChange('')} className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors" title="Clear">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-slate-500 text-xs mb-1 block">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Grid Preview ───────────────────────────────────────────────────────

function getGridInfo(section: SectionLayout): { cols: number; spans?: number[] } {
  const type = section.type || section.id
  switch (type) {
    case 'hero-slider': return { cols: 3, spans: [2, 1] }
    case 'most-popular': return { cols: parseInt(section.config.columns || '4') }
    case 'script-categories': return { cols: parseInt(section.config.columns || '4') }
    case 'staff-picks': return { cols: parseInt(section.config.columns || '6') }
    case 'connectivity': return { cols: parseInt(section.config.columns || '4') }
    case 'product-showcase': return { cols: parseInt(section.config.columns || '4') }
    case 'testimonials': return { cols: 3 }
    default: return { cols: 1 }
  }
}

function GridPreview({ section }: { section: SectionLayout }) {
  const { cols, spans } = getGridInfo(section)
  if (cols <= 1) {
    return (
      <div className="hidden sm:flex gap-1 flex-1 max-w-[200px]">
        <div className="flex-1 h-3 rounded-sm bg-[#2a2a2a] border border-[#333]" />
      </div>
    )
  }
  return (
    <div className="hidden sm:grid gap-1 flex-1 max-w-[200px]" style={{ gridTemplateColumns: spans ? spans.map(s => `${s}fr`).join(' ') : `repeat(${cols}, 1fr)` }}>
      {(spans || Array.from({ length: cols })).map((_, i) => (
        <div key={i} className="h-3 rounded-sm bg-[#2a2a2a] border border-[#333]" />
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SystemPageEditor() {
  const params = useParams()
  const pageId = params.pageId as string
  const page = SYSTEM_PAGES[pageId]

  const [layout, setLayout] = useState<SectionLayout[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [paletteColors, setPaletteColors] = useState<Record<string, string>>({})

  // Build default layout from section definitions
  const getDefaultLayout = useCallback((): SectionLayout[] => {
    if (!page) return []
    return page.sections.map(s => ({ id: s.id, visible: true, config: { ...s.defaultConfig } }))
  }, [page])

  // Load layout + slides from API
  const loadData = useCallback(async () => {
    setLoading(true)

    // Load layout
    try {
      const res = await settingsApi.getSetting('home_page_layout')
      if (res.success && res.data?.value) {
        const parsed = typeof res.data.value === 'string' ? JSON.parse(res.data.value) : res.data.value
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with defaults — add any new sections that don't exist in saved layout
          const savedIds = new Set(parsed.map((s: SectionLayout) => s.id))
          const missing = getDefaultLayout().filter(s => !savedIds.has(s.id))
          setLayout([...parsed, ...missing])
        } else {
          setLayout(getDefaultLayout())
        }
      } else {
        setLayout(getDefaultLayout())
      }
    } catch {
      setLayout(getDefaultLayout())
    }

    // Load hero slides
    try {
      const res = await settingsApi.getSetting('home_hero_slides')
      if (res.success && res.data?.value) {
        const parsed = typeof res.data.value === 'string' ? JSON.parse(res.data.value) : res.data.value
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed)
        } else {
          setSlides(DEFAULT_SLIDES)
        }
      } else {
        setSlides(DEFAULT_SLIDES)
      }
    } catch {
      setSlides(DEFAULT_SLIDES)
    }

    // Load palette colors from global theme
    try {
      const res = await settingsApi.getSetting('site_theme')
      if (res.success && res.data?.value) {
        const parsed = typeof res.data.value === 'string' ? JSON.parse(res.data.value) : res.data.value
        if (parsed?.colors) setPaletteColors(parsed.colors)
      }
    } catch {}

    setLoading(false)
  }, [getDefaultLayout])

  useEffect(() => {
    if (page) loadData()
  }, [page, loadData])

  // ─── Save ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      await settingsApi.updateSettings([
        { key: 'home_page_layout', value: JSON.stringify(layout), group: 'cms', isPublic: true },
        { key: 'home_hero_slides', value: JSON.stringify(slides), group: 'cms', isPublic: true },
      ])
      setSaveMessage('Saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  // ─── Layout Operations ──────────────────────────────────────────────

  const toggleVisibility = (id: string) => {
    setLayout(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= layout.length) return
    setLayout(prev => {
      const arr = [...prev]
      ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
      return arr
    })
  }

  const updateConfig = (id: string, key: string, value: string) => {
    setLayout(prev => prev.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s))
  }

  const updateStyle = (id: string, key: string, value: string | boolean) => {
    setLayout(prev => prev.map(s => {
      if (s.id !== id) return s
      const style = { ...(s.config.style || {}), [key]: value }
      return { ...s, config: { ...s.config, style } }
    }))
  }

  // ─── Slide Operations ──────────────────────────────────────────────

  const updateSlide = (index: number, field: keyof Slide, value: string) => {
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addSlide = () => {
    setSlides(prev => [...prev, { image: '', title: '', titleHighlight: '', subtitle: '', buttonText: 'Learn More', buttonLink: '/' }])
  }

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return
    setSlides(prev => prev.filter((_, i) => i !== index))
  }

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= slides.length) return
    setSlides(prev => {
      const arr = [...prev]
      ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
      return arr
    })
  }

  // ─── Dynamic Section Operations ──────────────────────────────────

  const [showAddMenu, setShowAddMenu] = useState(false)

  const addSection = (typeId: string) => {
    const typeDef = DYNAMIC_SECTION_TYPES.find(s => s.id === typeId)
    if (!typeDef) return
    const newSection: SectionLayout = {
      id: `${typeId}-${Date.now()}`,
      type: typeId,
      visible: true,
      config: { ...typeDef.defaultConfig },
    }
    setLayout(prev => [...prev, newSection])
    setExpandedSection(newSection.id)
    setShowAddMenu(false)
  }

  const removeSection = (id: string) => {
    setLayout(prev => prev.filter(s => s.id !== id))
    if (expandedSection === id) setExpandedSection(null)
  }

  // ─── Testimonial Helpers ─────────────────────────────────────────

  const updateTestimonial = (sectionId: string, index: number, field: string, value: string) => {
    setLayout(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const testimonials = [...(s.config.testimonials || [])]
      testimonials[index] = { ...testimonials[index], [field]: value }
      return { ...s, config: { ...s.config, testimonials } }
    }))
  }

  const addTestimonial = (sectionId: string) => {
    setLayout(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const testimonials = [...(s.config.testimonials || []), { quote: '', author: '', role: '', avatar: '' }]
      return { ...s, config: { ...s.config, testimonials } }
    }))
  }

  const removeTestimonial = (sectionId: string, index: number) => {
    setLayout(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const testimonials = (s.config.testimonials || []).filter((_: any, i: number) => i !== index)
      return { ...s, config: { ...s.config, testimonials } }
    }))
  }

  // ─── Section Editor Renderers ─────────────────────────────────────

  const getSectionDef = (id: string) => {
    const staticDef = page?.sections.find(s => s.id === id)
    if (staticDef) return staticDef
    const section = layout.find(s => s.id === id)
    const type = section?.type || id
    return DYNAMIC_SECTION_TYPES.find(s => s.id === type) || null
  }

  function renderSectionEditor(section: SectionLayout) {
    switch (section.type || section.id) {
      case 'hero-slider':
        return renderHeroSliderEditor()
      case 'most-popular':
        return (
          <div className="space-y-3">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Most Popular" />
            <SelectField label="Columns" value={section.config.columns || '4'} onChange={(v) => updateConfig(section.id, 'columns', v)} options={[
              { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
            ]} />
          </div>
        )
      case 'trust-banner':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rating" value={section.config.rating || ''} onChange={(v) => updateConfig(section.id, 'rating', v)} placeholder="4.8" />
              <Field label="Review Count Text" value={section.config.reviewCount || ''} onChange={(v) => updateConfig(section.id, 'reviewCount', v)} placeholder="Over 1,000 5 star reviews" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trust Statement" value={section.config.trustStatement || ''} onChange={(v) => updateConfig(section.id, 'trustStatement', v)} placeholder="Trusted since 2020" />
              <Field label="Payment Stats" value={section.config.paymentStats || ''} onChange={(v) => updateConfig(section.id, 'paymentStats', v)} placeholder="10k+ payments processed every day" />
            </div>
          </div>
        )
      case 'promo-banner':
        return (
          <div className="space-y-3">
            <p className="text-slate-500 text-xs">The promo code is managed in Admin &gt; Settings &gt; General. The banner auto-generates text from the discount value.</p>
          </div>
        )
      case 'script-categories':
        return (
          <div className="space-y-3">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Scripts Categories" />
            <SelectField label="Columns" value={section.config.columns || '4'} onChange={(v) => updateConfig(section.id, 'columns', v)} options={[
              { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
            ]} />
          </div>
        )
      case 'staff-picks':
        return (
          <div className="space-y-3">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Staff Picks" />
            <SelectField label="Columns" value={section.config.columns || '6'} onChange={(v) => updateConfig(section.id, 'columns', v)} options={[
              { value: '4', label: '4 Columns' }, { value: '5', label: '5 Columns' }, { value: '6', label: '6 Columns' },
            ]} />
          </div>
        )
      case 'connectivity':
        return (
          <div className="space-y-3">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Connectivity" />
            <SelectField label="Columns" value={section.config.columns || '4'} onChange={(v) => updateConfig(section.id, 'columns', v)} options={[
              { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
            ]} />
          </div>
        )
      case 'text-block':
        return (
          <div className="space-y-3">
            <Field label="Title (optional)" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Section title" />
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Content (HTML)</label>
              <textarea
                value={section.config.content || ''}
                onChange={(e) => updateConfig(section.id, 'content', e.target.value)}
                placeholder="Enter HTML content..."
                rows={6}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 resize-y font-mono"
              />
            </div>
            <SelectField label="Alignment" value={section.config.alignment || 'left'} onChange={(v) => updateConfig(section.id, 'alignment', v)} options={[
              { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
            ]} />
          </div>
        )
      case 'image-banner':
        return (
          <div className="space-y-3">
            <Field label="Image URL" value={section.config.imageUrl || ''} onChange={(v) => updateConfig(section.id, 'imageUrl', v)} placeholder="https://..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Banner title" />
              <Field label="Subtitle" value={section.config.subtitle || ''} onChange={(v) => updateConfig(section.id, 'subtitle', v)} placeholder="Short description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button Text" value={section.config.buttonText || ''} onChange={(v) => updateConfig(section.id, 'buttonText', v)} placeholder="Shop Now" />
              <Field label="Button Link" value={section.config.buttonLink || ''} onChange={(v) => updateConfig(section.id, 'buttonLink', v)} placeholder="/products" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Height" value={section.config.height || 'medium'} onChange={(v) => updateConfig(section.id, 'height', v)} options={[
                { value: 'small', label: 'Small (300px)' }, { value: 'medium', label: 'Medium (400px)' }, { value: 'large', label: 'Large (500px)' },
              ]} />
              <SelectField label="Overlay Darkness" value={section.config.overlayDarkness || 'medium'} onChange={(v) => updateConfig(section.id, 'overlayDarkness', v)} options={[
                { value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'dark', label: 'Dark' },
              ]} />
            </div>
          </div>
        )
      case 'product-showcase':
        return (
          <div className="space-y-3">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="Featured Products" />
            <Field label="Product IDs (comma-separated)" value={section.config.productIds || ''} onChange={(v) => updateConfig(section.id, 'productIds', v)} placeholder="abc123, def456, ghi789" />
            <SelectField label="Columns" value={section.config.columns || '4'} onChange={(v) => updateConfig(section.id, 'columns', v)} options={[
              { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
            ]} />
            <p className="text-slate-600 text-[10px]">Tip: Find product IDs in Admin &gt; Products. Copy the ID from the product details page.</p>
          </div>
        )
      case 'testimonials':
        return (
          <div className="space-y-4">
            <Field label="Section Title" value={section.config.title || ''} onChange={(v) => updateConfig(section.id, 'title', v)} placeholder="What Our Customers Say" />
            {(section.config.testimonials || []).map((t: any, index: number) => (
              <div key={index} className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-medium">Testimonial {index + 1}</span>
                  <button onClick={() => removeTestimonial(section.id, index)} className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors" title="Remove">
                    <Icon name="delete" size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Quote</label>
                    <textarea
                      value={t.quote || ''}
                      onChange={(e) => updateTestimonial(section.id, index, 'quote', e.target.value)}
                      placeholder="Customer testimonial..."
                      rows={3}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 resize-y"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Author" value={t.author || ''} onChange={(v) => updateTestimonial(section.id, index, 'author', v)} placeholder="John Doe" />
                    <Field label="Role" value={t.role || ''} onChange={(v) => updateTestimonial(section.id, index, 'role', v)} placeholder="CEO, Acme Inc" />
                    <Field label="Avatar URL" value={t.avatar || ''} onChange={(v) => updateTestimonial(section.id, index, 'avatar', v)} placeholder="https://..." />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => addTestimonial(section.id)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-xs font-medium hover:bg-[#222] hover:text-white transition-colors"
            >
              <Icon name="add" size={14} />
              Add Testimonial
            </button>
          </div>
        )
      default:
        return <p className="text-slate-500 text-xs">No editor available for this section.</p>
    }
  }

  function renderStyleEditor(section: SectionLayout) {
    const style = section.config?.style || {}
    return (
      <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
        <p className="text-slate-400 text-xs font-medium mb-3">Style Overrides</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            {Object.keys(paletteColors).length > 0 && (
              <select
                value={Object.values(paletteColors).includes(style.backgroundColor) ? style.backgroundColor : ''}
                onChange={(e) => updateStyle(section.id, 'backgroundColor', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1 px-2 text-[10px] text-slate-400 mb-1"
              >
                <option value="">From palette...</option>
                {Object.entries(paletteColors).map(([key, hex]) => (
                  <option key={key} value={hex as string}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} ({hex})</option>
                ))}
              </select>
            )}
            <ColorField label="Background Color" value={style.backgroundColor || ''} onChange={(v) => updateStyle(section.id, 'backgroundColor', v)} />
          </div>
          <div>
            {Object.keys(paletteColors).length > 0 && (
              <select
                value={Object.values(paletteColors).includes(style.textColor) ? style.textColor : ''}
                onChange={(e) => updateStyle(section.id, 'textColor', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1 px-2 text-[10px] text-slate-400 mb-1"
              >
                <option value="">From palette...</option>
                {Object.entries(paletteColors).map(([key, hex]) => (
                  <option key={key} value={hex as string}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} ({hex})</option>
                ))}
              </select>
            )}
            <ColorField label="Text Color" value={style.textColor || ''} onChange={(v) => updateStyle(section.id, 'textColor', v)} />
          </div>
          <SelectField label="Padding" value={style.padding || ''} onChange={(v) => updateStyle(section.id, 'padding', v)} options={[
            { value: '', label: 'Default' },
            { value: 'compact', label: 'Compact' },
            { value: 'spacious', label: 'Spacious' },
          ]} />
          <SelectField label="Border Radius" value={style.borderRadius || ''} onChange={(v) => updateStyle(section.id, 'borderRadius', v)} options={[
            { value: '', label: 'None' },
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]} />
          <SelectField label="Shadow" value={style.shadow || ''} onChange={(v) => updateStyle(section.id, 'shadow', v)} options={[
            { value: '', label: 'None' },
            { value: 'subtle', label: 'Subtle' },
            { value: 'medium', label: 'Medium' },
            { value: 'glow', label: 'Glow' },
          ]} />
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Border</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateStyle(section.id, 'border', !style.border)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${style.border ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-[#1a1a1a] text-slate-400 border border-[#2a2a2a]'}`}
              >
                {style.border ? 'On' : 'Off'}
              </button>
              {style.border && (
                <div className="flex-1">
                  <ColorField label="" value={style.borderColor || ''} onChange={(v) => updateStyle(section.id, 'borderColor', v)} />
                </div>
              )}
            </div>
          </div>
          <SelectField label="Heading Size" value={style.headingSize || ''} onChange={(v) => updateStyle(section.id, 'headingSize', v)} options={[
            { value: '', label: 'Default' },
            { value: 'small', label: 'Small' },
            { value: 'large', label: 'Large' },
            { value: 'xl', label: 'Extra Large' },
          ]} />
          <SelectField label="Heading Weight" value={style.headingWeight || ''} onChange={(v) => updateStyle(section.id, 'headingWeight', v)} options={[
            { value: '', label: 'Default' },
            { value: 'normal', label: 'Normal' },
            { value: 'semibold', label: 'Semibold' },
            { value: 'extrabold', label: 'Extra Bold' },
          ]} />
        </div>
      </div>
    )
  }

  function renderHeroSliderEditor() {
    return (
      <div className="space-y-4">
        {slides.map((slide, index) => (
          <div key={index} className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium">Slide {index + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveSlide(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors" title="Move up">
                  <Icon name="chevron-up" size={14} />
                </button>
                <button onClick={() => moveSlide(index, 'down')} disabled={index === slides.length - 1} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors" title="Move down">
                  <Icon name="chevron-down" size={14} />
                </button>
                <button onClick={() => removeSlide(index)} disabled={slides.length <= 1} className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors" title="Remove slide">
                  <Icon name="delete" size={14} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <div className="w-24 h-16 bg-[#1a1a1a] rounded-lg overflow-hidden flex-shrink-0 border border-[#2a2a2a]">
                {slide.image ? (
                  <Image src={slide.image} alt="Slide preview" width={96} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="image" size={20} className="text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Field label="Image URL" value={slide.image} onChange={(v) => updateSlide(index, 'image', v)} placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Title" value={slide.title} onChange={(v) => updateSlide(index, 'title', v)} placeholder="e.g. Premium" />
              <Field label="Title Highlight" value={slide.titleHighlight} onChange={(v) => updateSlide(index, 'titleHighlight', v)} placeholder="e.g. Scripts & Tools" />
            </div>
            <div className="mb-3">
              <Field label="Subtitle" value={slide.subtitle} onChange={(v) => updateSlide(index, 'subtitle', v)} placeholder="Description text..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button Text" value={slide.buttonText} onChange={(v) => updateSlide(index, 'buttonText', v)} placeholder="e.g. Browse Scripts" />
              <Field label="Button Link" value={slide.buttonLink} onChange={(v) => updateSlide(index, 'buttonLink', v)} placeholder="e.g. /scripts" />
            </div>
          </div>
        ))}

        <button
          onClick={addSlide}
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-xs font-medium hover:bg-[#222] hover:text-white transition-colors"
        >
          <Icon name="add" size={14} />
          Add Slide
        </button>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (!page) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-white text-xl font-bold mb-2">Page not found</h1>
          <p className="text-slate-500 mb-4">The system page &quot;{pageId}&quot; doesn&apos;t exist.</p>
          <Link href="/admin/frontend" className="text-primary hover:underline">Back to Page Builder</Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/frontend" className="p-2 text-slate-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors">
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">{page.name}</h1>
            <p className="text-slate-500 text-xs sm:text-sm">{page.path} — {layout.length} sections</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-xs ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </span>
          )}
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
                Save All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sections List */}
      {loading ? (
        <div className="text-center py-12">
          <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading sections...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {layout.map((section, index) => {
            const def = getSectionDef(section.id)
            if (!def) return null
            const isExpanded = expandedSection === section.id

            return (
              <div key={section.id} className={`bg-[#141414] border rounded-xl overflow-hidden transition-colors ${section.visible ? 'border-[#1f1f1f]' : 'border-[#1f1f1f] opacity-60'}`}>
                {/* Section Row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors" title="Move up">
                      <Icon name="chevron-up" size={14} />
                    </button>
                    <button onClick={() => moveSection(index, 'down')} disabled={index === layout.length - 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors" title="Move down">
                      <Icon name="chevron-down" size={14} />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={def.icon} size={16} className="text-primary" />
                  </div>

                  {/* Name + Grid Preview */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-white font-medium text-sm whitespace-nowrap">{def.name}</span>
                    <GridPreview section={section} />
                  </div>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => toggleVisibility(section.id)}
                    className={`p-2 rounded-lg transition-colors ${section.visible ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-slate-500/10'}`}
                    title={section.visible ? 'Visible — click to hide' : 'Hidden — click to show'}
                  >
                    <Icon name={section.visible ? 'visibility' : 'visibility-off'} size={18} />
                  </button>

                  {/* Delete (dynamic sections only) */}
                  {section.type && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Remove section"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit content"
                  >
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
                  </button>
                </div>

                {/* Expanded Editor */}
                {isExpanded && (
                  <div className="border-t border-[#1f1f1f] p-4">
                    {renderSectionEditor(section)}
                    {renderStyleEditor(section)}
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Section */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#2a2a2a] rounded-xl text-slate-400 hover:text-white hover:border-primary/50 transition-colors"
            >
              <Icon name="add" size={18} />
              <span className="text-sm font-medium">Add Section</span>
            </button>
            {showAddMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl z-10">
                {DYNAMIC_SECTION_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => addSection(t.id)}
                    className="flex items-center gap-3 w-full p-3 text-left hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name={t.icon} size={16} className="text-primary" />
                    </div>
                    <span className="text-white text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
