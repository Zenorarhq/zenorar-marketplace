import { Metadata } from 'next'
import Link from 'next/link'
import { executeQuery } from '@/lib/db-helpers'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

export const dynamic = 'force-dynamic'

interface BlogListPageProps {
  searchParams: Promise<{ page?: string; category?: string; tag?: string; search?: string }>
}

async function getPublishedPosts(opts: { page: number; limit: number; category?: string; tag?: string; search?: string }) {
  const { page, limit, category, tag, search } = opts
  const offset = (page - 1) * limit

  let where = `WHERE bp.status = 'PUBLISHED' AND bp.published_at <= NOW()`
  const params: any[] = []

  if (category) {
    params.push(category)
    where += ` AND EXISTS (SELECT 1 FROM blog_post_categories bpc2 JOIN blog_categories bc2 ON bpc2.category_id = bc2.id WHERE bpc2.post_id = bp.id AND bc2.slug = $${params.length})`
  }
  if (tag) {
    params.push(tag)
    where += ` AND EXISTS (SELECT 1 FROM blog_post_tags bpt2 JOIN blog_tags bt2 ON bpt2.tag_id = bt2.id WHERE bpt2.post_id = bp.id AND bt2.slug = $${params.length})`
  }
  if (search) {
    params.push(`%${search}%`)
    where += ` AND (bp.title ILIKE $${params.length} OR bp.excerpt ILIKE $${params.length})`
  }

  const countResult = await executeQuery(`SELECT COUNT(*) FROM blog_posts bp ${where}`, params)
  const total = parseInt(countResult.rows[0].count)

  params.push(limit, offset)
  const result = await executeQuery(
    `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url, bp.cover_image_alt,
      bp.author_name, bp.published_at,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', bc.id, 'name', bc.name, 'slug', bc.slug))
        FILTER (WHERE bc.id IS NOT NULL), '[]'
      ) as categories
    FROM blog_posts bp
    LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
    LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
    ${where}
    GROUP BY bp.id
    ORDER BY bp.published_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { posts: result.rows, total, totalPages: Math.ceil(total / limit) }
}

async function getCategories() {
  const result = await executeQuery(
    `SELECT bc.id, bc.name, bc.slug, COUNT(bpc.post_id) as post_count
    FROM blog_categories bc
    JOIN blog_post_categories bpc ON bc.id = bpc.category_id
    JOIN blog_posts bp ON bpc.post_id = bp.id AND bp.status = 'PUBLISHED' AND bp.published_at <= NOW()
    GROUP BY bc.id
    ORDER BY bc.name`
  )
  return result.rows
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog',
    description: 'Latest news, guides, and insights from our team.',
    openGraph: { title: 'Blog', type: 'website' },
  }
}

export default async function BlogListPage({ searchParams }: BlogListPageProps) {
  const sp = await searchParams
  const page = parseInt(sp.page || '1')
  const category = sp.category
  const tag = sp.tag
  const search = sp.search

  const [{ posts, total, totalPages }, categories] = await Promise.all([
    getPublishedPosts({ page, limit: 12, category, tag, search }),
    getCategories(),
  ])

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog' },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Blog</h1>
          <p className="text-slate-400">Latest news, guides, and insights</p>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/blog"
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                !category ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              All
            </Link>
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  category === cat.slug ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Posts grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No blog posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: any) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <article className="bg-[#121212] border border-[#1f1f1f] rounded-xl overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
                  {post.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.cover_image_alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-[#1a1a1a] flex items-center justify-center">
                      <span className="text-slate-600 text-4xl font-bold">{post.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Categories */}
                    {post.categories?.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {post.categories.slice(0, 2).map((cat: any) => (
                          <span key={cat.id} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">{post.excerpt}</p>
                    )}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}${category ? `&category=${category}` : ''}${tag ? `&tag=${tag}` : ''}`}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#2a2a2a]"
              >
                Previous
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1
              return (
                <Link
                  key={p}
                  href={`/blog?page=${p}${category ? `&category=${category}` : ''}${tag ? `&tag=${tag}` : ''}`}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    p === page ? 'bg-primary text-black font-medium' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-[#2a2a2a]'
                  }`}
                >
                  {p}
                </Link>
              )
            })}
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}${category ? `&category=${category}` : ''}${tag ? `&tag=${tag}` : ''}`}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#2a2a2a]"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
