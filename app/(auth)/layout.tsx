import { Metadata } from 'next'
import MaintenanceGate from '@/components/layout/MaintenanceGate'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth pages have their own layout, render children directly without main header/footer
  return (
    <MaintenanceGate>
      {children}
    </MaintenanceGate>
  )
}
