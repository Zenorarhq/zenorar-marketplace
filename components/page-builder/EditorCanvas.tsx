'use client'

import { Section } from '@/lib/cms/api'
import SectionRenderer from '@/components/cms/sections'

interface EditorCanvasProps {
  sections: Section[]
  selectedSectionId: string | null
  isDragging: boolean
  onSelectSection: (id: string | null) => void
  onDeleteSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  onMoveSection: (id: string, direction: -1 | 1) => void
  onAddSection?: () => void
  onAddToContainer?: (containerId: string) => void
  viewportSize?: 'desktop' | 'tablet' | 'mobile'
}

export default function EditorCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  viewportSize = 'desktop',
}: EditorCanvasProps) {
  const canvasWidth = viewportSize === 'mobile'
    ? '375px'
    : viewportSize === 'tablet'
    ? '768px'
    : '100%'

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#1a1a1a] p-4"
      onClick={() => onSelectSection(null)}
    >
      <div
        className="bg-[#0a0a0a] min-h-full shadow-2xl mx-auto transition-all duration-300"
        style={{ width: canvasWidth, maxWidth: '100%' }}
      >
        {sortedSections.map((section) => (
          <div
            key={section.id}
            onClick={(e) => {
              e.stopPropagation()
              onSelectSection(section.id)
            }}
            className={`relative cursor-pointer transition-all ${
              selectedSectionId === section.id
                ? 'ring-2 ring-primary ring-offset-0'
                : 'hover:ring-1 hover:ring-primary/30'
            }`}
          >
            <SectionRenderer section={section} />
          </div>
        ))}
      </div>
    </div>
  )
}
