'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import Icon from '@/components/ui/Icon'
import { ComponentTemplate } from '@/lib/cms/api'

interface ComponentPaletteProps {
  components: ComponentTemplate[]
  onAddSection: (componentName: string) => void
}

function DraggableComponent({
  component,
  onAdd,
}: {
  component: ComponentTemplate
  onAdd: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${component.name}`,
    data: {
      type: 'palette-item',
      componentName: component.name,
      component,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const iconName = component.icon || 'layers'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:bg-[#1f1f1f] ${
        isDragging ? 'opacity-50 border-primary' : ''
      }`}
      onClick={onAdd}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#252525] rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <Icon name={iconName} size={18} className="text-slate-400 group-hover:text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium capitalize truncate">
            {component.name.replace(/-/g, ' ')}
          </p>
          <p className="text-slate-500 text-xs truncate">{component.description}</p>
        </div>
      </div>
    </div>
  )
}

export default function ComponentPalette({ components, onAddSection }: ComponentPaletteProps) {
  const [search, setSearch] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  // Filter components by search
  const filteredComponents = search.trim()
    ? components.filter(c =>
        c.name.replace(/-/g, ' ').toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : components

  // Group components by category
  const groupedComponents = filteredComponents.reduce(
    (acc, component) => {
      const category = component.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(component)
      return acc
    },
    {} as Record<string, ComponentTemplate[]>
  )

  const categoryOrder = ['navigation', 'layout', 'marketing', 'content', 'ecommerce', 'other']
  const sortedCategories = Object.keys(groupedComponents).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    // If category not in order, put it at the end
    return (aIndex === -1 ? 100 : aIndex) - (bIndex === -1 ? 100 : bIndex)
  })

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    layout: 'Layout',
    marketing: 'Marketing',
    content: 'Content',
    ecommerce: 'E-commerce',
    other: 'Other',
  }

  const categoryIcons: Record<string, string> = {
    navigation: 'menu',
    layout: 'view-column',
    marketing: 'rocket',
    content: 'file',
    ecommerce: 'cart',
    other: 'layers',
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-[#1f1f1f]">
        <h3 className="text-white font-semibold text-sm mb-1">Components</h3>
        <p className="text-slate-500 text-xs mb-3">Drag or click to add sections</p>
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {sortedCategories.map((category) => {
          const isCollapsed = collapsedCategories.has(category)
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 mb-3 w-full group"
              >
                <Icon
                  name={categoryIcons[category] || 'layers'}
                  size={14}
                  className="text-slate-500"
                />
                <h4 className="text-slate-400 text-xs font-medium uppercase tracking-wider flex-1 text-left">
                  {categoryLabels[category] || category}
                </h4>
                <Icon
                  name="chevron-down"
                  size={14}
                  className={`text-slate-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {groupedComponents[category].map((component) => (
                    <DraggableComponent
                      key={component.id}
                      component={component}
                      onAdd={() => onAddSection(component.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
