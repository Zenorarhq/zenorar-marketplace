'use client'

import { useState, useRef } from 'react'

interface ColorFieldProps {
  name: string
  value: string
  schema: { title?: string }
  onChange: (value: string) => void
}

export default function ColorField({ name, value, schema, onChange }: ColorFieldProps) {
  const [localValue, setLocalValue] = useState(value || '')
  const colorInputRef = useRef<HTMLInputElement>(null)

  const handleHexChange = (hex: string) => {
    setLocalValue(hex)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      onChange(hex)
    }
  }

  const handlePickerChange = (hex: string) => {
    setLocalValue(hex)
    onChange(hex)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="w-10 h-10 rounded-lg border-2 border-[#2a2a2a] flex-shrink-0 cursor-pointer hover:border-[#3a3a3a] transition-colors"
          style={{ backgroundColor: localValue || '#000000' }}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={localValue || '#000000'}
          onChange={(e) => handlePickerChange(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          value={localValue}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 font-mono"
        />
      </div>
    </div>
  )
}