import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProductTabs from '@/components/product/ProductTabs'
import ProductPurchasePanel from '@/components/product/ProductPurchasePanel'
import ProductVideoModal from '@/components/product/ProductVideoModal'
import RelatedProducts from '@/components/product/RelatedProducts'
import { executeQuery } from '@/lib/db-helpers'
import { Product } from '@/lib/types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

// Fetch product from database by slug
async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const productResult = await executeQuery(`
      SELECT
        p.id, p.name, p.slug, p.description, p.price, p."isFeatured" as is_featured, p.video_url,
        p."categoryId" as category_id, c.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary") ORDER BY pi."isPrimary" DESC)
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.slug = $1 AND p.status = 'ACTIVE'
      GROUP BY p.id, c.name
    `, [slug])

    if (productResult.rows.length === 0) return null

    const row = productResult.rows[0]

    // Fetch reviews
    const reviewsResult = await executeQuery(`
      SELECT r.id, r.rating, r.content, r."createdAt",
             r.guest_name, r.admin_reply, r.admin_reply_at,
             u.name as author_name
      FROM reviews r
      LEFT JOIN users u ON r."userId" = u.id
      WHERE r."productId" = $1
      ORDER BY r."createdAt" DESC
      LIMIT 20
    `, [row.id])

    const reviews = reviewsResult.rows.map((r: any) => ({
      id: r.id,
      author: r.author_name || r.guest_name || 'Anonymous',
      rating: Number(r.rating),
      content: r.content || '',
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
      adminReply: r.admin_reply || null,
      adminReplyAt: r.admin_reply_at ? new Date(r.admin_reply_at).toISOString().split('T')[0] : null,
    }))

    // Get primary image URL
    const imagesList = row.images || []
    const primaryImage = imagesList.find((img: any) => img.isPrimary)?.url || imagesList[0]?.url || undefined

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      price: Number(row.price),
      rating: Number(row.average_rating) || 0,
      reviewCount: Number(row.review_count) || 0,
      category: row.category_name || '',
      categoryId: row.category_id || null,
      icon: 'box',
      iconColor: 'primary',
      tags: [],
      image: primaryImage,
      images: imagesList,
      badge: row.is_featured ? 'HOT' : undefined,
      videoUrl: row.video_url || undefined,
      reviews,
    }
  } catch (error) {
    console.error('Failed to fetch product by slug:', error)
    return null
  }
}

// Fetch related products from the same category (with sibling category fallback)
async function getRelatedProducts(productId: string, categoryId: string | null) {
  if (!categoryId) return []
  try {
    // Get products from the same category
    const result = await executeQuery(`
      SELECT p.id, p.name, p.slug, p.price, c.name as category_name,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(DISTINCT r.id) as review_count,
             (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as image
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p."categoryId" = $1 AND p.id != $2 AND p.status = 'ACTIVE'
      GROUP BY p.id, c.name
      ORDER BY RANDOM()
      LIMIT 5
    `, [categoryId, productId])

    let products = result.rows

    // If fewer than 5, fill with sibling category products
    if (products.length < 5) {
      const remaining = 5 - products.length
      const excludeIds = [productId, ...products.map((p: any) => p.id)]
      const placeholders = excludeIds.map((_, i) => `$${i + 2}`).join(', ')

      const siblingResult = await executeQuery(`
        SELECT p.id, p.name, p.slug, p.price, c.name as category_name,
               COALESCE(AVG(r.rating), 0) as average_rating,
               COUNT(DISTINCT r.id) as review_count,
               (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id AND pi."isPrimary" = true LIMIT 1) as image
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        LEFT JOIN reviews r ON r."productId" = p.id
        WHERE p."categoryId" IN (
          SELECT id FROM categories WHERE "parentId" = (SELECT "parentId" FROM categories WHERE id = $1)
        )
        AND p.id NOT IN (${placeholders})
        AND p.status = 'ACTIVE'
        GROUP BY p.id, c.name
        ORDER BY RANDOM()
        LIMIT ${remaining}
      `, [categoryId, ...excludeIds])

      products = [...products, ...siblingResult.rows]
    }

    return products.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      rating: Number(row.average_rating) || 0,
      reviewCount: Number(row.review_count) || 0,
      category: row.category_name || '',
      icon: 'box',
      image: row.image || undefined,
    }))
  } catch (error) {
    console.error('Failed to fetch related products:', error)
    return []
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return { title: 'Product Not Found' }
  }

  return {
    title: product.name,
    description: product.description || `${product.name} - Premium digital asset available on Zenorar Marketplace`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.image ? [{ url: product.image }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product.id, product.categoryId || null)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    ...(product.rating && product.reviewCount ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      },
    } : {}),
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Scripts', href: '/products' },
            { label: product.name }
          ]}
          className="mb-0"
        />
      </div>

      {/* Product Title */}
      <div className="flex items-center gap-3 mb-6 lg:mb-8 flex-wrap">
        <h1 className="text-2xl lg:text-4xl font-extrabold text-white">{product.name}</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-primary/20">
          <Icon name="verified" size={14} />
          Verified
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8 items-start mb-12">
        {/* Left Column - Gallery & Tabs */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Product Image/Gallery */}
          <div className="w-full aspect-video bg-surface-dark rounded-2xl border border-border-dark overflow-hidden relative group">
            <Image
              src={product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvwgfYMEvcI_nX3811VEyCy34SMnKHy9dmdnqG3nSMOUjjKLHrwM1Buu7vIN4sHUv_IHj3lxtx8AuvVgtQJrjdBjilef-qD6NbH3AMwpj-xP3Cl3XD4r8kxRx3ZJzJe8Y-Z4MqVrZdrhg60-dWHm_iNTlUzZhPqmEvucOUsNN2Cqq1nlRE-lUiK6PR4GpN2-YM32iXvk86ERNf_KfTr8v3fkU0u395JRo_hw-hlhfenuygiypi5Pyn0V13zGizBFBqXGrkP8TTlHSx'}
              alt={product.name}
              fill
              className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent flex items-end p-4 lg:p-8">
              {product.videoUrl && (
                <div className="flex gap-4">
                  <ProductVideoModal videoUrl={product.videoUrl} />
                </div>
              )}
            </div>
          </div>

          {/* Product Tabs */}
          <ProductTabs product={product} />
        </div>

        {/* Right Column - Purchase Panel */}
        <div className="col-span-12 lg:col-span-4">
          <ProductPurchasePanel product={product} />
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts products={relatedProducts} />
    </main>
  )
}
