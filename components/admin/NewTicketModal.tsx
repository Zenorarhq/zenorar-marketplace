'use client'

import { useState } from 'react'
import { ticketsApi, TicketCategory, TicketPriority } from '@/lib/api/tickets'
import Icon from '@/components/ui/Icon'

interface NewTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NewTicketModal({ isOpen, onClose, onSuccess }: NewTicketModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'GENERAL' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
    guestEmail: '',
    guestName: '',
    orderId: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.subject || !formData.subject.trim()) {
        setError('Subject is required')
        setLoading(false)
        return
      }

      if (!formData.description || !formData.description.trim()) {
        setError('Description is required')
        setLoading(false)
        return
      }

      const ticketData = {
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        guestEmail: formData.guestEmail.trim() || undefined,
        guestName: formData.guestName.trim() || undefined,
        orderId: formData.orderId.trim() || undefined,
      }

      const result = await ticketsApi.create(ticketData)

      if (result.success && result.data) {
        onSuccess()
        resetForm()
        onClose()
      } else {
        setError(result.error || 'Failed to create ticket')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      subject: '',
      description: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      guestEmail: '',
      guestName: '',
      orderId: '',
    })
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
          <h2 className="text-xl font-bold text-white">New Support Ticket</h2>
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
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of the issue"
                className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the issue..."
                rows={6}
                className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                required
                disabled={loading}
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                  className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  disabled={loading}
                >
                  <option value="GENERAL">General</option>
                  <option value="ORDER">Order</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="REFUND">Refund</option>
                  <option value="PRODUCT">Product</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                  className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  disabled={loading}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="border-t border-border-dark pt-4 mt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Optional Information</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Guest Name</label>
                    <input
                      type="text"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      placeholder="Customer name"
                      className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Guest Email</label>
                    <input
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                      placeholder="customer@example.com"
                      className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Related Order ID</label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="ORD-123456"
                    className="w-full bg-charcoal border border-border-dark rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    disabled={loading}
                  />
                </div>
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
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
