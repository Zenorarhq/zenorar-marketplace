'use client'

import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

const stats = [
  { label: 'Total Revenue', value: '$124,500', change: '+12.5%', changeType: 'positive', icon: 'wallet' },
  { label: 'Active Users', value: '8,420', change: '+8.2%', changeType: 'positive', icon: 'user-group' },
  { label: 'Open Tickets', value: '45', change: '+5', changeType: 'negative', icon: 'ticket-01' },
  { label: 'Products Sold', value: '1,248', change: '+15.3%', changeType: 'positive', icon: 'shopping-bag-01' },
]

const recentTickets = [
  { id: '#TK-1024', customer: 'Sarah Jenkins', subject: 'Payment Failed', priority: 'urgent', time: '2h ago' },
  { id: '#TK-1025', customer: 'Mike Ross', subject: 'API Documentation', priority: 'high', time: '5h ago' },
  { id: '#TK-1026', customer: 'David Tennant', subject: 'Account locked', priority: 'medium', time: '1d ago' },
]

const recentOrders = [
  { id: '#ORD-7721', customer: 'Alex Morgan', product: 'Premium Scripts Bundle', amount: '$149.00', status: 'completed' },
  { id: '#ORD-8812', customer: 'John Smith', product: 'Global eSIM Plan', amount: '$29.99', status: 'processing' },
  { id: '#ORD-9901', customer: 'Emma Wilson', product: 'API Access', amount: '$59.00', status: 'completed' },
]

export default function AdminDashboard() {
  return (
    <AdminLayout>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-dark border border-border-dark rounded-xl p-6 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Icon name={stat.icon} size={24} />
              </div>
              <span
                className={`text-xs font-bold ${
                  stat.changeType === 'positive' ? 'text-primary' : 'text-rose-500'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
            <p className="text-white text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Icon name="ticket-01" size={20} className="text-primary" />
              Recent Tickets
            </h2>
            <Link href="/admin/tickets" className="text-primary text-sm font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-border-dark">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary font-mono font-semibold text-sm">{ticket.id}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      ticket.priority === 'urgent'
                        ? 'bg-rose-500/20 text-rose-500'
                        : ticket.priority === 'high'
                        ? 'bg-orange-500/20 text-orange-500'
                        : 'bg-blue-500/20 text-blue-500'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-white text-sm font-medium mb-1">{ticket.subject}</p>
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>{ticket.customer}</span>
                  <span>{ticket.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Icon name="shopping-bag-01" size={20} className="text-primary" />
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-primary text-sm font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-border-dark">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-mono font-semibold text-sm">{order.id}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      order.status === 'completed'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-white text-sm font-medium mb-1">{order.product}</p>
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>{order.customer}</span>
                  <span className="text-white font-medium">{order.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-white font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/tickets"
            className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="add-01" size={24} />
            </div>
            <span className="text-white text-sm font-medium">New Ticket</span>
          </Link>
          <Link
            href="/admin/users"
            className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="user-add-01" size={24} />
            </div>
            <span className="text-white text-sm font-medium">Add User</span>
          </Link>
          <Link
            href="/admin/analytics"
            className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="chart" size={24} />
            </div>
            <span className="text-white text-sm font-medium">View Reports</span>
          </Link>
          <Link
            href="/admin/settings"
            className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/50 transition-colors flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="settings-01" size={24} />
            </div>
            <span className="text-white text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}
