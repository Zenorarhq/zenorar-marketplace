'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'view_analytics' },
  { href: '/admin/products', label: 'Products', icon: 'box', permission: 'view_products' },
  { href: '/admin/categories', label: 'Categories', icon: 'grid-view', permission: 'manage_categories' },
  { href: '/admin/gift-cards', label: 'Gift Cards', icon: 'gift', permission: 'view_products' },
  { href: '/admin/purchases', label: 'Purchases', icon: 'shopping-cart', permission: 'view_orders' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics', permission: 'view_analytics' },
  { href: '/admin/discounts', label: 'Discounts', icon: 'tag', permission: 'view_products' },
  { href: '/admin/finance', label: 'Finance', icon: 'wallet', permission: 'view_order_analytics' },
  { href: '/admin/wallets', label: 'Wallets', icon: 'credit-card', permission: 'manage_wallets' },
  { href: '/admin/frontend', label: 'Page Builder', icon: 'layers', permission: 'manage_content' },
  { href: '/admin/library', label: 'Upload Library', icon: 'upload', permission: 'manage_content' },
  { href: '/admin/chat', label: 'Live Chat', icon: 'chat', permission: 'view_chat' },
  { href: '/admin/tickets', label: 'Tickets', icon: 'ticket', permission: 'view_tickets' },
  { href: '/admin/licenses', label: 'Licenses', icon: 'key', permission: 'manage_licenses' },
  { href: '/admin/user-management', label: 'User Management', icon: 'people', permissions: ['view_users', 'view_staff', 'manage_roles'] },
  { href: '/admin/referrals', label: 'Referrals', icon: 'user-group', permission: 'view_analytics' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'manage_settings' },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, isStaff, hasPermission, logout } = useAuth()
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true'
    }
    return false
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['admin-notif-count'],
    queryFn: async () => {
      const res = await apiFetch<{ count: number }>('/notifications/unread')
      return res.success ? res.data : null
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  })

  // Fetch recent notifications for dropdown
  const { data: notifList } = useQuery({
    queryKey: ['admin-notif-list'],
    queryFn: async () => {
      const res = await apiFetch<any>('/notifications?limit=5')
      return res.success ? res.data : null
    },
    enabled: isAuthenticated && showNotifications,
  })

  // Fetch unread chat count
  const { data: chatData } = useQuery({
    queryKey: ['admin-chat-count'],
    queryFn: async () => {
      const res = await apiFetch<{ count: number }>('/chat/unread')
      return res.success ? res.data : null
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  })

  // Fetch pending counts for nav badges (deposits, orders, tickets)
  const { data: pendingCounts } = useQuery({
    queryKey: ['admin-pending-counts'],
    queryFn: async () => {
      const [depositsRes, ordersRes] = await Promise.all([
        apiFetch<{ count: number }>('/deposits/pending-count'),
        apiFetch<{ count: number }>('/orders/pending-count'),
      ])
      return {
        deposits: depositsRes.data?.count || 0,
        orders: ordersRes.data?.count || 0,
      }
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  })

  // Fetch branding settings for logo
  const { data: brandingData } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const siteLogo = brandingData?.logoUrl || null
  const favicon = brandingData?.faviconUrl || null

  const queryClient = useQueryClient()
  const unreadNotifs = notifData?.count || 0
  const unreadChats = chatData?.count || 0

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'POST' })
    queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
  }

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item: any) => {
    // If no permission required, show to all staff
    if (!item.permission && !item.permissions) return isStaff
    // Check single permission
    if (item.permission) return hasPermission(item.permission)
    // Check multiple permissions (show if user has ANY of them)
    if (item.permissions) return item.permissions.some((p: string) => hasPermission(p))
    return false
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login')
    } else if (!isLoading && isAuthenticated && !isStaff) {
      // Customer tried to access admin area - just redirect, don't logout
      router.push('/admin/login')
    }
  }, [isLoading, isAuthenticated, isStaff, router])

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

  // Don't render anything if not authenticated or not staff (will redirect)
  if (!isAuthenticated || !isStaff) {
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
      <aside className={`fixed left-0 top-0 h-full bg-[#111111] border-r border-[#1f1f1f] flex flex-col z-50 transition-[width] duration-300 w-16 overflow-hidden ${
        desktopCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        {/* Logo */}
        <div className={`h-16 flex items-center justify-center border-b border-[#1f1f1f] overflow-hidden ${
          desktopCollapsed ? 'px-2' : 'lg:justify-start lg:px-4 px-2'
        }`}>
          <Link href="/admin" className="flex items-center gap-3">
            {/* Mobile: Show favicon, Desktop: Show site logo */}
            {desktopCollapsed ? (
              // Collapsed sidebar (mobile or collapsed desktop) - show favicon
              favicon ? (
                <img src={favicon} alt="Site" className="w-8 h-8 object-contain flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="grid-view" size={18} className="text-black" />
                </div>
              )
            ) : (
              // Expanded desktop sidebar - show full site logo
              <>
                {/* Mobile: favicon */}
                <div className="lg:hidden">
                  {favicon ? (
                    <img src={favicon} alt="Site" className="w-8 h-8 object-contain flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="grid-view" size={18} className="text-black" />
                    </div>
                  )}
                </div>
                {/* Desktop: site logo */}
                <div className="hidden lg:block">
                  {siteLogo ? (
                    <img src={siteLogo} alt="Site Logo" className="h-8 w-auto object-contain" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon name="grid-view" size={18} className="text-black" />
                      </div>
                      <span className={`text-white font-bold text-sm whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden ${
                        desktopCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                      }`}>Zenorar</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all justify-center overflow-hidden ${
                    desktopCollapsed ? '' : 'lg:justify-start lg:gap-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Icon name={item.icon} size={20} />
                    {/* Red dot ON ICON - shows when collapsed or mobile */}
                    {((item.href === '/admin/wallets' && pendingCounts?.deposits && pendingCounts.deposits > 0) ||
                      (item.href === '/admin/purchases' && pendingCounts?.orders && pendingCounts.orders > 0) ||
                      (item.href === '/admin/chat' && unreadChats > 0)) && (
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#111111] ${
                        desktopCollapsed ? '' : 'lg:hidden'
                      }`} />
                    )}
                  </div>
                  {/* Label with inline red dot - hidden on mobile, shown on expanded desktop */}
                  <span className={`text-sm font-medium hidden lg:flex items-center gap-2 whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden ${
                    desktopCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                  }`}>
                    {item.label}
                    {/* Red dot AFTER TEXT - only on expanded desktop */}
                    {((item.href === '/admin/wallets' && pendingCounts?.deposits && pendingCounts.deposits > 0) ||
                      (item.href === '/admin/purchases' && pendingCounts?.orders && pendingCounts.orders > 0) ||
                      (item.href === '/admin/chat' && unreadChats > 0)) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                    )}
                  </span>
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
            <div className={`flex items-center p-2 rounded-lg bg-[#1a1a1a] justify-center ${
              desktopCollapsed ? '' : 'lg:justify-start lg:gap-3'
            }`}>
              <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <Icon name="user" size={18} className="text-primary" />
              </div>
              {/* User info - hidden on mobile, shown on desktop */}
              <div className={`min-w-0 hidden lg:block whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden ${
                desktopCollapsed ? 'opacity-0 w-0' : 'opacity-100 flex-1'
              }`}>
                <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-primary text-xs capitalize">{user?.role?.toLowerCase() || 'User'}</p>
              </div>
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
            className={`flex items-center w-full mt-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors justify-center overflow-hidden ${
              desktopCollapsed ? '' : 'lg:justify-start lg:gap-3'
            }`}
          >
            <Icon name="logout" size={18} className="flex-shrink-0" />
            <span className={`text-sm font-medium hidden lg:block whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden ${
              desktopCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-[margin] duration-300 ml-16 overflow-x-hidden ${
        desktopCollapsed ? '' : 'lg:ml-64'
      }`}>
        {/* Top Header */}
        <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          {/* Left: Toggle */}
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => {
                const next = !desktopCollapsed
                setDesktopCollapsed(next)
                localStorage.setItem('admin_sidebar_collapsed', String(next))
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors hidden lg:flex"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>

          {/* Right: Notifications & Messages */}
          <div className="flex items-center gap-2 ml-4">
            {/* Bell - Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon name="bell" size={20} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                    <h4 className="text-white font-semibold text-sm">Notifications</h4>
                    {unreadNotifs > 0 && (
                      <button onClick={markAllRead} className="text-primary text-xs hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifList?.notifications?.length > 0 ? (
                      notifList.notifications.map((n: any) => (
                        <div key={n.id} className={`p-3 border-b border-[#1f1f1f] hover:bg-white/5 ${!n.isRead ? 'bg-primary/5' : ''}`}>
                          <p className="text-white text-sm">{n.title}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{n.message}</p>
                          <p className="text-slate-500 text-[10px] mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mail - Chat Messages */}
            <Link
              href="/admin/chat"
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon name="mail" size={20} />
              {unreadChats > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadChats > 99 ? '99+' : unreadChats}
                </span>
              )}
            </Link>
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
