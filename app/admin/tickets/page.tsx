'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { ticketsApi, Ticket, TicketStatus, TicketPriority } from '@/lib/api/tickets'

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch tickets with React Query (cached for 5 minutes)
  const { data: tickets = [], isLoading: ticketsLoading, error: ticketsError } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const result = await ticketsApi.list()
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load tickets')
    },
  })

  // Fetch stats with React Query (cached)
  const { data: stats = { total: 0, byStatus: [], byPriority: [] } } = useQuery({
    queryKey: ['admin-tickets-stats'],
    queryFn: async () => {
      const result = await ticketsApi.getStats()
      if (result.success && result.data) {
        return result.data
      }
      return { total: 0, byStatus: [], byPriority: [] }
    },
  })

  const loading = ticketsLoading
  const error = ticketsError ? String(ticketsError) : ''

  async function handleResolve(ticketId: string) {
    const result = await ticketsApi.resolve(ticketId)
    if (result.success && result.data) {
      // Invalidate cache to trigger refetch after CRUD operation
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets-stats'] })
    } else {
      alert(result.error || 'Failed to resolve ticket')
    }
  }

  function loadData() {
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    queryClient.invalidateQueries({ queryKey: ['admin-tickets-stats'] })
  }

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.user?.name || ticket.guestName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length
  const urgentTickets = tickets.filter((t) => t.priority === 'URGENT').length
  const unassignedTickets = tickets.filter((t) => !t.assignedTo).length

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
            Open
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">
            In Progress
          </span>
        )
      case 'WAITING_CUSTOMER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 border border-amber-500/30">
            Waiting Customer
          </span>
        )
      case 'WAITING_INTERNAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500 border border-purple-500/30">
            Waiting Internal
          </span>
        )
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30">
            Resolved
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500 border border-slate-500/30">
            Closed
          </span>
        )
    }
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-500 border border-rose-500/30">
            Urgent
          </span>
        )
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-500 border border-orange-500/30">
            High
          </span>
        )
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">
            Medium
          </span>
        )
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500 border border-slate-500/30">
            Low
          </span>
        )
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading tickets...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <Icon name="alert" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Tickets</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Ticket Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage and resolve marketplace support requests</p>
        </div>
        <button
          onClick={() => alert('New ticket creation coming soon!')}
          className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
        >
          <Icon name="add" size={14} />
          <span className="hidden sm:inline">New Ticket</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-background-dark border border-border-dark rounded-xl mb-6 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Icon name="search-01" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full bg-charcoal border border-border-dark rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-white"
              placeholder="Quick find ticket..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all whitespace-nowrap flex-shrink-0">
            <Icon name="record" size={16} className="lg:w-[18px] lg:h-[18px]" />
            <span className="hidden sm:inline">Unassigned ({unassignedTickets})</span>
            <span className="sm:hidden">({unassignedTickets})</span>
          </button>
        </div>
      </div>

      {/* Tickets Table Container */}
      <div className="bg-background-dark border border-border-dark rounded-xl mb-6 overflow-hidden">

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-charcoal border-y border-border-dark">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {paginatedTickets.length > 0 ? (
                paginatedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                      #{ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-charcoal overflow-hidden flex items-center justify-center">
                          {ticket.user?.avatar || ticket.guestName ? (
                            <Icon name="user" size={20} className="text-slate-500" />
                          ) : (
                            <Icon name="user" size={20} className="text-slate-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {ticket.user?.name || ticket.guestName || ticket.guestEmail || 'Anonymous'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300 max-w-[300px] truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {ticket.assignedTo ? (
                        <span className="text-white font-medium">{ticket.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? (
                          <>
                            <button
                              onClick={() => handleResolve(ticket.id)}
                              className="bg-primary text-background-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => alert(`Reply to ticket #${ticket.ticketNumber} - Coming soon!`)}
                              className="border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/10"
                            >
                              Reply
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed"
                              disabled
                            >
                              {ticket.status === 'RESOLVED' ? 'Resolved' : 'Closed'}
                            </button>
                            <button
                              onClick={() => alert(`View ticket #${ticket.ticketNumber} thread - Coming soon!`)}
                              className="border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/10"
                            >
                              View Thread
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Icon name="ticket" size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No tickets found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="px-6 py-4 bg-charcoal border-t border-border-dark flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold">{startIndex + 1}-{Math.min(endIndex, filteredTickets.length)}</span> of{' '}
              <span className="font-bold">{filteredTickets.length}</span> tickets
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-left" size={18} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        currentPage === pageNum
                          ? 'bg-primary text-background-dark'
                          : 'bg-charcoal border border-border-dark text-white hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
