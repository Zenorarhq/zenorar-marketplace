'use client'

import { useMemo, useState } from 'react'
import Icon from '@/components/ui/Icon'
import ImageField from './ImageField'

interface DetectedElement {
  selector: string
  type: 'img' | 'a' | 'button'
  label: string
  currentSrc?: string
  currentHref?: string
  currentText?: string
}

interface ElementEditorFieldProps {
  name: string
  value: any
  schema: any
  onChange: (value: any) => void
  allProps?: Record<string, any>
}

function detectElements(html: string): DetectedElement[] {
  if (!html || typeof window === 'undefined') return []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const elements: DetectedElement[] = []

    // Detect images
    const imgs = doc.querySelectorAll('img')
    imgs.forEach((img, i) => {
      elements.push({
        selector: `img:nth-of-type(${i + 1})`,
        type: 'img',
        label: img.getAttribute('alt') || `Image ${i + 1}`,
        currentSrc: img.getAttribute('src') || '',
      })
    })

    // Detect links
    const links = doc.querySelectorAll('a')
    links.forEach((a, i) => {
      elements.push({
        selector: `a:nth-of-type(${i + 1})`,
        type: 'a',
        label: a.textContent?.trim() || `Link ${i + 1}`,
        currentHref: a.getAttribute('href') || '',
        currentText: a.textContent?.trim() || '',
      })
    })

    // Detect buttons
    const buttons = doc.querySelectorAll('button')
    buttons.forEach((btn, i) => {
      elements.push({
        selector: `button:nth-of-type(${i + 1})`,
        type: 'button',
        label: btn.textContent?.trim() || `Button ${i + 1}`,
        currentText: btn.textContent?.trim() || '',
      })
    })

    return elements
  } catch {
    return []
  }
}

export default function ElementEditorField({ value, schema, onChange, allProps }: ElementEditorFieldProps) {
  const codeValue = allProps?.[schema.readFrom || 'code'] || ''
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const elements = useMemo(() => detectElements(codeValue), [codeValue])

  const overrides: Record<string, Record<string, string>> = useMemo(() => {
    try {
      return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {})
    } catch {
      return {}
    }
  }, [value])

  const updateOverride = (selector: string, field: string, newValue: string) => {
    const updated = { ...overrides }
    if (!updated[selector]) updated[selector] = {}
    updated[selector] = { ...updated[selector], [field]: newValue }
    // Remove empty overrides
    if (Object.values(updated[selector]).every(v => !v)) {
      delete updated[selector]
    }
    onChange(JSON.stringify(updated))
  }

  const toggleSection = (type: string) => {
    setCollapsed(prev => ({ ...prev, [type]: !prev[type] }))
  }

  if (!codeValue) {
    return (
      <div className="bg-[#151515] border border-[#252525] rounded-lg p-4 text-center">
        <Icon name="code-block" size={24} className="text-slate-600 mx-auto mb-2" />
        <p className="text-slate-500 text-xs">Paste design code above to detect editable elements.</p>
      </div>
    )
  }

  const images = elements.filter(e => e.type === 'img')
  const links = elements.filter(e => e.type === 'a')
  const buttons = elements.filter(e => e.type === 'button')

  if (elements.length === 0) {
    return (
      <div className="bg-[#151515] border border-[#252525] rounded-lg p-4 text-center">
        <p className="text-slate-500 text-xs">No images, links, or buttons detected in the code.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-400 mb-1">
        Detected Elements
      </label>

      {/* Images */}
      {images.length > 0 && (
        <div className="bg-[#151515] border border-[#252525] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('img')}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#252525] hover:bg-[#1e1e1e] transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Icon name="image" size={14} />
              Images ({images.length})
            </span>
            <Icon name={collapsed.img ? 'chevron-right' : 'chevron-down'} size={12} className="text-slate-500" />
          </button>
          {!collapsed.img && (
            <div className="p-3 space-y-4">
              {images.map((el) => (
                <div key={el.selector}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">{el.label}</p>
                  <ImageField
                    name={el.selector}
                    value={overrides[el.selector]?.src || el.currentSrc || ''}
                    schema={{ title: '' }}
                    onChange={(src) => updateOverride(el.selector, 'src', src)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Links */}
      {links.length > 0 && (
        <div className="bg-[#151515] border border-[#252525] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('a')}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#252525] hover:bg-[#1e1e1e] transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Icon name="link" size={14} />
              Links ({links.length})
            </span>
            <Icon name={collapsed.a ? 'chevron-right' : 'chevron-down'} size={12} className="text-slate-500" />
          </button>
          {!collapsed.a && (
            <div className="p-3 space-y-4">
              {links.map((el) => (
                <div key={el.selector} className="space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{el.label}</p>
                  <div>
                    <label className="text-[10px] text-slate-600 mb-0.5 block">URL</label>
                    <input
                      type="text"
                      value={overrides[el.selector]?.href ?? el.currentHref ?? ''}
                      onChange={(e) => updateOverride(el.selector, 'href', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 mb-0.5 block">Text</label>
                    <input
                      type="text"
                      value={overrides[el.selector]?.text ?? el.currentText ?? ''}
                      onChange={(e) => updateOverride(el.selector, 'text', e.target.value)}
                      placeholder="Link text"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="bg-[#151515] border border-[#252525] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('button')}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#252525] hover:bg-[#1e1e1e] transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Icon name="bolt" size={14} />
              Buttons ({buttons.length})
            </span>
            <Icon name={collapsed.button ? 'chevron-right' : 'chevron-down'} size={12} className="text-slate-500" />
          </button>
          {!collapsed.button && (
            <div className="p-3 space-y-4">
              {buttons.map((el) => (
                <div key={el.selector}>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{el.label}</p>
                  <input
                    type="text"
                    value={overrides[el.selector]?.text ?? el.currentText ?? ''}
                    onChange={(e) => updateOverride(el.selector, 'text', e.target.value)}
                    placeholder="Button text"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
