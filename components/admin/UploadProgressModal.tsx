'use client'

import Icon from '@/components/ui/Icon'

const STAGES = [
  { key: 'queued',      label: 'Queued',                 desc: 'Waiting to start' },
  { key: 'obfuscating', label: 'Obfuscating code',       desc: 'Protecting source files' },
  { key: 'injecting',   label: 'Injecting license gate', desc: 'Adding license protection' },
  { key: 'uploading',   label: 'Uploading to storage',   desc: 'Sending to Cloudflare R2' },
  { key: 'saving',      label: 'Saving',                 desc: 'Updating database records' },
]

interface Props {
  isOpen: boolean
  fileName: string
  stage: string
  status: 'processing' | 'complete' | 'failed'
  error?: string | null
  onClose: () => void
}

export default function UploadProgressModal({ isOpen, fileName, stage, status, error, onClose }: Props) {
  if (!isOpen) return null

  const isDone   = status === 'complete'
  const isFailed = status === 'failed'
  const currentIdx = STAGES.findIndex(s => s.key === stage)

  const stageProgress = isDone ? 100 : Math.round(((currentIdx + 1) / STAGES.length) * 100)

  function stepState(i: number): 'done' | 'active' | 'failed' | 'pending' {
    if (isDone)   return 'done'
    if (isFailed) {
      if (i < currentIdx)  return 'done'
      if (i === currentIdx) return 'failed'
      return 'pending'
    }
    if (i < currentIdx)  return 'done'
    if (i === currentIdx) return 'active'
    return 'pending'
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
              ${isDone ? 'bg-primary/20' : isFailed ? 'bg-red-500/15' : 'bg-primary/10'}`}>
              <Icon
                name={isDone ? 'check' : isFailed ? 'x' : 'loading'}
                size={18}
                className={`${isDone ? 'text-primary' : isFailed ? 'text-red-400' : 'text-primary animate-spin'}`}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">
                {isDone ? 'Upload Complete' : isFailed ? 'Upload Failed' : 'Processing Upload'}
              </h2>
              <p className="text-xs text-slate-500 truncate">{fileName}</p>
            </div>
          </div>

          {/* Progress bar */}
          {!isFailed && (
            <div className="mt-4">
              <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="p-5 space-y-2">
          {STAGES.map((s, i) => {
            const state = stepState(i)
            return (
              <div key={s.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors
                ${state === 'active' ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}`}>

                {/* Indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                  ${state === 'done'    ? 'bg-primary/20 text-primary' : ''}
                  ${state === 'active'  ? 'bg-primary/30 text-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-[#141414]' : ''}
                  ${state === 'failed'  ? 'bg-red-500/20 text-red-400' : ''}
                  ${state === 'pending' ? 'bg-[#222] text-slate-600' : ''}
                `}>
                  {state === 'done'   && <Icon name="check"   size={11} />}
                  {state === 'active' && <Icon name="loading" size={11} className="animate-spin" />}
                  {state === 'failed' && <Icon name="x"       size={11} />}
                  {state === 'pending' && i + 1}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <p className={`text-sm font-medium leading-tight
                    ${state === 'active'  ? 'text-white' : ''}
                    ${state === 'done'    ? 'text-slate-400' : ''}
                    ${state === 'failed'  ? 'text-red-400' : ''}
                    ${state === 'pending' ? 'text-slate-600' : ''}
                  `}>{s.label}</p>
                  {state === 'active' && (
                    <p className="text-[11px] text-slate-500">{s.desc}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer — only shown when done or failed */}
        {(isDone || isFailed) && (
          <div className="px-5 pb-5">
            {isFailed && error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-3">
                {error}
              </p>
            )}
            {isDone && (
              <p className="text-primary text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2">
                <Icon name="check" size={12} />
                File uploaded and protected successfully.
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-black text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {isDone ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}