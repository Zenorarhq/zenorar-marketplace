'use client'

import { useState } from 'react'

interface NewsletterSectionProps {
  props: {
    title?: string
    subtitle?: string
    buttonText?: string
    placeholder?: string
  }
}

export default function NewsletterSection({ props }: NewsletterSectionProps) {
  const { title = 'Subscribe to our newsletter', subtitle, buttonText = 'Subscribe', placeholder = 'Enter your email' } = props
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-xl mx-auto text-center">
        {title && <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>}
        {subtitle && <p className="text-slate-400 text-sm mb-6">{subtitle}</p>}
        {submitted ? (
          <p className="text-green-400 font-medium">Thanks for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-black rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {buttonText}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
