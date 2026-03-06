'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'
import { formatTimeAgo } from '@/lib/date-utils'
import type { NotificationType } from '@/lib/api/notifications'
import { useChatSocket } from '@/hooks/use-chat-socket'
const notifIcons: Record<string, string> = {
  ORDER_PLACED: 'cart', ORDER_CONFIRMED: 'verified', ORDER_SHIPPED: 'delivery',
  ORDER_DELIVERED: 'package', ORDER_CANCELLED: 'cancel', PAYMENT_RECEIVED: 'credit-card',
  PAYMENT_FAILED: 'alert', REFUND_PROCESSED: 'refresh', REVIEW_APPROVED: 'star',
  REVIEW_REJECTED: 'cancel', PRICE_DROP: 'discount', BACK_IN_STOCK: 'bell',
  PROMOTIONAL: 'gift', SYSTEM: 'info', DEPOSIT_SUCCESS: 'wallet', DEPOSIT_FAILED: 'alert',
  WALLET_CREDIT_ADDED: 'wallet', TICKET_CREATED: 'ticket',
}
const notifColors: Record<string, string> = {
  ORDER_PLACED: 'bg-blue-500/20 text-blue-400', ORDER_CONFIRMED: 'bg-green-500/20 text-green-400',
  ORDER_SHIPPED: 'bg-purple-500/20 text-purple-400', ORDER_DELIVERED: 'bg-green-500/20 text-green-400',
  ORDER_CANCELLED: 'bg-red-500/20 text-red-400', PAYMENT_RECEIVED: 'bg-green-500/20 text-green-400',
  PAYMENT_FAILED: 'bg-red-500/20 text-red-400', REFUND_PROCESSED: 'bg-yellow-500/20 text-yellow-400',
  REVIEW_APPROVED: 'bg-yellow-500/20 text-yellow-400', REVIEW_REJECTED: 'bg-red-500/20 text-red-400',
  PRICE_DROP: 'bg-green-500/20 text-green-400', BACK_IN_STOCK: 'bg-blue-500/20 text-blue-400',
  PROMOTIONAL: 'bg-purple-500/20 text-purple-400', SYSTEM: 'bg-slate-500/20 text-slate-400',
  DEPOSIT_SUCCESS: 'bg-green-500/20 text-green-400', DEPOSIT_FAILED: 'bg-red-500/20 text-red-400',
  WALLET_CREDIT_ADDED: 'bg-green-500/20 text-green-400', TICKET_CREATED: 'bg-blue-500/20 text-blue-400',
}
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
  const [showChatDropdown, setShowChatDropdown] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const [navTooltip, setNavTooltip] = useState<{ label: string; top: number } | null>(null)
  // Track "last seen" counts for nav dot badges — stored in localStorage
  const [lastSeenCounts, setLastSeenCounts] = useState<{ orders: number; deposits: number; chats: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('admin_last_seen_counts')
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return { orders: 0, deposits: 0, chats: 0 }
  })
  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['admin-notif-count'],
    queryFn: async () => {
      const res = await apiFetch<{ count: number }>('/notifications/unread')
      return res.success ? res.data : null
    },
    refetchInterval: 5000,
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
    refetchInterval: 5000,
    enabled: isAuthenticated,
  })
  // Fetch recent chat conversations for dropdown
  const { data: chatList } = useQuery({
    queryKey: ['admin-chat-list'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/chat?limit=5&excludeStatus=CLOSED')
      return res.success ? res.data : null
    },
    enabled: isAuthenticated && showChatDropdown,
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
    refetchInterval: 5000,
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
  // Real-time notifications via WebSocket
  const { joinAdmin, onAdminNotification, onNewMessage, onOrderPaid, onDepositUpdate, onReconnect } = useChatSocket()
  useEffect(() => {
    if (!isAuthenticated) return
    joinAdmin()
    const unsub1 = onAdminNotification(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
      queryClient.invalidateQueries({ queryKey: ['admin-pending-counts'] })
    })
    const unsub2 = onNewMessage((msg) => {
      if (msg.senderType === 'USER') {
        queryClient.setQueryData(['admin-chat-count'], (old: any) =>
          old ? { count: (old.count || 0) + 1 } : { count: 1 }
        )
      }
      queryClient.invalidateQueries({ queryKey: ['admin-chat-list'] })
    })
    const unsub3 = onOrderPaid(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-counts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    })
    const unsub4 = onDepositUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-counts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    })
    const unsub5 = onReconnect(() => {
      joinAdmin()
    })
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5() }
  }, [isAuthenticated])
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setShowChatDropdown(false)
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
  // Auto-clear dot when admin is viewing the page, and reset when counts drop
  useEffect(() => {
    const updated = { ...lastSeenCounts }
    let changed = false
    const curOrders = pendingCounts?.orders || 0
    const curDeposits = pendingCounts?.deposits || 0
    // When on the page, save current count so dot clears
    if (pathname === '/admin/purchases' && curOrders > 0) {
      updated.orders = curOrders; changed = true
    }
    if (pathname === '/admin/wallets' && curDeposits > 0) {
      updated.deposits = curDeposits; changed = true
    }
    if (pathname === '/admin/chat' && unreadChats > 0) {
      updated.chats = unreadChats; changed = true
    }
    // Reset when counts drop below last-seen (items were processed/read)
    // so the next increase will trigger the dot again
    if (curOrders < lastSeenCounts.orders) {
      updated.orders = curOrders; changed = true
    }
    if (curDeposits < lastSeenCounts.deposits) {
      updated.deposits = curDeposits; changed = true
    }
    if (unreadChats < lastSeenCounts.chats) {
      updated.chats = unreadChats; changed = true
    }
    if (changed) {
      setLastSeenCounts(updated)
      localStorage.setItem('admin_last_seen_counts', JSON.stringify(updated))
    }
  }, [pathname, pendingCounts?.orders, pendingCounts?.deposits, unreadChats])
  // Determine which nav items should show a notification dot
  const orderCount = pendingCounts?.orders || 0
  const depositCount = pendingCounts?.deposits || 0
  const chatCount = unreadChats || 0
  const showOrdersDot = orderCount > lastSeenCounts.orders
  const showDepositsDot = depositCount > lastSeenCounts.deposits
  const showChatDot = chatCount > lastSeenCounts.chats
  // Clear dot when clicking a nav item — save current count to localStorage
  const handleNavClick = (href: string) => {
    let updated = { ...lastSeenCounts }
    if (href === '/admin/purchases') updated.orders = orderCount
    else if (href === '/admin/wallets') updated.deposits = depositCount
    else if (href === '/admin/chat') updated.chats = chatCount
    else return
    setLastSeenCounts(updated)
    localStorage.setItem('admin_last_seen_counts', JSON.stringify(updated))
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
      {/* Slow pulse animation for notification dots */}
      <style jsx global>{`
        @keyframes navPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
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
                  onClick={() => handleNavClick(item.href)}
                  onMouseEnter={(e) => {
                    if (desktopCollapsed || window.innerWidth < 1024) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setNavTooltip({ label: item.label, top: rect.top + rect.height / 2 })
                    }
                  }}
                  onMouseLeave={() => setNavTooltip(null)}
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
                    {/* Pulsing red dot ON ICON - shows when collapsed or mobile */}
                    {((item.href === '/admin/wallets' && showDepositsDot) ||
                      (item.href === '/admin/purchases' && showOrdersDot) ||
                      (item.href === '/admin/chat' && showChatDot)) && (
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#111111] animate-[navPulse_2s_ease-in-out_infinite] ${
                        desktopCollapsed ? '' : 'lg:hidden'
                      }`} />
                    )}
                  </div>
                  {/* Label with inline pulsing red dot - hidden on mobile, shown on expanded desktop */}
                  <span className={`text-sm font-medium hidden lg:flex items-center gap-2 whitespace-nowrap transition-[opacity,width] duration-200 overflow-hidden ${
                    desktopCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                  }`}>
                    {item.label}
                    {/* Pulsing red dot AFTER TEXT - only on expanded desktop */}
                    {((item.href === '/admin/wallets' && showDepositsDot) ||
                      (item.href === '/admin/purchases' && showOrdersDot) ||
                      (item.href === '/admin/chat' && showChatDot)) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-[navPulse_2s_ease-in-out_infinite]" />
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
      {/* Sidebar tooltip (fixed to escape overflow-hidden) */}
      {navTooltip && (
        <div
          className="fixed z-[60] ml-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm font-medium whitespace-nowrap pointer-events-none"
          style={{ left: 68, top: navTooltip.top, transform: 'translateY(-50%)' }}
        >
          {navTooltip.label}
        </div>
      )}
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
                onClick={() => { setShowNotifications(!showNotifications); setShowChatDropdown(false) }}
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
                <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Icon name="bell" size={16} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">Notifications</h4>
                        {unreadNotifs > 0 && <p className="text-xs text-slate-500">{unreadNotifs} unread</p>}
                      </div>
                    </div>
                    {unreadNotifs > 0 && (
                      <button onClick={markAllRead} className="text-primary text-xs font-medium hover:text-green-400 transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifList?.length > 0 ? (
                      notifList.map((n: any) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 p-3.5 hover:bg-white/5 transition-colors cursor-pointer ${
                            !n.isRead ? 'bg-white/[0.02] border-l-2 border-primary' : 'border-l-2 border-transparent'
                          }`}
                          onClick={() => {
                            if (!n.isRead) {
                              apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
                                queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
                              })
                            }
                            setShowNotifications(false)
                            if (n.link) router.push(n.link)
                          }}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notifColors[n.type] || 'bg-slate-500/20 text-slate-400'}`}>
                            <Icon name={notifIcons[n.type] || 'bell'} size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium truncate ${n.isRead ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                              <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">{formatTimeAgo(n.createdAt)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 px-4">
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                          <Icon name="bell" size={20} className="text-slate-600" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
                        <p className="text-slate-600 text-xs mt-1">Activity will show up here</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 p-2.5">
                    <Link
                      href="/admin/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full text-center text-sm text-primary hover:text-green-400 font-medium py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {/* Mail - Chat Messages Dropdown */}
            <div className="relative" ref={chatRef}>
              <button
                onClick={() => { setShowChatDropdown(!showChatDropdown); setShowNotifications(false) }}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon name="mail" size={20} />
                {unreadChats > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadChats > 99 ? '99+' : unreadChats}
                  </span>
                )}
              </button>
              {showChatDropdown && (
                <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Icon name="chat" size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">Messages</h4>
                        {unreadChats > 0 && <p className="text-xs text-slate-500">{unreadChats} unread</p>}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {chatList && chatList.length > 0 ? (
                      chatList.map((conv: any) => (
                        <Link
                          key={conv.id}
                          href={`/admin/chat?id=${conv.id}`}
                          onClick={() => setShowChatDropdown(false)}
                          className={`flex items-start gap-3 p-3.5 hover:bg-white/5 transition-colors ${
                            conv.unreadCount > 0 ? 'bg-white/[0.02] border-l-2 border-blue-400' : 'border-l-2 border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                            <Icon name="user" size={16} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                                {conv.user?.name || conv.guestName || conv.guestEmail || 'Guest'}
                              </p>
                              <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                                {conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : formatTimeAgo(conv.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{conv.lastMessage || 'No messages yet'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                conv.status === 'OPEN' ? 'bg-green-500/10 text-green-400' :
                                conv.status === 'ASSIGNED' ? 'bg-blue-500/10 text-blue-400' :
                                conv.status === 'WAITING' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>{conv.status}</span>
                              {conv.unreadCount > 0 && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">
                                  {conv.unreadCount} new
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-10 px-4">
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                          <Icon name="chat" size={20} className="text-slate-600" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No active conversations</p>
                        <p className="text-slate-600 text-xs mt-1">Chat messages will appear here</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 p-2.5">
                    <Link
                      href="/admin/chat"
                      onClick={() => setShowChatDropdown(false)}
                      className="block w-full text-center text-sm text-blue-400 hover:text-blue-300 font-medium py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      View All Conversations
                    </Link>
                  </div>
                </div>
              )}
            </div>
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
