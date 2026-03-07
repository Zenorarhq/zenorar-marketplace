'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Section } from '@/lib/cms/api'
import SectionRenderer from '@/components/cms/sections'
import SectionContainer from '@/components/cms/sections/SectionContainer'
import ColumnSection from '@/components/cms/sections/ColumnSection'
import EditableSection from './EditableSection'
import DropZone from './DropZone'
import Icon from '@/components/ui/Icon'

const containerTypes = ['section', 'column']

const containerComponents: Record<string, React.ComponentType<{ props: Record<string, any>; children?: React.ReactNode }>> = {
  section: SectionContainer,
  column: ColumnSection,
}

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
  isDragging,
  onSelectSection,
  onDeleteSection,
  onDuplicateSection,
  onMoveSection,
  onAddSection,
  onAddToContainer,
  viewportSize = 'desktop',
}: EditorCanvasProps) {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)

  const canvasWidth = viewportSize === 'mobile'
    ? '375px'
    : viewportSize === 'tablet'
    ? '768px'
    : '100%'

  // Droppable for the empty canvas
  const { setNodeRef: setEmptyRef, isOver: isOverEmpty } = useDroppable({
    id: 'drop-zone-0',
    data: { type: 'drop-zone', dropZoneId: 'drop-zone-0' },
  })

  // Recursive section renderer for the editor
  function renderSections(
    sectionList: Section[],
    parentId: string | null,
  ) {
    const sorted = [...sectionList].sort((a, b) => a.order - b.order)

    return sorted.map((section, index) => {
      const isContainer = containerTypes.includes(section.type)
      const children = section.children || []
      const sortedChildren = [...children].sort((a, b) => a.order - b.order)
      const ContainerComponent = isContainer ? containerComponents[section.type] : null

      // Drop zone ID prefix for this level
      const dropPrefix = parentId ? `container-${parentId}-drop` : 'drop-zone'

      return (
        <div key={section.id}>
          <EditableSection
            section={section}
            isSelected={selectedSectionId === section.id}
            isHovered={hoveredSectionId === section.id}
            isFirst={index === 0}
            isLast={index === sorted.length - 1}
            isContainer={isContainer}
            isDragging={isDragging}
            onSelect={() => onSelectSection(section.id)}
            onHover={(hovered) =>
              setHoveredSectionId(hovered ? section.id : null)
            }
            onMoveUp={() => onMoveSection(section.id, -1)}
            onMoveDown={() => onMoveSection(section.id, 1)}
            onDuplicate={() => onDuplicateSection(section.id)}
            onDelete={() => onDeleteSection(section.id)}
          >
            {isContainer && ContainerComponent ? (
              <ContainerComponent props={section.props}>
                {sortedChildren.length > 0 ? (
                  <>
                    {/* Drop zone before first child */}
                    <DropZone id={`container-${section.id}-drop-0`} isActive={isDragging} />

                    {sortedChildren.map((child, childIndex) => (
                      <div key={child.id}>
                        {renderSections([child], section.id)[0]}
                        {/* Drop zone after each child */}
                        <DropZone
                          id={`container-${section.id}-drop-${childIndex + 1}`}
                          isActive={isDragging}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Empty container: show placeholder or drop zone */}
                    <DropZone id={`container-${section.id}-drop-0`} isActive={isDragging} />
                    {!isDragging && (
                      <div className="min-h-[80px] flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddToContainer?.(section.id)
                          }}
                          className="w-9 h-9 rounded-full bg-white/5 border border-[#3a3a3a] hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group z-[7] relative"
                          title="Add component"
                        >
                          <Icon name="add" size={20} className="text-slate-500 group-hover:text-primary transition-colors" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </ContainerComponent>
            ) : (
              <SectionRenderer section={section} />
            )}
          </EditableSection>

          {/* Drop zone between sections at this level */}
          <DropZone id={`${dropPrefix}-${index + 1}`} isActive={isDragging} />
        </div>
      )
    })
  }

  // Sort top-level sections
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

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

        {renderSections(sortedSections, null)}

        {/* Add Section button at bottom of canvas */}
        {onAddSection && (
          <div className="flex justify-center py-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddSection()
              }}
              className="w-10 h-10 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/20 flex items-center justify-center transition-all group"
              title="Add new section"
            >
              <Icon name="add" size={22} className="text-primary/60 group-hover:text-primary transition-colors" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}