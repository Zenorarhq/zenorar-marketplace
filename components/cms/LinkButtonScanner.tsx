'use client'

import { useState, useEffect, useMemo } from 'react'
import Icon from '@/components/ui/Icon'

interface LinkItem {
  index: number
  tag: string
  originalText: string
  originalUrl: string
  newText: string
  newUrl: string
}

interface LinkButtonScannerProps {
  code: string
  onCodeUpdate: (newCode: string) => void
}

function extractLinksAndButtons(html: string): LinkItem[] {
  if (!html || typeof window === 'undefined') return []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const items: LinkItem[] = []
    let index = 0

    // Find all <a> tags
    doc.querySelectorAll('a').forEach((el) => {
      const text = el.textContent?.trim() || ''
      const url = el.getAttribute('href') || ''
      // Skip empty anchors, anchor links, and javascript: links
      if (!text && !url) return
      if (url.startsWith('#') || url.startsWith('javascript:')) return
      items.push({
        index: index++,
        tag: 'a',
        originalText: text,
        originalUrl: url,
        newText: text,
        newUrl: url,
      })
    })

    // Find all <button> tags
    doc.querySelectorAll('button').forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (!text) return
      // Skip if button is inside an <a> tag (already captured above)
      if (el.closest('a')) return
      // Check multiple URL sources: data attributes, onclick, parent link
      const url = el.getAttribute('data-href')
        || el.getAttribute('data-url')
        || el.getAttribute('data-link')
        || el.getAttribute('onclick')?.match(/(?:location\.href|window\.open|navigate)\s*\(\s*['"]([^'"]+)['"]/)?.[1]
        || el.getAttribute('onclick')?.match(/['"]https?:\/\/[^'"]+['"]/)?.[0]?.replace(/['"]/g, '')
        || ''
      items.push({
        index: index++,
        tag: 'button',
        originalText: text,
        originalUrl: url,
        newText: text,
        newUrl: url,
      })
    })

    return items
  } catch {
    return []
  }
}

function applyChanges(html: string, items: LinkItem[]): string {
  if (!html || typeof window === 'undefined') return html
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    let aIndex = 0
    let btnIndex = 0

    // Process <a> tags in order
    const allAs = doc.querySelectorAll('a')
    const aItems = items.filter(i => i.tag === 'a')
    allAs.forEach((el) => {
      const text = el.textContent?.trim() || ''
      const url = el.getAttribute('href') || ''
      if (!text && !url) return
      if (url.startsWith('#') || url.startsWith('javascript:')) return

      const item = aItems[aIndex]
      if (item) {
        if (item.newUrl !== item.originalUrl) {
          el.setAttribute('href', item.newUrl)
        }
        if (item.newText !== item.originalText) {
          el.textContent = item.newText
        }
      }
      aIndex++
    })

    // Process <button> tags in order
    const allBtns = doc.querySelectorAll('button')
    const btnItems = items.filter(i => i.tag === 'button')
    allBtns.forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (!text) return

      const item = btnItems[btnIndex]
      if (item) {
        if (item.newText !== item.originalText) {
          el.textContent = item.newText
        }
        if (item.newUrl && item.newUrl !== item.originalUrl) {
          el.setAttribute('data-href', item.newUrl)
        }
      }
      btnIndex++
    })

    // Return the full HTML document if it had head/body structure
    if (html.includes('</head>') || html.includes('<!DOCTYPE')) {
      return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
    }
    return doc.body.innerHTML
  } catch {
    return html
  }
}

export default function LinkButtonScanner({ code, onCodeUpdate }: LinkButtonScannerProps) {
  const [items, setItems] = useState<LinkItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Re-scan when code changes
  useEffect(() => {
    const scanned = extractLinksAndButtons(code)
    setItems(scanned)
    setHasChanges(false)
  }, [code])

  function handleFieldChange(index: number, field: 'newText' | 'newUrl', value: string) {
    setItems(prev => prev.map(item =>
      item.index === index ? { ...item, [field]: value } : item
    ))
    setHasChanges(true)
  }

  function handleApply() {
    const updated = applyChanges(code, items)
    onCodeUpdate(updated)
    setHasChanges(false)
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center">
        <Icon name="link" size={24} className="text-slate-600 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No links or buttons found in the code.</p>
        <p className="text-slate-600 text-xs mt-1">Paste your HTML code first, then links and buttons will appear here.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <Icon name="link" size={16} className="text-primary" />
          Links & Buttons ({items.length})
        </h3>
        {hasChanges && (
          <button
            onClick={handleApply}
            className="px-3 py-1.5 bg-primary text-black text-xs font-bold rounded-lg hover:brightness-105"
          >
            Apply Changes
          </button>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.index} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                item.tag === 'a'
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20'
                  : 'bg-purple-900/30 text-purple-400 border border-purple-500/20'
              }`}>
                {item.tag === 'a' ? 'Link' : 'Button'}
              </span>
              <span className="text-slate-500 text-xs truncate">{item.originalText || '(no text)'}</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Text</label>
                <input
                  type="text"
                  value={item.newText}
                  onChange={(e) => handleFieldChange(item.index, 'newText', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">URL</label>
                <input
                  type="text"
                  value={item.newUrl}
                  onChange={(e) => handleFieldChange(item.index, 'newUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
