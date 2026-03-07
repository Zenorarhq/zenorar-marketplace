'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'

interface DesignBlockSectionProps {
  props: {
    code?: string
    overrides?: string
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

// Inject a resize script that tells the parent the content height
const RESIZE_SCRIPT = `<script>
function __notifyHeight() {
  var h = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
  window.parent.postMessage({ type: '__designBlockResize', height: h }, '*');
}
window.addEventListener('load', function() { __notifyHeight(); setTimeout(__notifyHeight, 100); setTimeout(__notifyHeight, 500); setTimeout(__notifyHeight, 1500); setTimeout(__notifyHeight, 3000); });
window.addEventListener('resize', __notifyHeight);
new MutationObserver(__notifyHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
new ResizeObserver(__notifyHeight).observe(document.documentElement);
setInterval(__notifyHeight, 2000);
</script>`

export default function DesignBlockSection({ props }: DesignBlockSectionProps) {
  const {
    code,
    overrides = '{}',
    hideOnMobile,
  } = props

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const processed = useMemo(() => applyOverrides(code || '', overrides), [code, overrides])

  // Build a full HTML document from the pasted code
  const srcdoc = useMemo(() => {
    if (!code) return ''
    // Override viewport-height locks and internal scroll so content flows naturally
    const containStyle = `<style>
html, body { margin: 0; padding: 0; overflow-x: hidden; max-width: 100%; height: auto !important; min-height: auto !important; }
.h-screen, .min-h-screen { height: auto !important; min-height: auto !important; }
.overflow-y-auto, .overflow-y-scroll { overflow-y: visible !important; }
header[class*="fixed"] { position: sticky !important; }
aside[class*="fixed"] { position: sticky !important; top: 0; height: auto !important; }
</style>`
    let html = processed
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${containStyle}${RESIZE_SCRIPT}</head>`)
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `${containStyle}${RESIZE_SCRIPT}</body>`)
    } else {
      // Wrap in a basic document
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${containStyle}${RESIZE_SCRIPT}</head><body>${html}</body></html>`
    }
    return html
  }, [processed, code])

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === '__designBlockResize' && iframeRef.current) {
      iframeRef.current.style.height = `${e.data.height}px`
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

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
    <div className={`w-full max-w-full overflow-hidden ${hideOnMobile ? 'hidden md:block' : ''}`}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        className="w-full border-0 block"
        style={{ minHeight: '100px', maxWidth: '100%', overflow: 'hidden' }}
        title="Design block"
      />
    </div>
  )
}