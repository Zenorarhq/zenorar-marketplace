'use client'

import Icon from '@/components/ui/Icon'

interface StructurePickerProps {
  onSelect: (layout: string) => void
  onClose: () => void
}

const structures = [
  // Row 1 — basic layouts
  { layout: '1', label: 'Full Width', columns: [{ width: '100%' }] },
  { layout: '1/2-1/2', label: '2 Equal', columns: [{ width: '50%' }, { width: '50%' }] },
  { layout: '1/3-2/3', label: '1/3 + 2/3', columns: [{ width: '33%' }, { width: '67%' }] },
  { layout: '2/3-1/3', label: '2/3 + 1/3', columns: [{ width: '67%' }, { width: '33%' }] },
  { layout: '1/3-1/3-1/3', label: '3 Equal', columns: [{ width: '33%' }, { width: '33%' }, { width: '33%' }] },
  { layout: '1/4-1/4-1/4-1/4', label: '4 Equal', columns: [{ width: '25%' }, { width: '25%' }, { width: '25%' }, { width: '25%' }] },
  // Row 2 — asymmetric
  { layout: '1/4-3/4', label: '1/4 + 3/4', columns: [{ width: '25%' }, { width: '75%' }] },
  { layout: '3/4-1/4', label: '3/4 + 1/4', columns: [{ width: '75%' }, { width: '25%' }] },
  { layout: '1/4-1/2-1/4', label: '1/4 + 1/2 + 1/4', columns: [{ width: '25%' }, { width: '50%' }, { width: '25%' }] },
]

export default function StructurePicker({ onSelect, onClose }: StructurePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-slate-300 text-sm font-medium">Select your structure</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {structures.map((s) => (
            <button
              key={s.layout}
              onClick={() => onSelect(s.layout)}
              className="group flex flex-col items-center gap-2 p-3 bg-[#252525] border border-[#333] rounded-lg hover:border-primary/60 hover:bg-[#2a2a2a] transition-all"
              title={s.label}
            >
              {/* Visual column preview */}
              <div className="flex w-full h-12 gap-1 rounded overflow-hidden">
                {s.columns.map((col, i) => (
                  <div
                    key={i}
                    className="bg-slate-500/30 group-hover:bg-primary/30 rounded-sm transition-colors"
                    style={{ width: col.width }}
                  />
                ))}
              </div>
              <span className="text-slate-500 group-hover:text-slate-300 text-[10px] font-medium transition-colors">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}