'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Map of path segments to readable labels
const pathLabels: Record<string, string> = {
  products: 'Products',
  scripts: 'Scripts',
  esims: 'eSIMs',
  'virtual-numbers': 'Virtual Numbers',
  'gift-cards': 'Gift Cards',
  tools: 'Tools',
  bundles: 'Bundles',
  api: 'API Access',
  help: 'Help',
  'getting-started': 'Getting Started',
  'account-security': 'Account & Security',
  'scripts-tools': 'Scripts & Tools',
  'esim-connectivity': 'eSIM & Connectivity',
  payments: 'Payments',
  selling: 'Selling',
  contact: 'Contact',
  cart: 'Cart',
  checkout: 'Checkout',
  profile: 'Profile',
  security: 'Security',
  billing: 'Billing & Payments',
  orders: 'My Orders',
  library: 'My Library',
  referrals: 'Referral & Rewards',
  tickets: 'Support Tickets',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
  login: 'Login',
  signup: 'Sign Up',
  'forgot-password': 'Forgot Password',
  admin: 'Admin',
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbs: BreadcrumbItem[] = items || generateBreadcrumbs(pathname)

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className={`flex items-center gap-2 mb-6 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <Icon
                  name="arrow-right-double"
                  size={14}
                  className="text-slate-500"
                />
              )}
              {isLast || !item.href ? (
                <span className="text-white font-medium">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-slate-400 hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)

  // Always start with Home
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ]

  // Skip route groups like (shop), (auth)
  const filteredSegments = segments.filter(segment => !segment.startsWith('('))

  let currentPath = ''
  for (const segment of filteredSegments) {
    currentPath += `/${segment}`

    // Check if it's a dynamic segment (like a product slug)
    const isDynamic = !pathLabels[segment] && !segment.startsWith('[')

    breadcrumbs.push({
      label: pathLabels[segment] || formatSegment(segment),
      href: currentPath,
    })
  }

  return breadcrumbs
}

function formatSegment(segment: string): string {
  // Convert slug to title case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
