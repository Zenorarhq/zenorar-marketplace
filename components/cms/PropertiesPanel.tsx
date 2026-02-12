'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { Section, ComponentTemplate } from '@/lib/cms/api'

interface PropertiesPanelProps {
  section: Section | null
  componentTemplate: ComponentTemplate | null
  onUpdateSection: (id: string, props: Record<string, any>) => void
  onClose: () => void
}

interface FieldProps {
  name: string
  value: any
  schema: any
  onChange: (value: any) => void
}

function TextField({ name, value, schema, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder || `Enter ${name}`}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
      />
    </div>
  )
}

function TextAreaField({ name, value, schema, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <textarea
        rows={4}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder || `Enter ${name}`}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
      />
    </div>
  )
}

function SelectField({ name, value, schema, onChange }: FieldProps) {
  const options = schema.enum || []
  const isLayoutField = name === 'layout'

  // Layout visual previews
  const layoutPreviews: Record<string, React.ReactNode> = {
    '1': (
      <div className="flex gap-1 h-4">
        <div className="flex-1 bg-primary/40 rounded-sm" />
      </div>
    ),
    '1/2-1/2': (
      <div className="flex gap-1 h-4">
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
      </div>
    ),
    '1/3-2/3': (
      <div className="flex gap-1 h-4">
        <div className="w-1/3 bg-primary/40 rounded-sm" />
        <div className="w-2/3 bg-primary/40 rounded-sm" />
      </div>
    ),
    '2/3-1/3': (
      <div className="flex gap-1 h-4">
        <div className="w-2/3 bg-primary/40 rounded-sm" />
        <div className="w-1/3 bg-primary/40 rounded-sm" />
      </div>
    ),
    '1/3-1/3-1/3': (
      <div className="flex gap-1 h-4">
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
      </div>
    ),
    '1/4-1/4-1/4-1/4': (
      <div className="flex gap-1 h-4">
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
        <div className="flex-1 bg-primary/40 rounded-sm" />
      </div>
    ),
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
      >
        <option value="">Select {name}</option>
        {options.map((opt: string | number) => (
          <option key={opt} value={opt}>
            {String(opt)}
          </option>
        ))}
      </select>

      {/* Layout Preview */}
      {isLayoutField && value && layoutPreviews[value] && (
        <div className="mt-2 p-2 bg-[#151515] rounded-lg border border-[#252525]">
          <p className="text-xs text-slate-500 mb-2">Layout Preview:</p>
          {layoutPreviews[value]}
        </div>
      )}
    </div>
  )
}

function NumberField({ name, value, schema, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        min={schema.minimum}
        max={schema.maximum}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
      />
    </div>
  )
}

function BooleanField({ name, value, schema, onChange }: FieldProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-white capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-primary' : 'bg-[#2a2a2a]'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function ArrayField({ name, value, schema, onChange }: FieldProps) {
  const items = value || []
  const itemSchema = schema.items || {}
  const isColumnsField = name === 'columns'

  const handleAddItem = () => {
    const newItem = itemSchema.type === 'object'
      ? Object.keys(itemSchema.properties || {}).reduce((acc, key) => {
          acc[key] = ''
          return acc
        }, {} as Record<string, any>)
      : ''
    onChange([...items, newItem])
  }

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_: any, i: number) => i !== index))
  }

  const handleUpdateItem = (index: number, newValue: any) => {
    const updated = [...items]
    updated[index] = newValue
    onChange(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-white capitalize">
          {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
        </label>
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
        >
          <Icon name="add" size={14} />
          {isColumnsField ? 'Add Column' : 'Add'}
        </button>
      </div>

      {/* Helpful hint for columns */}
      {isColumnsField && items.length === 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
          <p className="text-primary text-xs">
            <strong>Tip:</strong> Choose a layout above (e.g., &quot;1/2-1/2&quot; for two columns), then add columns here to fill them with content.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item: any, index: number) => (
          <div key={index} className="relative bg-[#151515] border border-[#252525] rounded-lg overflow-hidden">
            {/* Item Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#252525]">
              <span className="text-xs font-medium text-slate-400">
                {isColumnsField ? `Column ${index + 1}` : `Item ${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              >
                <Icon name="delete" size={14} />
              </button>
            </div>

            {/* Item Content */}
            <div className="p-3">
              {itemSchema.type === 'object' ? (
                <div className="space-y-3">
                  {Object.entries(itemSchema.properties || {}).map(([key, propSchema]: [string, any]) => (
                    <TextField
                      key={key}
                      name={key}
                      value={item[key]}
                      schema={propSchema}
                      onChange={(val) => handleUpdateItem(index, { ...item, [key]: val })}
                    />
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={item || ''}
                  onChange={(e) => handleUpdateItem(index, e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && !isColumnsField && (
          <p className="text-slate-500 text-xs text-center py-4">
            No items. Click + to add one.
          </p>
        )}
      </div>
    </div>
  )
}

function renderField(name: string, value: any, schema: any, onChange: (value: any) => void) {
  // Handle enums (select)
  if (schema.enum) {
    return <SelectField key={name} name={name} value={value} schema={schema} onChange={onChange} />
  }

  // Handle different types
  switch (schema.type) {
    case 'string':
      if (name.toLowerCase().includes('content') || name.toLowerCase().includes('description')) {
        return <TextAreaField key={name} name={name} value={value} schema={schema} onChange={onChange} />
      }
      return <TextField key={name} name={name} value={value} schema={schema} onChange={onChange} />
    case 'number':
    case 'integer':
      return <NumberField key={name} name={name} value={value} schema={schema} onChange={onChange} />
    case 'boolean':
      return <BooleanField key={name} name={name} value={value} schema={schema} onChange={onChange} />
    case 'array':
      return <ArrayField key={name} name={name} value={value} schema={schema} onChange={onChange} />
    default:
      return <TextField key={name} name={name} value={value} schema={schema} onChange={onChange} />
  }
}

export default function PropertiesPanel({
  section,
  componentTemplate,
  onUpdateSection,
  onClose,
}: PropertiesPanelProps) {
  const [localProps, setLocalProps] = useState<Record<string, any>>({})

  useEffect(() => {
    if (section) {
      setLocalProps(section.props || {})
    }
  }, [section])

  if (!section || !componentTemplate) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
            <Icon name="edit" size={32} className="text-slate-600" />
          </div>
          <h3 className="text-white font-medium mb-2">No section selected</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Select a section from the list to edit its properties
          </p>
        </div>
      </div>
    )
  }

  const schema = componentTemplate.schema || {}
  const properties = schema.properties || {}

  const handleChange = (name: string, value: any) => {
    const updated = { ...localProps, [name]: value }
    setLocalProps(updated)
    onUpdateSection(section.id, updated)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm capitalize">
            {section.type.replace(/-/g, ' ')}
          </h3>
          <p className="text-slate-500 text-xs">Edit section properties</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Properties Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {Object.entries(properties).map(([name, propSchema]: [string, any]) => (
            <div key={name}>
              {renderField(name, localProps[name], propSchema, (val) => handleChange(name, val))}
            </div>
          ))}
        </div>

        {Object.keys(properties).length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">
            This component has no configurable properties.
          </p>
        )}
      </div>
    </div>
  )
}
