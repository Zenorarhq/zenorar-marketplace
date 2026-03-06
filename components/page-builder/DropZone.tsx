'use client'

import { useDroppable } from '@dnd-kit/core'
import Icon from '@/components/ui/Icon'

interface DropZoneProps {
  id: string
  isActive: boolean // Is something being dragged?
}

export default function DropZone({ id, isActive }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: 'drop-zone', dropZoneId: id },
  })

  if (!isActive) return null

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all duration-200 ${
        isOver ? 'py-4' : 'py-1'
      }`}
    >
      <div
        className={`mx-4 rounded-lg border-2 border-dashed transition-all duration-200 flex items-center justify-center ${
          isOver
            ? 'border-green-500 bg-green-500/10 py-6'
            : 'border-[#2a2a2a] py-1'
        }`}
      >
        {isOver && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <Icon name="add" size={18} />
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}