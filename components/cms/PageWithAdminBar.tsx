'use client'

import { Page } from '@/lib/cms/api'
import PageRenderer from './PageRenderer'
import AdminEditBar from './AdminEditBar'

interface PageWithAdminBarProps {
  page: Page
}

export default function PageWithAdminBar({ page }: PageWithAdminBarProps) {
  return (
    <>
      <PageRenderer page={page} />
      <AdminEditBar
        pageId={page.id}
        pageTitle={page.title}
        pageSlug={page.slug}
        pageStatus={page.status}
      />
    </>
  )
}
