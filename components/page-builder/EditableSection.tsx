'use client'

import { useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Section } from '@/lib/cms/api'
import SectionToolbar from './SectionToolbar'

interface EditableSectionProps {
  section: Section
  isSelected: boolean
  isHovered: boolean
  isFirst: boolean
  isLast: boolean
  isContainer?: boolean
  isDragging?: boolean
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
  isContainer = false,
  isDragging = false,
  onSelect,
  onHover,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}: EditableSectionProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Register containers as droppable targets
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: section.id,
    data: { type: 'container', sectionId: section.id, sectionType: section.type },
    disabled: !isContainer,
  })

  // Combine refs
  const setRefs = (el: HTMLDivElement | null) => {
    wrapperRef.current = el
    if (isContainer) setDropRef(el)
  }

  return (
    <div
      ref={setRefs}
      className="relative group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Rendered content */}
      {isContainer ? (
        // Containers: allow pointer events so children are interactive
        <div
          onClick={(e) => {
            // Only select this container if click is directly on the container bg, not on a child
            if (e.target === e.currentTarget) {
              e.stopPropagation()
              onSelect()
            }
          }}
        >
          {children}
        </div>
      ) : (
        // Leaf sections: block pointer events, use overlay for selection
        <div className="pointer-events-none">
          {children}
        </div>
      )}

      {/* Selection/Hover overlay border */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-150 ${
          isOver && isDragging
            ? 'ring-2 ring-primary ring-inset bg-primary/5'
            : isSelected
            ? 'ring-2 ring-green-500 ring-inset'
            : isHovered
            ? 'ring-2 ring-blue-400 ring-dashed ring-inset'
            : ''
        }`}
      />

      {/* Drop indicator for containers */}
      {isContainer && isOver && isDragging && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[3]">
          <div className="bg-primary/20 border-2 border-dashed border-primary rounded-lg px-4 py-2">
            <p className="text-primary text-sm font-medium">Drop inside this section</p>
          </div>
        </div>
      )}

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

      {/* Click target overlay — only for non-containers (containers use onClick on wrapper) */}
      {!isContainer && (
        <div
          className="absolute inset-0 cursor-pointer z-[5]"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        />
      )}
    </div>
  )
}