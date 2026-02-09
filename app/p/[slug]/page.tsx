import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageWithAdminBar from '@/components/cms/PageWithAdminBar'

const API_BASE = process.env.NEXT_PUBLIC_CMS_API_URL || 'http://localhost:4000/api'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getPage(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/pages/public/${slug}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Failed to fetch page:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) {
    return {
      title: 'Page Not Found',
    }
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    openGraph: page.ogImage
      ? {
          images: [{ url: page.ogImage }],
        }
      : undefined,
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) {
    notFound()
  }

  return <PageWithAdminBar page={page} />
}
