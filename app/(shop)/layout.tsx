import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <CategoryNav />
      {children}
      <Footer />
    </>
  )
}
