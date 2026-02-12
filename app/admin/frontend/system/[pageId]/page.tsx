'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { settingsApi } from '@/lib/api/settings'

// System page definitions
const SYSTEM_PAGES: Record<string, { name: string; path: string; sections: { id: string; name: string; settingsKey: string }[] }> = {
  home: {
    name: 'Home Page',
    path: '/',
    sections: [
      { id: 'hero-slider', name: 'Hero Slider', settingsKey: 'home_hero_slides' },
    ],
  },
}

// Default slides matching current hardcoded banners in HeroSection
const DEFAULT_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
    title: 'Premium',
    titleHighlight: 'Scripts & Tools',
    subtitle: 'Discover our collection of high-quality automation scripts, bots, and developer tools.',
    buttonText: 'Browse Scripts',
    buttonLink: '/scripts',
  },
  {
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
    title: 'Digital',
    titleHighlight: 'Gift Cards',
    subtitle: 'Shop gift cards for your favorite platforms, games, and services worldwide.',
    buttonText: 'Buy Gift Cards',
    buttonLink: '/gift-cards',
  },
  {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
    title: 'Global',
    titleHighlight: 'eSIMs',
    subtitle: 'Stay connected anywhere with instant eSIMs for 190+ countries worldwide.',
    buttonText: 'Get eSIM',
    buttonLink: '/esim',
  },
  {
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2070&auto=format&fit=crop',
    title: 'Virtual',
    titleHighlight: 'Phone Numbers',
    subtitle: 'Get instant virtual numbers for SMS verification and privacy protection.',
    buttonText: 'Get Number',
    buttonLink: '/virtual-numbers',
  },
]

interface Slide {
  image: string
  title: string
  titleHighlight: string
  subtitle: string
  buttonText: string
  buttonLink: string
}

export default function SystemPageEditor() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.pageId as string
  const page = SYSTEM_PAGES[pageId]

  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Load slides from API
  const loadSlides = useCallback(async () => {
    setLoading(true)
    try {
      const res = await settingsApi.getSetting('home_hero_slides')
      if (res.success && res.data?.value) {
        const parsed = typeof res.data.value === 'string' ? JSON.parse(res.data.value) : res.data.value
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed)
          setLoading(false)
          return
        }
      }
    } catch {
      // Setting doesn't exist yet — use defaults
    }
    setSlides(DEFAULT_SLIDES)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (page) loadSlides()
  }, [page, loadSlides])

  // Save slides to API
  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      await settingsApi.updateSettings([
        { key: 'home_hero_slides', value: JSON.stringify(slides), group: 'cms', isPublic: true },
      ])
      setSaveMessage('Saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  // Slide operations
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
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/frontend" className="p-2 text-slate-400 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors">
          <Icon name="arrow-left" size={20} />
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">{page.name}</h1>
          <p className="text-slate-500 text-xs sm:text-sm">{page.path} — Edit page sections</p>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {page.sections.map((section) => (
          <div key={section.id} className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="layers" size={16} className="text-primary" />
                </div>
                <span className="text-white font-medium text-sm">{section.name}</span>
              </div>
              <Icon
                name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'}
                size={18}
                className="text-slate-400"
              />
            </button>

            {/* Section Editor — Hero Slider */}
            {expandedSection === section.id && section.id === 'hero-slider' && (
              <div className="border-t border-[#1f1f1f] p-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Icon name="loading" size={24} className="text-primary animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    {/* Slides */}
                    <div className="space-y-4">
                      {slides.map((slide, index) => (
                        <div key={index} className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-400 text-xs font-medium">Slide {index + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveSlide(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                title="Move up"
                              >
                                <Icon name="chevron-up" size={14} />
                              </button>
                              <button
                                onClick={() => moveSlide(index, 'down')}
                                disabled={index === slides.length - 1}
                                className="p-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                title="Move down"
                              >
                                <Icon name="chevron-down" size={14} />
                              </button>
                              <button
                                onClick={() => removeSlide(index)}
                                disabled={slides.length <= 1}
                                className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                title="Remove slide"
                              >
                                <Icon name="delete" size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Image preview + URL */}
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
                              <label className="text-slate-500 text-xs mb-1 block">Image URL</label>
                              <input
                                type="text"
                                value={slide.image}
                                onChange={(e) => updateSlide(index, 'image', e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                          </div>

                          {/* Title fields */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="text-slate-500 text-xs mb-1 block">Title</label>
                              <input
                                type="text"
                                value={slide.title}
                                onChange={(e) => updateSlide(index, 'title', e.target.value)}
                                placeholder="e.g. Premium"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 text-xs mb-1 block">Title Highlight</label>
                              <input
                                type="text"
                                value={slide.titleHighlight}
                                onChange={(e) => updateSlide(index, 'titleHighlight', e.target.value)}
                                placeholder="e.g. Scripts & Tools"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                          </div>

                          {/* Subtitle */}
                          <div className="mb-3">
                            <label className="text-slate-500 text-xs mb-1 block">Subtitle</label>
                            <input
                              type="text"
                              value={slide.subtitle}
                              onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
                              placeholder="Description text..."
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                            />
                          </div>

                          {/* Button fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-500 text-xs mb-1 block">Button Text</label>
                              <input
                                type="text"
                                value={slide.buttonText}
                                onChange={(e) => updateSlide(index, 'buttonText', e.target.value)}
                                placeholder="e.g. Browse Scripts"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 text-xs mb-1 block">Button Link</label>
                              <input
                                type="text"
                                value={slide.buttonLink}
                                onChange={(e) => updateSlide(index, 'buttonLink', e.target.value)}
                                placeholder="e.g. /scripts"
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Slide + Save */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1f1f1f]">
                      <button
                        onClick={addSlide}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-xs font-medium hover:bg-[#222] hover:text-white transition-colors"
                      >
                        <Icon name="add" size={14} />
                        Add Slide
                      </button>
                      <div className="flex items-center gap-3">
                        {saveMessage && (
                          <span className={`text-xs ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                            {saveMessage}
                          </span>
                        )}
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <Icon name="loading" size={14} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Icon name="check" size={14} />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
