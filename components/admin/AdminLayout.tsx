'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Icon from '@/components/ui/Icon'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/products', label: 'Products', icon: 'box' },
  { href: '/admin/categories', label: 'Categories', icon: 'grid-view' },
  { href: '/admin/purchases', label: 'Purchases', icon: 'shopping-cart' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/admin/discounts', label: 'Discounts', icon: 'tag' },
  { href: '/admin/finance', label: 'Finance', icon: 'wallet' },
  { href: '/admin/frontend', label: 'Page Builder', icon: 'layers' },
  { href: '/admin/library', label: 'Upload Library', icon: 'upload' },
  { href: '/admin/tickets', label: 'Tickets', icon: 'ticket' },
  { href: '/admin/reports', label: 'Reports', icon: 'chart' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login')
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Icon name="loading" size={40} className="text-primary animate-spin" />
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Icon name="loading" size={40} className="text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex overflow-x-hidden">
      {/* Left Sidebar */}
      {/* Mobile: always w-16, Desktop: w-56 or w-16 based on desktopCollapsed */}
      <aside className={`fixed left-0 top-0 h-full bg-[#111111] border-r border-[#1f1f1f] flex flex-col z-50 transition-all duration-300 w-16 overflow-visible ${
        desktopCollapsed ? 'lg:w-16' : 'lg:w-56'
      }`}>
        {/* Logo */}
        <div className={`h-16 flex items-center justify-center border-b border-[#1f1f1f] ${
          desktopCollapsed ? '' : 'lg:justify-start lg:px-4'
        }`}>
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="grid-view" size={18} className="text-black" />
            </div>
            {/* Site name - hidden on mobile, shown on desktop when not collapsed */}
            {!desktopCollapsed && (
              <span className="text-white font-bold text-sm hidden lg:block">Zenorar</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-visible">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all justify-center ${
                    desktopCollapsed ? '' : 'lg:justify-start'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} size={20} className="flex-shrink-0" />
                  {/* Label - hidden on mobile, shown on desktop when not collapsed */}
                  {!desktopCollapsed && (
                    <span className="text-sm font-medium hidden lg:block">{item.label}</span>
                  )}
                </Link>
                {/* Tooltip - shows on mobile always, on desktop only when collapsed */}
                <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${
                  desktopCollapsed ? '' : 'lg:hidden'
                }`}>
                  {item.label}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-[#1f1f1f]">
          <div className="relative group">
            <div className={`flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] justify-center ${
              desktopCollapsed ? '' : 'lg:justify-start'
            }`}>
              <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <Icon name="user" size={18} className="text-primary" />
              </div>
              {/* User info - hidden on mobile, shown on desktop when not collapsed */}
              {!desktopCollapsed && (
                <div className="flex-1 min-w-0 hidden lg:block">
                  <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-primary text-xs capitalize">{user?.role?.toLowerCase() || 'User'}</p>
                </div>
              )}
            </div>
            {/* Tooltip for user - shows on mobile always, on desktop only when collapsed */}
            <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${
              desktopCollapsed ? '' : 'lg:hidden'
            }`}>
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-primary text-xs capitalize">{user?.role?.toLowerCase() || 'User'}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full mt-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors justify-center ${
              desktopCollapsed ? '' : 'lg:justify-start'
            }`}
          >
            <Icon name="logout" size={18} className="flex-shrink-0" />
            {!desktopCollapsed && (
              <span className="text-sm font-medium hidden lg:block">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ml-16 overflow-x-hidden ${
        desktopCollapsed ? '' : 'lg:ml-56'
      }`}>
        {/* Top Header */}
        <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          {/* Left: Toggle (desktop only) + Search */}
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger - only visible on large screens */}
            <button
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors hidden lg:flex"
            >
              <Icon name="menu" size={20} />
            </button>

            {/* Search bar - always visible */}
            <div className="relative flex-1 max-w-md">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Right: Notifications & Messages */}
          <div className="flex items-center gap-2 ml-4">
            <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Icon name="bell" size={20} />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Icon name="mail" size={20} />
              {/* Message badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
