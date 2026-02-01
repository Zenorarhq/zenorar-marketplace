'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

type TicketStatus = 'all' | 'open' | 'in-progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

interface Ticket {
  id: string
  subject: string
  description: string
  category: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  priority: TicketPriority
  createdAt: string
  updatedAt: string
  replies: number
}

const tickets: Ticket[] = [
  {
    id: 'TKT-2847',
    subject: 'Issue with eSIM activation',
    description: 'The QR code is not being recognized by my iPhone 15 Pro. I have tried multiple times but it keeps showing an error.',
    category: 'eSIM & Connectivity',
    status: 'in-progress',
    priority: 'high',
    createdAt: 'Oct 26, 2023',
    updatedAt: '2 hours ago',
    replies: 3,
  },
  {
    id: 'TKT-2831',
    subject: 'Request for invoice',
    description: 'I need a formal invoice for my recent purchase for business expense purposes.',
    category: 'Billing',
    status: 'resolved',
    priority: 'low',
    createdAt: 'Oct 24, 2023',
    updatedAt: '1 day ago',
    replies: 2,
  },
  {
    id: 'TKT-2815',
    subject: 'Script compatibility question',
    description: 'Will the Premium Scripts Bundle work with Node.js 20? I am currently running v20.8.0.',
    category: 'Scripts & Tools',
    status: 'open',
    priority: 'medium',
    createdAt: 'Oct 22, 2023',
    updatedAt: '3 days ago',
    replies: 0,
  },
  {
    id: 'TKT-2798',
    subject: 'Refund request for API subscription',
    description: 'I would like to request a refund for the API Enterprise subscription as it does not meet my requirements.',
    category: 'Billing',
    status: 'closed',
    priority: 'medium',
    createdAt: 'Oct 15, 2023',
    updatedAt: 'Oct 18, 2023',
    replies: 5,
  },
]

export default function TicketsPage() {
  const [activeFilter, setActiveFilter] = useState<TicketStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)

  const filteredTickets = tickets.filter((ticket) => {
    const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
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

  const filterButtons: { key: TicketStatus; label: string }[] = [
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
            <h1 className="text-3xl font-bold text-white mb-2">Support Tickets</h1>
            <p className="text-slate-400">Track and manage your support requests.</p>
          </div>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
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
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg hover:border-primary/30 transition-colors cursor-pointer ${
                ticket.status === 'closed' ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Ticket Info */}
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-slate-500 font-mono text-sm">{ticket.id}</span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{ticket.subject}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Icon name="tag" size={14} />
                        {ticket.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="calendar" size={14} />
                        Created: {ticket.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="clock" size={14} />
                        Updated: {ticket.updatedAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="message" size={14} />
                        {ticket.replies} {ticket.replies === 1 ? 'reply' : 'replies'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors text-sm">
                      <Icon name="eye" size={16} />
                      View
                    </button>
                    {(ticket.status === 'open' || ticket.status === 'in-progress') && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors text-sm">
                        <Icon name="message" size={16} />
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="ticket" size={16} />
            Total Tickets
          </div>
          <p className="text-2xl font-bold text-white">{tickets.length}</p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
            <Icon name="alert" size={16} />
            Open
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {tickets.filter((t) => t.status === 'open').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-yellow-500 text-sm mb-2">
            <Icon name="loading" size={16} />
            In Progress
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {tickets.filter((t) => t.status === 'in-progress').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
            <Icon name="check-circle" size={16} />
            Resolved
          </div>
          <p className="text-2xl font-bold text-green-500">
            {tickets.filter((t) => t.status === 'resolved').length}
          </p>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-dark flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create New Ticket</h2>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Subject</label>
                <input
                  type="text"
                  className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-300 mb-2 block">Category</label>
                <select className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary">
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
                <select className="w-full bg-black border border-border-dark rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary">
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
            <div className="p-6 border-t border-border-dark flex gap-3 justify-end">
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="px-5 py-2.5 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors font-medium"
              >
                Cancel
              </button>
              <button className="px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
