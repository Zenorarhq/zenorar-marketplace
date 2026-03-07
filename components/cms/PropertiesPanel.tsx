'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { Section, ComponentTemplate } from '@/lib/cms/api'
import ColorField from '@/components/page-builder/fields/ColorField'
import ImageField from '@/components/page-builder/fields/ImageField'

interface PropertiesPanelProps {
  section: Section | null
  componentTemplate: ComponentTemplate | null
  onUpdateSection: (id: string, props: Record<string, any>) => void
  onClose: () => void
  sections?: Section[]
  componentTemplates?: ComponentTemplate[]
  onSelectSection?: (id: string) => void
  onDeleteSection?: (id: string) => void
}

interface FieldProps {
  name: string
  value: any
  schema: any
  onChange: (value: any) => void
}

// ── Field Components ──────────────────────────────────────────────

function TextField({ name, value, schema, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
      <label className="text-xs font-medium text-slate-400">
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
        <label className="text-xs font-medium text-slate-400">
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

// ── Icon Button Select ─────────────────────────────────────────────

function DirectionIcon({ dir }: { dir: string }) {
  const icons: Record<string, string> = {
    row: 'arrow-right',
    column: 'chevron-down',
    'row-reverse': 'arrow-left',
    'column-reverse': 'chevron-up',
  }
  return <Icon name={icons[dir] || 'help'} size={16} />
}

function JustifyIcon({ align }: { align: string }) {
  const positions: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  }
  return (
    <div className={`flex ${positions[align] || ''} items-center w-5 h-4 gap-[1px]`}>
      <div className="w-[3px] h-[10px] bg-current rounded-[1px]" />
      <div className="w-[3px] h-[7px] bg-current rounded-[1px]" />
      <div className="w-[3px] h-[10px] bg-current rounded-[1px]" />
    </div>
  )
}

function AlignIcon({ align }: { align: string }) {
  const positions: Record<string, string> = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
    stretch: 'items-stretch',
  }
  return (
    <div className={`flex ${positions[align] || ''} justify-center w-5 h-4 gap-[2px]`}>
      <div className={`w-[3px] ${align === 'stretch' ? 'h-full' : 'h-[6px]'} bg-current rounded-[1px]`} />
      <div className={`w-[3px] ${align === 'stretch' ? 'h-full' : 'h-[10px]'} bg-current rounded-[1px]`} />
      <div className={`w-[3px] ${align === 'stretch' ? 'h-full' : 'h-[6px]'} bg-current rounded-[1px]`} />
    </div>
  )
}

function ContentWidthIcon({ width }: { width: string }) {
  if (width === 'full') {
    return (
      <div className="flex items-center w-5 h-4">
        <div className="w-full h-[8px] bg-current rounded-[1px]" />
      </div>
    )
  }
  if (width === 'narrow') {
    return (
      <div className="flex items-center justify-center w-5 h-4">
        <div className="w-[10px] h-[8px] bg-current rounded-[1px]" />
      </div>
    )
  }
  // container (boxed)
  return (
    <div className="flex items-center justify-center w-5 h-4">
      <div className="w-[14px] h-[8px] bg-current rounded-[1px]" />
    </div>
  )
}

function IconButtonSelect({ name, value, schema, onChange }: FieldProps) {
  const options: string[] = schema.enum || []

  const getIcon = (option: string) => {
    if (name === 'direction') return <DirectionIcon dir={option} />
    if (name === 'horizontalAlign') return <JustifyIcon align={option} />
    if (name === 'verticalAlign') return <AlignIcon align={option} />
    if (name === 'maxWidth') return <ContentWidthIcon width={option} />
    return <span className="text-[10px]">{option}</span>
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {schema.title || name}
      </label>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`flex items-center justify-center p-2 rounded-md border transition-all ${
              value === opt
                ? 'bg-primary/15 border-primary/50 text-primary'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-slate-500 hover:text-slate-300 hover:border-[#3a3a3a]'
            }`}
            title={opt}
          >
            {getIcon(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Render Field ──────────────────────────────────────────────────

function renderField(name: string, value: any, schema: any, onChange: (value: any) => void) {
  // Icon button fields
  if (schema.ui === 'icon-buttons' && schema.enum) {
    return <IconButtonSelect key={name} name={name} value={value} schema={schema} onChange={onChange} />
  }

  // Handle enums (select)
  if (schema.enum) {
    return <SelectField key={name} name={name} value={value} schema={schema} onChange={onChange} />
  }

  // Handle different types
  switch (schema.type) {
    case 'string': {
      const lowerName = name.toLowerCase()
      // Color fields
      if (lowerName.includes('color') || lowerName.includes('gradient') || lowerName === 'style' && (value || '').startsWith('#')) {
        return <ColorField key={name} name={name} value={value || ''} schema={schema} onChange={onChange} />
      }
      // Image fields
      if (lowerName.includes('image') || lowerName.includes('logo') || lowerName.includes('avatar') || lowerName.includes('thumbnail') || lowerName === 'src' || lowerName === 'backgroundimage') {
        return <ImageField key={name} name={name} value={value || ''} schema={schema} onChange={onChange} />
      }
      if (lowerName.includes('content') || lowerName.includes('description')) {
        return <TextAreaField key={name} name={name} value={value} schema={schema} onChange={onChange} />
      }
      return <TextField key={name} name={name} value={value} schema={schema} onChange={onChange} />
    }
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

// ── Navigator Tree ────────────────────────────────────────────────

const containerTypes = ['section', 'column']

function NavigatorTree({
  sections,
  componentTemplates,
  onSelect,
  onDelete,
}: {
  sections: Section[]
  componentTemplates: ComponentTemplate[]
  onSelect?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    const collectContainers = (list: Section[]) => {
      for (const s of list) {
        if (containerTypes.includes(s.type)) ids.add(s.id)
        if (s.children) collectContainers(s.children)
      }
    }
    collectContainers(sections)
    return ids
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getIcon = (type: string) => {
    const t = componentTemplates.find((c) => c.name === type)
    return t?.icon || 'layers'
  }

  const getLabel = (section: Section) => {
    if (section.type === 'column') return 'Section'
    const name = section.type.replace(/-/g, ' ')
    return section.props?.title || name.charAt(0).toUpperCase() + name.slice(1)
  }

  function renderItems(items: Section[], depth: number) {
    const sorted = [...items].sort((a, b) => a.order - b.order)
    return sorted.map((section) => {
      const isContainer = containerTypes.includes(section.type)
      const children = section.children || []
      const isExpanded = expandedIds.has(section.id)

      return (
        <div key={section.id}>
          <div
            className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-white/5 cursor-pointer group transition-colors"
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={() => onSelect?.(section.id)}
          >
            {isContainer ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(section.id) }}
                className="p-0.5 text-slate-500 hover:text-slate-300"
              >
                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
              </button>
            ) : (
              <span className="w-4" />
            )}

            <Icon name={getIcon(section.type)} size={14} className="text-slate-400 flex-shrink-0" />

            <span className="text-xs text-slate-300 truncate flex-1">
              {getLabel(section)}
            </span>

            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(section.id) }}
                className="p-0.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon name="delete" size={12} />
              </button>
            )}
          </div>

          {isContainer && isExpanded && children.length > 0 && (
            renderItems(children, depth + 1)
          )}
        </div>
      )
    })
  }

  return <div className="py-1">{renderItems(sections, 0)}</div>
}

// ── Tab Icons ─────────────────────────────────────────────────────

const tabConfig = [
  { id: 'layout', label: 'Layout', icon: 'grid-view' },
  { id: 'style', label: 'Style', icon: 'paint-brush' },
  { id: 'advanced', label: 'Advanced', icon: 'settings' },
] as const

type TabId = typeof tabConfig[number]['id']

// ── Main Panel ────────────────────────────────────────────────────

export default function PropertiesPanel({
  section,
  componentTemplate,
  onUpdateSection,
  onClose,
  sections = [],
  componentTemplates = [],
  onSelectSection,
  onDeleteSection,
}: PropertiesPanelProps) {
  const [localProps, setLocalProps] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<TabId>('layout')

  useEffect(() => {
    if (section) {
      setLocalProps(section.props || {})
    }
  }, [section])

  if (!section || !componentTemplate) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-[#1f1f1f] flex items-center gap-2">
          <Icon name="layers" size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Navigator</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sections.length > 0 ? (
            <NavigatorTree
              sections={sections}
              componentTemplates={componentTemplates}
              onSelect={onSelectSection}
              onDelete={onDeleteSection}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Icon name="layers" size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No sections yet</p>
              </div>
            </div>
          )}
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

  // Check if any properties have group metadata
  const hasGroups = Object.values(properties).some((p: any) => p.group)

  if (hasGroups) {
    // Group properties by tab
    const grouped: Record<string, [string, any][]> = { layout: [], style: [], advanced: [] }
    Object.entries(properties).forEach(([name, propSchema]: [string, any]) => {
      const group = propSchema.group || 'advanced'
      if (!grouped[group]) grouped[group] = []
      grouped[group].push([name, propSchema])
    })

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-[#1f1f1f]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm capitalize">
              {section.type === 'column' ? 'Section' : section.type.replace(/-/g, ' ')}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Icon name="close" size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex">
            {tabConfig.map((tab) => {
              const hasFields = grouped[tab.id]?.length > 0
              if (!hasFields) return null
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {(grouped[activeTab] || []).map(([name, propSchema]) => (
              <div key={name}>
                {renderField(name, localProps[name], propSchema, (val) => handleChange(name, val))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Fallback: flat list for components without groups
  return (
    <div className="h-full flex flex-col">
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