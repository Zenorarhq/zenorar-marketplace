'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

type TicketStatus = 'open' | 'pending' | 'resolved'
type TicketPriority = 'urgent' | 'high' | 'medium' | 'low'

interface Ticket {
  id: string
  customer: {
    name: string
    avatar?: string
  }
  subject: string
  status: TicketStatus
  priority: TicketPriority
  assignedTo: string | null
  createdAt: string
}

const ticketsData: Ticket[] = [
  {
    id: '#TK-1024',
    customer: { name: 'Sarah Jenkins' },
    subject: 'Payment Failed - Stripe Error 402',
    status: 'open',
    priority: 'urgent',
    assignedTo: null,
    createdAt: '2 hours ago',
  },
  {
    id: '#TK-1025',
    customer: { name: 'Mike Ross' },
    subject: 'API Documentation missing for Webhooks',
    status: 'pending',
    priority: 'high',
    assignedTo: 'Alex Chen',
    createdAt: '5 hours ago',
  },
  {
    id: '#TK-1026',
    customer: { name: 'David Tennant' },
    subject: 'Account locked after multiple attempts',
    status: 'open',
    priority: 'medium',
    assignedTo: null,
    createdAt: '1 day ago',
  },
  {
    id: '#TK-1027',
    customer: { name: 'Julia Roberts' },
    subject: 'Refund request for Order #5543',
    status: 'resolved',
    priority: 'low',
    assignedTo: 'Maria Garcia',
    createdAt: '2 days ago',
  },
  {
    id: '#TK-1028',
    customer: { name: 'Tom Wilson' },
    subject: 'Cannot download purchased scripts',
    status: 'open',
    priority: 'high',
    assignedTo: null,
    createdAt: '3 hours ago',
  },
  {
    id: '#TK-1029',
    customer: { name: 'Emma Stone' },
    subject: 'License key not working',
    status: 'pending',
    priority: 'medium',
    assignedTo: 'Alex Chen',
    createdAt: '6 hours ago',
  },
]

export default function TicketsPage() {
  const [tickets] = useState<Ticket[]>(ticketsData)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openTickets = tickets.filter((t) => t.status === 'open').length
  const urgentTickets = tickets.filter((t) => t.priority === 'urgent').length
  const unassignedTickets = tickets.filter((t) => !t.assignedTo).length

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
            Open
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500 border border-amber-500/30">
            Pending
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500 border border-slate-500/30">
            Resolved
          </span>
        )
    }
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-500 border border-rose-500/30">
            Urgent
          </span>
        )
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-500 border border-orange-500/30">
            High
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">
            Medium
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-500 border border-slate-500/30">
            Low
          </span>
        )
    }
  }

  return (
    <AdminLayout>
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <a className="text-slate-500 text-sm font-medium hover:text-primary transition-colors" href="/admin">
          Home
        </a>
        <Icon name="chevron-right" size={14} className="text-slate-500" />
        <span className="text-white text-sm font-semibold">Tickets</span>
      </div>

      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Ticket Management</h1>
          <p className="text-slate-400 mt-1">Manage and resolve marketplace support requests.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 px-4 py-2 bg-background-dark border border-border-dark rounded-lg min-w-[120px]">
            <p className="text-slate-400 text-xs font-medium">Total Open</p>
            <div className="flex items-center gap-2">
              <span className="text-white text-xl font-bold">{openTickets}</span>
              <span className="text-primary text-xs font-bold">+5%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-4 py-2 bg-background-dark border border-border-dark rounded-lg min-w-[120px]">
            <p className="text-slate-400 text-xs font-medium">Urgent</p>
            <div className="flex items-center gap-2">
              <span className="text-rose-500 text-xl font-bold">{urgentTickets}</span>
              <span className="text-rose-500 text-xs font-bold">+2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-background-dark border border-border-dark rounded-xl mb-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between gap-4 p-4 items-center">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-charcoal text-white rounded-lg hover:bg-slate-700 transition-colors">
              <Icon name="filter" size={18} />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-charcoal text-white rounded-lg hover:bg-slate-700 transition-colors">
              <Icon name="share-08" size={18} />
              Export
            </button>
            <div className="h-6 w-[1px] bg-border-dark mx-2 hidden sm:block"></div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all">
              <Icon name="record" size={18} />
              Unassigned Tickets ({unassignedTickets})
            </button>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:min-w-[300px]">
              <Icon name="search-01" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-charcoal border border-border-dark rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-white"
                placeholder="Quick find ticket..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-primary text-background-dark font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all whitespace-nowrap">
              <Icon name="add-01" size={20} />
              New Ticket
            </button>
          </div>
        </div>

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
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                    {ticket.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-charcoal overflow-hidden flex items-center justify-center">
                        <Icon name="user" size={20} className="text-slate-500" />
                      </div>
                      <span className="text-sm font-medium text-white">{ticket.customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 max-w-[300px] truncate">
                    {ticket.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {ticket.assignedTo ? (
                      <span className="text-white font-medium">{ticket.assignedTo}</span>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      {ticket.status !== 'resolved' ? (
                        <>
                          <button className="bg-primary text-background-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110">
                            Resolve
                          </button>
                          <button className="border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/10">
                            Reply
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-not-allowed"
                            disabled
                          >
                            Resolved
                          </button>
                          <button className="border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/10">
                            View Thread
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-charcoal border-t border-border-dark flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold">1-{filteredTickets.length}</span> of{' '}
            <span className="font-bold">{tickets.length}</span> tickets
          </p>
          <div className="flex gap-2">
            <button
              className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 disabled:opacity-50"
              disabled
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <button className="px-3 py-1 rounded bg-primary text-background-dark font-bold text-xs">
              1
            </button>
            <button className="px-3 py-1 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 text-xs">
              2
            </button>
            <button className="px-3 py-1 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 text-xs">
              3
            </button>
            <button className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
