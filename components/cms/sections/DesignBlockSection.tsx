'use client'

import { useEffect, useRef, useMemo } from 'react'

interface DesignBlockSectionProps {
  props: {
    code?: string
    overrides?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    maxWidth?: 'full' | 'container' | 'narrow'
    hideOnMobile?: boolean
  }
}

function applyOverrides(html: string, overridesJson: string): string {
  if (!html || !overridesJson || overridesJson === '{}') return html
  if (typeof window === 'undefined') return html

  try {
    const overrides = JSON.parse(overridesJson)
    if (!overrides || Object.keys(overrides).length === 0) return html

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    for (const [selector, changes] of Object.entries(overrides)) {
      const el = doc.querySelector(selector)
      if (!el || typeof changes !== 'object') continue
      const c = changes as Record<string, string>
      if (c.src) el.setAttribute('src', c.src)
      if (c.href) el.setAttribute('href', c.href)
      if (c.text !== undefined) el.textContent = c.text
    }

    return doc.body.innerHTML
  } catch {
    return html
  }
}

export default function DesignBlockSection({ props }: DesignBlockSectionProps) {
  const {
    code,
    overrides = '{}',
    hideOnMobile,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)

  const processed = useMemo(() => applyOverrides(code || '', overrides), [code, overrides])

  // Execute any <script> tags in the pasted code
  useEffect(() => {
    const container = containerRef.current
    if (!container || !code) return
    const scripts = container.querySelectorAll('script')
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value)
      })
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })
  }, [processed, code])

  if (!code) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Paste your design code to render it here.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={hideOnMobile ? 'hidden md:block' : undefined}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  )
}