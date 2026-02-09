'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface ProfileLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/profile', label: 'Profile Settings', shortLabel: 'Profile', icon: 'user-settings' },
  { href: '/profile/security', label: 'Security', shortLabel: 'Security', icon: 'shield' },
  { href: '/profile/billing', label: 'Billing & Payments', shortLabel: 'Billing', icon: 'credit-card' },
  { href: '/profile/orders', label: 'My Orders', shortLabel: 'Orders', icon: 'shopping-bag' },
  { href: '/profile/library', label: 'My Library', shortLabel: 'Library', icon: 'library' },
  { href: '/profile/referrals', label: 'Referral & Rewards', shortLabel: 'Referrals', icon: 'gift' },
  { href: '/profile/tickets', label: 'Support Tickets', shortLabel: 'Support', icon: 'ticket' },
]

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const pathname = usePathname()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLAnchorElement>(null)

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeTab = activeTabRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()

      // Calculate scroll position to center the active tab
      const scrollLeft = activeTab.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2)
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [pathname])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-4 md:px-8 lg:px-12 w-full pb-24">
        {/* Breadcrumbs - hidden on mobile */}
        <div className="py-4 hidden md:block">
          <Breadcrumbs className="mb-0" />
        </div>

        {/* Mobile/Tablet Horizontal Scrollable Tabs */}
        <div className="lg:hidden -mx-4 md:-mx-8 px-4 md:px-8 py-3 border-b border-border-dark bg-background-dark sticky top-[104px] md:top-[112px] z-40">
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={isActive ? activeTabRef : null}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-primary text-black'
                      : 'bg-surface-dark text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {item.shortLabel}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mt-4 lg:mt-0">
          {/* Sidebar - hidden on mobile/tablet */}
          <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-6">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-4 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-surface-dark text-primary shadow-md shadow-black/20'
                        : 'text-slate-400 hover:text-white hover:bg-surface-dark/50'
                    }`}
                  >
                    <Icon name={item.icon} size={20} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Help Card */}
            <div className="bg-surface-dark rounded-xl p-6 border border-border-dark mt-auto">
              <div className="w-10 h-10 rounded-lg bg-green-900/40 text-primary flex items-center justify-center mb-4">
                <Icon name="headphones" size={20} />
              </div>
              <h3 className="text-white font-semibold mb-2">Need Help?</h3>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                Contact our 24/7 support team for account inquiries.
              </p>
              <Link href="/contact" className="text-primary text-sm font-semibold hover:underline">
                Contact Support
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-grow bg-surface-dark rounded-2xl lg:rounded-[2rem] p-6 md:p-8 lg:p-12 border border-border-dark/30 shadow-2xl shadow-black/40">
            {children}
          </div>
        </div>
      </main>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}
