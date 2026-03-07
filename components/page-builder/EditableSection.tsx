'use client'

import { useRef } from 'react'
import { Section } from '@/lib/cms/api'
import SectionToolbar from './SectionToolbar'

interface EditableSectionProps {
  section: Section
  isSelected: boolean
  isHovered: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onHover: (hovered: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  children: React.ReactNode
}

export default function EditableSection({
  section,
  isSelected,
  isHovered,
  isFirst,
  isLast,
  onSelect,
  onHover,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}: EditableSectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={wrapperRef}
      className="relative group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Actual rendered component */}
      <div className="pointer-events-none">
        {children}
      </div>

      {/* Selection/Hover overlay border */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-green-500 ring-inset'
            : isHovered
            ? 'ring-2 ring-blue-400 ring-dashed ring-inset'
            : ''
        }`}
      />

      {/* Section type label badge */}
      {(isHovered || isSelected) && (
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-medium z-10 pointer-events-none ${
            isSelected
              ? 'bg-green-600 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {section.type === 'column' ? 'section' : section.type.replace(/-/g, ' ')}
        </div>
      )}

      {/* Floating toolbar */}
      {(isHovered || isSelected) && (
        <div className="absolute top-2 right-2 z-20">
          <SectionToolbar
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      )}

      {/* Click target overlay — re-enables pointer events for selection */}
      <div
        className="absolute inset-0 cursor-pointer z-[5]"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />
    </div>
  )
}