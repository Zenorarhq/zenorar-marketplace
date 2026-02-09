'use client'

import { useState } from 'react'
import { ticketsApi } from '@/lib/api/tickets'
import Icon from '@/components/ui/Icon'

interface ReplyTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  ticketId: string | null
  ticketNumber: string | null
}

export default function ReplyTicketModal({ isOpen, onClose, onSuccess, ticketId, ticketNumber }: ReplyTicketModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!ticketId) {
      setError('Invalid ticket ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!content || !content.trim()) {
        setError('Response content is required')
        setLoading(false)
        return
      }

      const result = await ticketsApi.addResponse(ticketId, content.trim(), isInternal)

      if (result.success && result.data) {
        onSuccess()
        resetForm()
        onClose()
      } else {
        setError(result.error || 'Failed to add response')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add response')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setContent('')
    setIsInternal(false)
    setError('')
  }

  function handleClose() {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background-dark border border-border-dark rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark">
          <div>
            <h2 className="text-xl font-bold text-white">Reply to Ticket</h2>
            {ticketNumber && (
              <p className="text-sm text-slate-400 mt-1">Ticket #{ticketNumber}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <Icon name="x" size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Icon name="alert" size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Response Content */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Response <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your response here..."
                rows={8}
                className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                required
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2">
                Provide a helpful response to the customer's inquiry
              </p>
            </div>

            {/* Internal Note Checkbox */}
            <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <input
                type="checkbox"
                id="isInternal"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 bg-charcoal border-border-dark rounded text-primary focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <div className="flex-1">
                <label htmlFor="isInternal" className="text-sm font-semibold text-white cursor-pointer block">
                  Internal Note
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  This response will only be visible to staff members
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-dark">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Icon name="spinner" size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Icon name="send" size={16} />
                Send Reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
