import Icon from './Icon'

export interface ConfirmModalState {
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

interface ConfirmModalProps {
  modal: ConfirmModalState
  loading?: boolean
  onClose: () => void
}

export default function ConfirmModal({ modal, loading = false, onClose }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-bold text-white">{modal.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="x" size={20} />
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-6">{modal.description}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:border-primary transition-all">
            Cancel
          </button>
          <button
            onClick={modal.onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-colors ${
              modal.danger
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-primary text-black hover:brightness-110'
            }`}>
            {loading ? 'Processing...' : (modal.confirmLabel || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}