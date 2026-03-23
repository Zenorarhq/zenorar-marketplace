'use client'

import { useEffect } from 'react'
import Icon from './Icon'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastState {
  message: string
  type: ToastType
}

interface ToastProps {
  toast: ToastState
  onClose: () => void
  duration?: number
}

export default function Toast({ toast, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [toast, onClose, duration])

  const styles: Record<ToastType, string> = {
    success: 'border-green-500/40 text-green-400',
    error:   'border-red-500/40 text-red-400',
    info:    'border-primary/40 text-primary',
  }
  const icons: Record<ToastType, string> = {
    success: 'check',
    error:   'alert',
    info:    'alert-circle',
  }

  return (
    <div className={`fixed bottom-5 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#141414] shadow-2xl min-w-[260px] max-w-[400px] ${styles[toast.type]}`}>
      <Icon name={icons[toast.type]} size={16} className="shrink-0" />
      <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0">
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}