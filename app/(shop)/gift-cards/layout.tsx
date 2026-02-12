import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gift Cards',
  description: 'Purchase digital gift cards for popular platforms and services. Instant delivery with secure checkout.',
}

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return children
}
