import { unstable_cache } from 'next/cache'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import MaintenanceGate from '@/components/layout/MaintenanceGate'
import { executeQuery } from '@/lib/db-helpers'
import type { NavItem } from '@/lib/types'

const getNavCategories = unstable_cache(
  async (): Promise<NavItem[]> => {
    const result = await executeQuery(`
      SELECT name, slug, icon
      FROM categories
      WHERE "parentId" IS NULL AND "isActive" = true
      ORDER BY "order" ASC NULLS LAST, name ASC
    `)
    return result.rows.map((r: any) => ({
      label: r.name,
      href: `/${r.slug}`,
      icon: r.icon,
    }))
  },
  ['nav-categories'],
  { revalidate: 300 }
)

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navCategories = await getNavCategories()
  return (
    <MaintenanceGate>
      <AnnouncementBar />
      <Header categories={navCategories} />
      <CategoryNav categories={navCategories} />
      {children}
      <Footer />
    </MaintenanceGate>
  )
}
