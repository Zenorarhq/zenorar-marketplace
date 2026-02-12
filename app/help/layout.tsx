import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Find answers to frequently asked questions about Zenorar Marketplace. Guides, troubleshooting, and support resources.',
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
