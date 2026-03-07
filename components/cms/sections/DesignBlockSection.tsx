'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'

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
    padding = 'none',
    maxWidth = 'full',
    hideOnMobile,
  } = props

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return
    const height = iframe.contentDocument.body.scrollHeight
    iframe.style.height = `${height}px`
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => resizeIframe()
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [resizeIframe])

  useEffect(() => {
    const timer = setTimeout(resizeIframe, 100)
    return () => clearTimeout(timer)
  }, [code, overrides, resizeIframe])

  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12',
  }

  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    container: 'max-w-6xl',
    narrow: 'max-w-4xl',
  }

  const processed = useMemo(() => applyOverrides(code || '', overrides), [code, overrides])

  if (!code) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Paste your design code to render it here.</p>
        </div>
      </div>
    )
  }

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body { margin: 0; padding: 0; }</style>
</head>
<body>${processed}</body>
</html>`

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          className="w-full border-0 overflow-hidden"
          style={{ minHeight: '50px' }}
          sandbox="allow-same-origin allow-popups"
          title="Design block"
        />
      </div>
    </div>
  )
}
