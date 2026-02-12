import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Travel eSIM Plans',
  description: 'Browse affordable eSIM data plans for international travel. Stay connected worldwide with instant activation.',
}

export default function EsimLayout({ children }: { children: React.ReactNode }) {
  return children
}
