import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Zenorar Marketplace support. We are here to help with any questions or issues.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
