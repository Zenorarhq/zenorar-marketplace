'use client'

import Icon from '@/components/ui/Icon'

interface SectionToolbarProps {
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  isFirst: boolean
  isLast: boolean
}

export default function SectionToolbar({
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  isFirst,
  isLast,
}: SectionToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl p-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); onMoveUp() }}
        disabled={isFirst}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
        title="Move Up"
      >
        <Icon name="expand_less" size={16} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMoveDown() }}
        disabled={isLast}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
        title="Move Down"
      >
        <Icon name="expand_more" size={16} />
      </button>
      <div className="w-px h-5 bg-[#2a2a2a] mx-0.5" />
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate() }}
        className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-colors"
        title="Duplicate"
      >
        <Icon name="copy" size={16} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
        title="Delete"
      >
        <Icon name="delete" size={16} />
      </button>
    </div>
  )
}