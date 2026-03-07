'use client'

import { useRef, useEffect, useCallback } from 'react'

interface CustomHtmlSectionProps {
  props: {
    html?: string
    css?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    maxWidth?: 'full' | 'container' | 'narrow'
    hideOnMobile?: boolean
  }
}

export default function CustomHtmlSection({ props }: CustomHtmlSectionProps) {
  const {
    html,
    css,
    padding = 'small',
    backgroundColor,
    maxWidth = 'container',
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

  // Re-resize when html or css changes
  useEffect(() => {
    // Small delay to let iframe re-render
    const timer = setTimeout(resizeIframe, 100)
    return () => clearTimeout(timer)
  }, [html, css, resizeIframe])

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

  if (!html && !css) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Paste your HTML/CSS code to render custom content.</p>
        </div>
      </div>
    )
  }

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
  a { color: inherit; }
  ${css || ''}
</style>
</head>
<body>${html || ''}</body>
</html>`

  return (
    <div
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          className="w-full border-0 overflow-hidden"
          style={{ minHeight: '50px' }}
          sandbox="allow-same-origin allow-popups"
          title="Custom content"
        />
      </div>
    </div>
  )
}