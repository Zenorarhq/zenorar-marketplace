'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/ui/Icon'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/tickets', label: 'Tickets', icon: 'ticket-01' },
  { href: '/admin/users', label: 'Users', icon: 'user-group' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings-01' },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      {/* Admin Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-6 lg:px-10 py-3 bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-background-dark">
              <Icon name="ticket-01" size={20} />
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
              Tech Marketplace
            </h2>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary border-b-2 border-primary py-1'
                      : 'text-slate-400 hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex flex-1 justify-end gap-4 items-center">
          {/* Search */}
          <label className="hidden sm:flex flex-col min-w-40 h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden">
              <div className="text-slate-500 flex bg-charcoal items-center justify-center pl-4">
                <Icon name="search-01" size={20} />
              </div>
              <input
                className="flex w-full border-none bg-charcoal text-white placeholder:text-slate-500 px-4 pl-2 text-sm focus:ring-0"
                placeholder="Search ticket ID..."
                type="text"
              />
            </div>
          </label>

          {/* Icons */}
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-charcoal text-white hover:bg-primary/20 transition-all">
              <Icon name="notification-03" size={20} />
            </button>
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-charcoal text-white hover:bg-primary/20 transition-all">
              <Icon name="settings-01" size={20} />
            </button>
          </div>

          {/* Admin Avatar */}
          <div className="w-10 h-10 rounded-full bg-charcoal border-2 border-primary/20 flex items-center justify-center">
            <Icon name="user" size={20} className="text-slate-400" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 lg:px-10 py-6">{children}</main>
    </div>
  )
}
