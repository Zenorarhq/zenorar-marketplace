import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { executeQuery } from '@/lib/db-helpers'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

export const dynamic = 'force-dynamic'

// Server-safe HTML sanitization: strip script tags and event handlers
// Content is admin-authored via TipTap (produces clean HTML)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string) {
  const result = await executeQuery(
    `SELECT bp.*,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', bc.id, 'name', bc.name, 'slug', bc.slug))
        FILTER (WHERE bc.id IS NOT NULL), '[]'
      ) as categories,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', bt.id, 'name', bt.name, 'slug', bt.slug))
        FILTER (WHERE bt.id IS NOT NULL), '[]'
      ) as tags
    FROM blog_posts bp
    LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
    LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
    LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
    LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
    WHERE bp.slug = $1 AND bp.status = 'PUBLISHED' AND bp.published_at <= NOW()
    GROUP BY bp.id`,
    [slug]
  )
  return result.rows[0] || null
}

async function getRelatedPosts(postId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return []
  const result = await executeQuery(
    `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url, bp.cover_image_alt,
      bp.author_name, bp.published_at
    FROM blog_posts bp
    JOIN blog_post_categories bpc ON bp.id = bpc.post_id
    WHERE bpc.category_id = ANY($1)
      AND bp.id != $2
      AND bp.status = 'PUBLISHED'
      AND bp.published_at <= NOW()
    GROUP BY bp.id
    ORDER BY bp.published_at DESC
    LIMIT 3`,
    [categoryIds, postId]
  )
  return result.rows
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post Not Found' }

  const title = post.seo_title || post.title
  const description = post.seo_description || post.excerpt || ''
  const image = post.og_image_url || post.cover_image_url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) notFound()

  const categories = typeof post.categories === 'string' ? JSON.parse(post.categories) : (post.categories || [])
  const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : (post.tags || [])
  const categoryIds = categories.map((c: any) => c.id)
  const relatedPosts = await getRelatedPosts(post.id, categoryIds)

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: post.title },
  ]

  const sanitizedContent = sanitizeHtml(post.content || '')

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    image: post.cover_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Zenorar',
    },
  }

  return (
    <div className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <article className="mt-6">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 mb-4">
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 break-words">
            {post.title}
          </h1>

          {/* Author & date */}
          <div className="flex items-center gap-4 text-sm text-slate-400 mb-8">
            <span>By {post.author_name}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
          </div>

          {/* Cover image */}
          {post.cover_image_url && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-invert prose-lg max-w-none break-words overflow-hidden
              prose-headings:text-white prose-headings:font-bold
              prose-p:text-slate-300 prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:mx-auto
              prose-blockquote:border-primary prose-blockquote:text-slate-400
              prose-strong:text-white
              prose-code:text-primary prose-code:bg-[#1a1a1a] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[#1f1f1f]
              prose-li:text-slate-300"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-[#1f1f1f]">
              {tags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="px-3 py-1 bg-[#1a1a1a] text-slate-400 text-sm rounded-full hover:text-white border border-[#2a2a2a] transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-8 border-t border-[#1f1f1f]">
            <h2 className="text-xl font-bold text-white mb-6">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp: any) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`} className="group">
                  <article className="bg-[#121212] border border-[#1f1f1f] rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    {rp.cover_image_url ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={rp.cover_image_url} alt={rp.cover_image_alt || rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-[#1a1a1a] flex items-center justify-center">
                        <span className="text-slate-600 text-2xl font-bold">{rp.title.charAt(0)}</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-white font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(rp.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
