'use client'

import { useState } from 'react'

interface FaqItem {
  question?: string
  answer?: string
}

interface FaqAccordionSectionProps {
  props: {
    title?: string
    items?: FaqItem[]
  }
}

export default function FaqAccordionSection({ props }: FaqAccordionSectionProps) {
  const { title, items = [] } = props
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Add FAQ items to display an accordion.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-white mb-8 text-center">{title}</h2>}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full p-5 text-left"
              >
                <span className="text-white font-medium text-sm pr-4">{item.question || `Question ${i + 1}`}</span>
                <span className={`text-slate-400 flex-shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
              {openIndex === i && item.answer && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
