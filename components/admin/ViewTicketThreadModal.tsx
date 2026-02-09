'use client'

import { useState, useEffect } from 'react'
import { ticketsApi, TicketDetail } from '@/lib/api/tickets'
import Icon from '@/components/ui/Icon'

interface ViewTicketThreadModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
}

export default function ViewTicketThreadModal({ isOpen, onClose, ticketId }: ViewTicketThreadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState<TicketDetail | null>(null)

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket()
    }
  }, [isOpen, ticketId])

  async function loadTicket() {
    if (!ticketId) return

    setLoading(true)
    setError('')

    try {
      const result = await ticketsApi.getById(ticketId)

      if (result.success && result.data) {
        setTicket(result.data)
      } else {
        setError(result.error || 'Failed to load ticket')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      setTicket(null)
      setError('')
      onClose()
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; border: string; label: string }> = {
      OPEN: { bg: 'bg-primary/20', text: 'text-primary', border: 'border-primary/30', label: 'Open' },
      IN_PROGRESS: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30', label: 'In Progress' },
      WAITING_CUSTOMER: { bg: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/30', label: 'Waiting Customer' },
      WAITING_INTERNAL: { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500/30', label: 'Waiting Internal' },
      RESOLVED: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/30', label: 'Resolved' },
      CLOSED: { bg: 'bg-slate-500/20', text: 'text-slate-500', border: 'border-slate-500/30', label: 'Closed' },
    }
    const badge = badges[status] || badges.OPEN
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string; border: string; label: string }> = {
      URGENT: { bg: 'bg-rose-500/20', text: 'text-rose-500', border: 'border-rose-500/30', label: 'Urgent' },
      HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500/30', label: 'High' },
      MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30', label: 'Medium' },
      LOW: { bg: 'bg-slate-500/20', text: 'text-slate-500', border: 'border-slate-500/30', label: 'Low' },
    }
    const badge = badges[priority] || badges.MEDIUM
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background-dark border border-border-dark rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">
                {ticket ? `Ticket #${ticket.ticketNumber}` : 'Loading...'}
              </h2>
              {ticket && (
                <>
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                </>
              )}
            </div>
            {ticket && (
              <p className="text-sm text-slate-400">
                Created {formatDate(ticket.createdAt)} by{' '}
                {ticket.user?.name || ticket.guestName || ticket.guestEmail || 'Anonymous'}
              </p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && !ticket && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading ticket...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Icon name="alert" size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <button
                  onClick={loadTicket}
                  className="text-xs text-primary hover:text-primary/80 font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {ticket && (
            <div className="space-y-6">
              {/* Ticket Details */}
              <div className="bg-charcoal border border-border-dark rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">{ticket.subject}</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Category</p>
                    <p className="text-sm text-white font-medium">{ticket.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                    <p className="text-sm text-white font-medium">
                      {ticket.assignedTo?.name || 'Unassigned'}
                    </p>
                  </div>
                  {ticket.orderId && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Related Order</p>
                      <p className="text-sm text-primary font-medium">{ticket.orderId}</p>
                    </div>
                  )}
                  {ticket.resolvedAt && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Resolved At</p>
                      <p className="text-sm text-white font-medium">{formatDate(ticket.resolvedAt)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Description</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{ticket.description}</p>
                </div>

                {ticket.resolution && (
                  <div className="mt-6 pt-6 border-t border-border-dark">
                    <p className="text-xs text-slate-500 mb-2">Resolution</p>
                    <p className="text-sm text-green-400 whitespace-pre-wrap">{ticket.resolution}</p>
                  </div>
                )}
              </div>

              {/* Responses */}
              {ticket.responses && ticket.responses.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Responses ({ticket.responses.length})
                  </h3>
                  <div className="space-y-4">
                    {ticket.responses.map((response) => (
                      <div
                        key={response.id}
                        className={`bg-charcoal border rounded-lg p-4 ${
                          response.isInternal
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-border-dark'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-background-dark flex items-center justify-center">
                              <Icon name="user" size={16} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {response.user?.name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(response.createdAt)}
                              </p>
                            </div>
                          </div>
                          {response.isInternal && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                              Internal Note
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{response.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-dark">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
