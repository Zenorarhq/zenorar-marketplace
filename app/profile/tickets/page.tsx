'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { ticketsApi, Ticket as ApiTicket, TicketDetail, TicketCategory } from '@/lib/api/tickets'

type FilterStatus = 'all' | 'open' | 'in-progress' | 'resolved' | 'closed'

// Map backend UPPERCASE statuses to UI lowercase
function mapStatus(status: string): 'open' | 'in-progress' | 'resolved' | 'closed' {
  switch (status) {
    case 'OPEN': return 'open'
    case 'IN_PROGRESS':
    case 'WAITING_CUSTOMER':
    case 'WAITING_INTERNAL': return 'in-progress'
    case 'RESOLVED': return 'resolved'
    case 'CLOSED': return 'closed'
    default: return 'open'
  }
}

// Map form category values to backend enums
function mapCategory(value: string): TicketCategory {
  switch (value) {
    case 'scripts': return 'TECHNICAL'
    case 'esim': return 'PRODUCT'
    case 'billing': return 'PAYMENT'
    case 'account': return 'ACCOUNT'
    case 'other': return 'GENERAL'
    default: return 'GENERAL'
  }
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  // New ticket form state
  const [newTicket, setNewTicket] = useState({ subject: '', category: '', priority: 'medium', description: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Reply state
  const [replyContent, setReplyContent] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  // Fetch user's tickets from Railway API
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const result = await ticketsApi.getMyTickets()
      if (result.success && result.data) return result.data
      return []
    },
    refetchInterval: 30000,
  })

  // Fetch selected ticket detail
  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null
      const result = await ticketsApi.getById(selectedTicketId)
      if (result.success && result.data) return result.data
      return null
    },
    enabled: !!selectedTicketId && showViewModal,
  })

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const uiStatus = mapStatus(ticket.status)
    const matchesFilter = activeFilter === 'all' || uiStatus === activeFilter
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Create ticket handler
  async function handleCreateTicket() {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      setCreateError('Subject and description are required')
      return
    }
    setIsCreating(true)
    setCreateError('')
    try {
      const result = await ticketsApi.create({
        subject: newTicket.subject,
        description: newTicket.description,
        category: mapCategory(newTicket.category),
        priority: newTicket.priority.toUpperCase() as any,
      })
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
        setShowNewTicketModal(false)
        setNewTicket({ subject: '', category: '', priority: 'medium', description: '' })
      } else {
        setCreateError(result.error || 'Failed to create ticket')
      }
    } catch {
      setCreateError('Failed to create ticket')
    } finally {
      setIsCreating(false)
    }
  }

  // Reply handler
  async function handleReply() {
    if (!replyContent.trim() || !selectedTicketId) return
    setIsReplying(true)
    try {
      const result = await ticketsApi.addResponse(selectedTicketId, replyContent, false)
      if (result.success) {
        setReplyContent('')
        queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] })
        queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      }
    } catch {
      // silent fail
    } finally {
      setIsReplying(false)
    }
  }

  // Open view modal
  function handleViewTicket(ticketId: string) {
    setSelectedTicketId(ticketId)
    setShowViewModal(true)
    setReplyContent('')
  }

  const getStatusBadge = (status: string) => {
    const uiStatus = typeof status === 'string' && status === status.toUpperCase() ? mapStatus(status) : status
    switch (uiStatus) {
      case 'open':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Open
          </div>
        )
      case 'in-progress':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-900/30 text-yellow-500 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> In Progress
          </div>
        )
      case 'resolved':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Resolved
          </div>
        )
      case 'closed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Closed
          </div>
        )
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase()
    switch (p) {
      case 'urgent':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Urgent</span>
      case 'high':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">High</span>
      case 'medium':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Medium</span>
      case 'low':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low</span>
      default:
        return null
    }
  }

  const filterButtons: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All Tickets' },
    { key: 'open', label: 'Open' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ]

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Support Tickets</h1>
            <p className="text-slate-400">Track and manage your support requests.</p>
          </div>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
          >
            <Icon name="add" size={18} />
            New Ticket
          </button>
        </div>

        {/* Search and Filter Tabs */}
        <div className="bg-[#1a1a1a] rounded-xl p-2 flex flex-col md:flex-row items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto pl-2">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-300 text-sm py-2 pl-9 pr-4 placeholder:text-slate-600 focus:ring-0"
              placeholder="Search tickets by ID, subject..."
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading tickets...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-16">
                <Icon name="ticket" size={64} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No tickets found.</p>
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="text-primary font-medium hover:underline"
                >
                  Create a new support ticket
                </button>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const uiStatus = mapStatus(ticket.status)
                return (
                  <div
                    key={ticket.id}
                    className={`bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg hover:border-primary/30 transition-colors cursor-pointer ${
                      uiStatus === 'closed' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Ticket Info */}
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-slate-500 font-mono text-sm">{ticket.ticketNumber}</span>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h3 className="text-white font-bold text-base sm:text-lg mb-2">{ticket.subject}</h3>
                          <p className="text-slate-400 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Icon name="tag" size={14} />
                              {ticket.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="calendar" size={14} />
                              Created: {formatDateShort(ticket.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="clock" size={14} />
                              Updated: {formatDateShort(ticket.updatedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="message" size={14} />
                              {ticket.responseCount} {ticket.responseCount === 1 ? 'reply' : 'replies'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleViewTicket(ticket.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors text-sm"
                          >
                            <Icon name="eye" size={16} />
                            View
                          </button>
                          {(uiStatus === 'open' || uiStatus === 'in-progress') && (
                            <button
                              onClick={() => handleViewTicket(ticket.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors text-sm"
                            >
                              <Icon name="message" size={16} />
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Stats Summary */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                <Icon name="ticket" size={16} />
                Total Tickets
              </div>
              <p className="text-xl sm:text-2xl font-bold text-white">{tickets.length}</p>
            </div>
            <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                <Icon name="alert" size={16} />
                Open
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-400">
                {tickets.filter((t) => mapStatus(t.status) === 'open').length}
              </p>
            </div>
            <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 text-yellow-500 text-sm mb-2">
                <Icon name="loading" size={16} />
                In Progress
              </div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-500">
                {tickets.filter((t) => mapStatus(t.status) === 'in-progress').length}
              </p>
            </div>
            <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
                <Icon name="check-circle" size={16} />
                Resolved
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-500">
                {tickets.filter((t) => mapStatus(t.status) === 'resolved').length}
              </p>
            </div>
          </div>
        </>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-border-dark flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create New Ticket</h2>
              <button
                onClick={() => { setShowNewTicketModal(false); setCreateError('') }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select a category</option>
                  <option value="scripts">Scripts & Tools</option>
                  <option value="esim">eSIM & Connectivity</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="account">Account & Security</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label>
                <textarea
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Describe your issue in detail..."
                ></textarea>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Attachments (optional)</label>
                <div className="border-2 border-dashed border-border-dark rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Icon name="upload" size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Click to upload or drag and drop</p>
                  <p className="text-slate-600 text-xs mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-border-dark flex gap-3 justify-end">
              <button
                onClick={() => { setShowNewTicketModal(false); setCreateError('') }}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isCreating}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
              >
                {isCreating ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {showViewModal && selectedTicketId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-border-dark flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {ticketDetail?.ticketNumber || 'Loading...'}
              </h2>
              <button
                onClick={() => { setShowViewModal(false); setSelectedTicketId(null) }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading ticket...</p>
              </div>
            ) : ticketDetail ? (
              <>
                {/* Ticket Info */}
                <div className="p-4 sm:p-6 border-b border-border-dark">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {getStatusBadge(ticketDetail.status)}
                    {getPriorityBadge(ticketDetail.priority)}
                    <span className="text-slate-500 text-xs">{ticketDetail.category}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{ticketDetail.subject}</h3>
                  <p className="text-slate-400 text-sm mb-3">{ticketDetail.description}</p>
                  <p className="text-slate-600 text-xs">
                    Created {formatDateShort(ticketDetail.createdAt)}
                  </p>
                  {ticketDetail.resolution && (
                    <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                      <p className="text-green-400 text-sm font-medium mb-1">Resolution</p>
                      <p className="text-slate-300 text-sm">{ticketDetail.resolution}</p>
                    </div>
                  )}
                </div>

                {/* Conversation Thread */}
                <div className="p-4 sm:p-6 space-y-4">
                  <h4 className="text-white font-semibold text-sm">
                    Responses ({ticketDetail.responses?.filter(r => !r.isInternal).length || 0})
                  </h4>

                  {ticketDetail.responses?.filter(r => !r.isInternal).length === 0 ? (
                    <p className="text-slate-500 text-sm py-4 text-center">No responses yet</p>
                  ) : (
                    ticketDetail.responses?.filter(r => !r.isInternal).map((response) => (
                      <div key={response.id} className="bg-black/30 border border-border-dark rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white text-sm font-medium">
                            {response.user?.name || 'Support Team'}
                          </span>
                          <span className="text-slate-600 text-xs">
                            {formatDateShort(response.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{response.content}</p>
                      </div>
                    ))
                  )}

                  {/* Reply Form (only for open/in-progress tickets) */}
                  {mapStatus(ticketDetail.status) !== 'closed' && mapStatus(ticketDetail.status) !== 'resolved' && (
                    <div className="pt-4 border-t border-border-dark">
                      <textarea
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary focus:border-primary resize-none text-sm"
                        placeholder="Write your reply..."
                      ></textarea>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleReply}
                          disabled={isReplying || !replyContent.trim()}
                          className="px-5 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 text-sm"
                        >
                          {isReplying ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-400">Failed to load ticket details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
