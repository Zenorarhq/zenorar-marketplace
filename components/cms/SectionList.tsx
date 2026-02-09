'use client'

import { useState } from 'react'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from '@/components/ui/Icon'
import { Section, ComponentTemplate } from '@/lib/cms/api'

// Container types that can have children
const containerTypes = ['section', 'column']

interface SectionListProps {
  sections: Section[]
  componentTemplates: ComponentTemplate[]
  selectedSectionId: string | null
  onSelectSection: (id: string | null) => void
  onDeleteSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  onMoveToContainer?: (sectionId: string, containerId: string | null) => void
}

function SortableSection({
  section,
  componentTemplate,
  isSelected,
  depth,
  isExpanded,
  hasChildren,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleExpand,
  onSelectSection,
  onDeleteSection,
  onDuplicateSection,
  componentTemplates,
  selectedSectionId,
}: {
  section: Section
  componentTemplate?: ComponentTemplate
  isSelected: boolean
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleExpand: () => void
  onSelectSection: (id: string | null) => void
  onDeleteSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  componentTemplates: ComponentTemplate[]
  selectedSectionId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const componentName = section.type.replace(/-/g, ' ')
  const iconName = componentTemplate?.icon || 'layers'
  const isContainer = containerTypes.includes(section.type)
  const children = section.children || []

  const getComponentTemplate = (type: string) =>
    componentTemplates.find((t) => t.name === type)

  return (
    <div ref={setNodeRef} style={style}>
      {/* Main Section Item */}
      <div
        className={`group relative bg-[#1a1a1a] border rounded-lg transition-all ${
          isDragging ? 'opacity-50 z-50' : ''
        } ${
          isSelected
            ? 'border-primary ring-1 ring-primary/20'
            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        {/* Section Header */}
        <div
          className="flex items-center gap-2 p-3 cursor-pointer"
          onClick={onSelect}
        >
          {/* Expand/Collapse Button for containers */}
          {isContainer ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand()
              }}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Icon
                name={isExpanded ? 'expand_more' : 'chevron_right'}
                size={16}
              />
            </button>
          ) : (
            <div className="w-6" /> // Spacer for non-containers
          )}

          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
          >
            <Icon name="menu" size={16} />
          </button>

          {/* Section Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isSelected ? 'bg-primary/10' : 'bg-[#252525]'
          }`}>
            <Icon
              name={iconName}
              size={16}
              className={isSelected ? 'text-primary' : 'text-slate-400'}
            />
          </div>

          {/* Section Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium capitalize truncate ${
                isSelected ? 'text-primary' : 'text-white'
              }`}>
                {componentName}
              </p>
              {isContainer && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                  {children.length} {children.length === 1 ? 'child' : 'children'}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs truncate">
              {section.props?.title || section.props?.layout || `Section ${section.order + 1}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Duplicate"
            >
              <Icon name="copy" size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title="Delete"
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Children (when expanded) */}
      {isContainer && isExpanded && (
        <div className="mt-1 space-y-1">
          {children.length > 0 ? (
            children
              .sort((a, b) => a.order - b.order)
              .map((child) => (
                <NestedSortableSection
                  key={child.id}
                  section={child}
                  componentTemplate={getComponentTemplate(child.type)}
                  isSelected={selectedSectionId === child.id}
                  depth={depth + 1}
                  onSelectSection={onSelectSection}
                  onDeleteSection={onDeleteSection}
                  onDuplicateSection={onDuplicateSection}
                  componentTemplates={componentTemplates}
                  selectedSectionId={selectedSectionId}
                />
              ))
          ) : (
            <div
              className="ml-4 border-2 border-dashed border-[#2a2a2a] rounded-lg p-4 text-center"
              style={{ marginLeft: (depth + 1) * 16 }}
            >
              <p className="text-slate-500 text-xs">
                Drop sections here or add from palette
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Wrapper component for nested sections with their own expand state
function NestedSortableSection({
  section,
  componentTemplate,
  isSelected,
  depth,
  onSelectSection,
  onDeleteSection,
  onDuplicateSection,
  componentTemplates,
  selectedSectionId,
}: {
  section: Section
  componentTemplate?: ComponentTemplate
  isSelected: boolean
  depth: number
  onSelectSection: (id: string | null) => void
  onDeleteSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  componentTemplates: ComponentTemplate[]
  selectedSectionId: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = (section.children?.length || 0) > 0

  return (
    <SortableSection
      section={section}
      componentTemplate={componentTemplate}
      isSelected={isSelected}
      depth={depth}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      onSelect={() => onSelectSection(section.id)}
      onDelete={() => onDeleteSection(section.id)}
      onDuplicate={() => onDuplicateSection(section.id)}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
      onSelectSection={onSelectSection}
      onDeleteSection={onDeleteSection}
      onDuplicateSection={onDuplicateSection}
      componentTemplates={componentTemplates}
      selectedSectionId={selectedSectionId}
    />
  )
}

export default function SectionList({
  sections,
  componentTemplates,
  selectedSectionId,
  onSelectSection,
  onDeleteSection,
  onDuplicateSection,
}: SectionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const getComponentTemplate = (type: string) =>
    componentTemplates.find((t) => t.name === type)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Get all section IDs recursively for sortable context
  const getAllSectionIds = (sectionList: Section[]): string[] => {
    const ids: string[] = []
    for (const section of sectionList) {
      ids.push(section.id)
      if (section.children) {
        ids.push(...getAllSectionIds(section.children))
      }
    }
    return ids
  }

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
            <Icon name="layers" size={32} className="text-slate-600" />
          </div>
          <h3 className="text-white font-medium mb-2">No sections yet</h3>
          <p className="text-slate-500 text-sm max-w-xs">
            Drag components from the left panel or click to add them to your page
          </p>
        </div>
      </div>
    )
  }

  const allIds = getAllSectionIds(sections)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sections.map((section) => {
            const hasChildren = (section.children?.length || 0) > 0
            const isExpanded = expandedIds.has(section.id) || hasChildren // Auto-expand if has children

            return (
              <SortableSection
                key={section.id}
                section={section}
                componentTemplate={getComponentTemplate(section.type)}
                isSelected={selectedSectionId === section.id}
                depth={0}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onSelect={() => onSelectSection(section.id)}
                onDelete={() => onDeleteSection(section.id)}
                onDuplicate={() => onDuplicateSection(section.id)}
                onToggleExpand={() => toggleExpand(section.id)}
                onSelectSection={onSelectSection}
                onDeleteSection={onDeleteSection}
                onDuplicateSection={onDuplicateSection}
                componentTemplates={componentTemplates}
                selectedSectionId={selectedSectionId}
              />
            )
          })}
        </div>
      </SortableContext>
    </div>
  )
}
