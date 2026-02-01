'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

interface ProfileLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/profile', label: 'Profile Settings', icon: 'user-settings' },
  { href: '/profile/security', label: 'Security', icon: 'shield' },
  { href: '/profile/billing', label: 'Billing & Payments', icon: 'credit-card' },
  { href: '/profile/orders', label: 'My Orders', icon: 'shopping-bag' },
  { href: '/profile/library', label: 'My Library', icon: 'library' },
  { href: '/profile/referrals', label: 'Referral & Rewards', icon: 'gift' },
  { href: '/profile/tickets', label: 'Support Tickets', icon: 'ticket' },
]

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 w-full pb-24">
        <div className="py-4">
          <Breadcrumbs className="mb-0" />
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6">
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
            <div className="bg-surface-dark rounded-xl p-6 border border-border-dark mt-auto hidden lg:block">
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
          <div className="flex-grow bg-surface-dark rounded-[2rem] p-8 lg:p-12 border border-border-dark/30 shadow-2xl shadow-black/40">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
