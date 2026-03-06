'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Section } from '@/lib/cms/api'
import SectionRenderer from '@/components/cms/sections'
import EditableSection from './EditableSection'
import DropZone from './DropZone'
import Icon from '@/components/ui/Icon'

interface EditorCanvasProps {
  sections: Section[]
  selectedSectionId: string | null
  isDragging: boolean
  onSelectSection: (id: string | null) => void
  onDeleteSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  onMoveSection: (id: string, direction: -1 | 1) => void
  viewportSize?: 'desktop' | 'tablet' | 'mobile'
}

export default function EditorCanvas({
  sections,
  selectedSectionId,
  isDragging,
  onSelectSection,
  onDeleteSection,
  onDuplicateSection,
  onMoveSection,
  viewportSize = 'desktop',
}: EditorCanvasProps) {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  const canvasWidth = viewportSize === 'mobile'
    ? '375px'
    : viewportSize === 'tablet'
    ? '768px'
    : '100%'

  // Droppable for the empty canvas (when no sections exist)
  const { setNodeRef: setEmptyRef, isOver: isOverEmpty } = useDroppable({
    id: 'drop-zone-0',
    data: { type: 'drop-zone', dropZoneId: 'drop-zone-0' },
  })

  if (sortedSections.length === 0) {
    return (
      <div
        ref={setEmptyRef}
        className={`flex-1 flex items-center justify-center p-8 transition-colors ${
          isOverEmpty ? 'bg-green-500/5' : ''
        }`}
        onClick={() => onSelectSection(null)}
      >
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
            isOverEmpty ? 'bg-green-500/10' : 'bg-[#1a1a1a]'
          }`}>
            <Icon name={isOverEmpty ? 'add' : 'layers'} size={40} className={isOverEmpty ? 'text-green-400' : 'text-slate-600'} />
          </div>
          <h3 className="text-white font-medium text-lg mb-2">
            {isOverEmpty ? 'Drop to add section' : 'Start building your page'}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs">
            {isOverEmpty ? 'Release to add this component' : 'Drag a component from the left panel or click one to add it to your page'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#1a1a1a] p-4"
      onClick={() => onSelectSection(null)}
    >
      <div
        className="bg-[#0a0a0a] min-h-full shadow-2xl mx-auto transition-all duration-300"
        style={{ width: canvasWidth, maxWidth: '100%' }}
      >
        {/* Drop zone before first section */}
        <DropZone id="drop-zone-0" isActive={isDragging} />

        {sortedSections.map((section, index) => (
          <div key={section.id}>
            <EditableSection
              section={section}
              isSelected={selectedSectionId === section.id}
              isHovered={hoveredSectionId === section.id}
              isFirst={index === 0}
              isLast={index === sortedSections.length - 1}
              onSelect={() => onSelectSection(section.id)}
              onHover={(hovered) =>
                setHoveredSectionId(hovered ? section.id : null)
              }
              onMoveUp={() => onMoveSection(section.id, -1)}
              onMoveDown={() => onMoveSection(section.id, 1)}
              onDuplicate={() => onDuplicateSection(section.id)}
              onDelete={() => onDeleteSection(section.id)}
            >
              <SectionRenderer section={section} />
            </EditableSection>

            {/* Drop zone after each section */}
            <DropZone id={`drop-zone-${index + 1}`} isActive={isDragging} />
          </div>
        ))}
      </div>
    </div>
  )
}