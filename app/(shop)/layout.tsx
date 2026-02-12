import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import MaintenanceGate from '@/components/layout/MaintenanceGate'

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MaintenanceGate>
      <Header />
      <CategoryNav />
      {children}
      <Footer />
    </MaintenanceGate>
  )
}
