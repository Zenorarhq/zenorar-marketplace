import { Metadata } from 'next'
import Link from 'next/link'
import { executeQuery } from '@/lib/db-helpers'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

export const dynamic = 'force-dynamic'

interface TagPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

async function getTag(slug: string) {
  const result = await executeQuery('SELECT * FROM blog_tags WHERE slug = $1', [slug])
  return result.rows[0] || null
}

async function getPostsByTag(tagId: string, page: number, limit: number) {
  const offset = (page - 1) * limit

  const countResult = await executeQuery(
    `SELECT COUNT(*) FROM blog_posts bp
    JOIN blog_post_tags bpt ON bp.id = bpt.post_id
    WHERE bpt.tag_id = $1 AND (bp.status = 'PUBLISHED' OR bp.status = 'SCHEDULED') AND bp.published_at <= NOW()`,
    [tagId]
  )
  const total = parseInt(countResult.rows[0].count)

  const result = await executeQuery(
    `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url, bp.cover_image_alt,
      bp.author_name, bp.published_at
    FROM blog_posts bp
    JOIN blog_post_tags bpt ON bp.id = bpt.post_id
    WHERE bpt.tag_id = $1 AND (bp.status = 'PUBLISHED' OR bp.status = 'SCHEDULED') AND bp.published_at <= NOW()
    ORDER BY bp.published_at DESC
    LIMIT $2 OFFSET $3`,
    [tagId, limit, offset]
  )

  return { posts: result.rows, total, totalPages: Math.ceil(total / limit) }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const tag = await getTag(slug)
  if (!tag) return { title: 'Tag Not Found' }
  return {
    title: `#${tag.name} - Blog`,
    description: `Browse all blog posts tagged with #${tag.name}.`,
  }
}

export default async function BlogTagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const tag = await getTag(slug)

  if (!tag) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-slate-400">Tag not found.</p>
      </div>
    )
  }

  const { posts, totalPages } = await getPostsByTag(tag.id, page, 12)

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: `#${tag.name}` },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-container mx-auto px-4 lg:px-12 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">#{tag.name}</h1>
          <p className="text-slate-400">All posts with this tag</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No posts with this tag yet.</p>
            <Link href="/blog" className="text-primary text-sm mt-2 inline-block hover:underline">Back to Blog</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <article className="bg-[#121212] border border-[#1f1f1f] rounded-xl overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
                  {post.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={post.cover_image_url} alt={post.cover_image_alt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-[#1a1a1a] flex items-center justify-center">
                      <span className="text-slate-600 text-4xl font-bold">{post.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                    {post.excerpt && <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">{post.excerpt}</p>}
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                      <span>{post.author_name}</span>
                      <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {page > 1 && (
              <Link href={`/blog/tag/${slug}?page=${page - 1}`} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#2a2a2a]">Previous</Link>
            )}
            {page < totalPages && (
              <Link href={`/blog/tag/${slug}?page=${page + 1}`} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#2a2a2a]">Next</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}