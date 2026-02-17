'use client'

import { useMemo, ComponentType } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import HeroSection from '@/components/sections/HeroSection'
import MostPopular from '@/components/sections/MostPopular'
import PromoBanner from '@/components/sections/PromoBanner'
import ScriptCategories from '@/components/sections/ScriptCategories'
import StaffPicks from '@/components/sections/StaffPicks'
import TrustBanner from '@/components/sections/TrustBanner'
import Connectivity from '@/components/sections/Connectivity'
import TextBlock from '@/components/sections/TextBlock'
import ImageBanner from '@/components/sections/ImageBanner'
import ProductShowcase from '@/components/sections/ProductShowcase'
import Testimonials from '@/components/sections/Testimonials'

// Map section IDs/types to their components
const SECTION_MAP: Record<string, ComponentType<{ config?: any }>> = {
  'hero-slider': HeroSection,
  'most-popular': MostPopular,
  'trust-banner': TrustBanner,
  'promo-banner': PromoBanner,
  'script-categories': ScriptCategories,
  'staff-picks': StaffPicks,
  'connectivity': Connectivity,
  'text-block': TextBlock,
  'image-banner': ImageBanner,
  'product-showcase': ProductShowcase,
  'testimonials': Testimonials,
}

// Build inline styles from section config.style
function buildSectionStyle(style?: Record<string, any>): React.CSSProperties | undefined {
  if (!style) return undefined
  const css: React.CSSProperties = {}
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor
  if (style.textColor) css.color = style.textColor
  if (style.padding === 'compact') css.padding = '1rem 0'
  else if (style.padding === 'spacious') css.padding = '3rem 0'
  if (style.borderRadius === 'small') css.borderRadius = '0.5rem'
  else if (style.borderRadius === 'medium') css.borderRadius = '1rem'
  else if (style.borderRadius === 'large') css.borderRadius = '1.5rem'
  if (style.border && style.borderColor) css.border = `1px solid ${style.borderColor}`
  else if (style.border) css.border = '1px solid rgba(255,255,255,0.1)'
  if (style.shadow === 'subtle') css.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
  else if (style.shadow === 'medium') css.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
  else if (style.shadow === 'glow') css.boxShadow = '0 0 20px rgba(67, 214, 120, 0.2)'
  if (Object.keys(css).length === 0) return undefined
  return css
}

// Default layout matching the original static order
const DEFAULT_LAYOUT = [
  { id: 'hero-slider', visible: true, config: {} },
  { id: 'most-popular', visible: true, config: {} },
  { id: 'trust-banner', visible: true, config: {} },
  { id: 'promo-banner', visible: true, config: {} },
  { id: 'script-categories', visible: true, config: {} },
  { id: 'staff-picks', visible: true, config: {} },
  { id: 'connectivity', visible: true, config: {} },
]

export default function Home() {
  const { rawSettings } = useSiteSettings()

  const sections = useMemo(() => {
    try {
      const raw = rawSettings.home_page_layout
      if (!raw) return DEFAULT_LAYOUT
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      // Handle wrapped format { value: "..." }
      const data = parsed?.value ? (typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value) : parsed
      if (Array.isArray(data) && data.length > 0) return data
    } catch {}
    return DEFAULT_LAYOUT
  }, [rawSettings.home_page_layout])

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 py-8 w-full">
      {sections.map((section: { id: string; type?: string; visible: boolean; config: Record<string, any> }) => {
        if (!section.visible) return null
        const Component = SECTION_MAP[section.type || section.id]
        if (!Component) return null
        const wrapperStyle = buildSectionStyle(section.config?.style)
        return wrapperStyle ? (
          <div key={section.id} style={wrapperStyle}>
            <Component config={section.config} />
          </div>
        ) : (
          <Component key={section.id} config={section.config} />
        )
      })}
    </main>
  )
}
