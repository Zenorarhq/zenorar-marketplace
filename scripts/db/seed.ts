import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(__dirname, '../../.env.local') })

// Import modules after environment is loaded
const db = require('../../lib/db').default
const { hashPassword } = require('../../lib/auth-utils')
const { generateSlug } = require('../../lib/db-helpers')

async function seed() {
  const client = await db.connect()

  try {
    console.log('🌱 Starting database seeding...\n')

    await client.query('BEGIN')

    // 1. Create admin user
    console.log('Creating admin user...')
    const hashedPassword = await hashPassword('admin123')
    const adminResult = await client.query(`
      INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['admin@zenorar.com', hashedPassword, 'Admin User', 'ADMIN'])

    if (adminResult.rows.length > 0) {
      console.log('✅ Admin user created (email: admin@zenorar.com, password: admin123)')
    } else {
      console.log('⚠️  Admin user already exists')
    }

    // 2. Create categories
    console.log('\nCreating categories...')
    const categories = [
      { name: 'Scripts', slug: 'scripts', description: 'Automation scripts, bots, and developer tools', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400', order: 1 },
      { name: 'eSIM', slug: 'esim', description: 'Global eSIM data plans for travel and connectivity', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400', order: 2 },
      { name: 'Gift Cards', slug: 'gift-cards', description: 'Digital gift cards for gaming, shopping, and entertainment', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400', order: 3 },
      { name: 'Virtual Numbers', slug: 'virtual-numbers', description: 'Virtual phone numbers for SMS verification and privacy', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400', order: 4 },
      { name: 'Cards', slug: 'cards', description: 'Virtual and instant cards for online payments', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400', order: 5 }
    ]

    const categoryIds: Record<string, string> = {}
    for (const cat of categories) {
      const result = await client.query(`
        INSERT INTO categories (id, name, slug, description, image, "order", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          "order" = EXCLUDED."order"
        RETURNING id
      `, [cat.name, cat.slug, cat.description, cat.image, cat.order, true])

      categoryIds[cat.slug] = result.rows[0].id
      console.log(`✅ Category: ${cat.name}`)
    }

    // 3. Create sample products
    console.log('\nCreating sample products...')
    const products = [
      // Scripts
      { name: 'Ultimate CRM Script', category: 'scripts', price: 129.00, comparePrice: 199.00, stock: 50, description: 'Professional CRM automation script with advanced features', shortDesc: 'Advanced CRM automation for businesses', featured: true },
      { name: 'Discord Bot Pro', category: 'scripts', price: 89.00, stock: 100, description: 'Feature-rich Discord bot with moderation and entertainment', shortDesc: 'Complete Discord server management', featured: true },
      { name: 'Instagram Growth Tool', category: 'scripts', price: 149.00, stock: 30, description: 'Automate Instagram growth with smart engagement features', shortDesc: 'Grow your Instagram organically', featured: false },
      { name: 'YouTube Analytics Script', category: 'scripts', price: 79.00, stock: 75, description: 'Deep analytics and insights for YouTube channels', shortDesc: 'Track your YouTube performance', featured: false },
      { name: 'Shopify Store Manager', category: 'scripts', price: 199.00, stock: 25, description: 'Complete store management and automation for Shopify', shortDesc: 'Automate your Shopify store', featured: true },

      // eSIMs
      { name: 'EU Roaming eSIM - 10GB', category: 'esim', price: 49.00, stock: 1000, description: '10GB data valid for 30 days across 30+ European countries', shortDesc: 'Europe-wide connectivity', featured: true },
      { name: 'US Travel eSIM - 20GB', category: 'esim', price: 59.00, stock: 1000, description: '20GB data valid for 30 days in the United States', shortDesc: 'USA unlimited connectivity', featured: false },
      { name: 'Global eSIM - 5GB', category: 'esim', price: 39.00, stock: 1000, description: '5GB data valid for 30 days in 190+ countries', shortDesc: 'Worldwide data access', featured: true },
      { name: 'Asia Pacific eSIM - 15GB', category: 'esim', price: 55.00, stock: 1000, description: '15GB data valid for 30 days across Asia Pacific region', shortDesc: 'Asia connectivity solution', featured: false },
      { name: 'UK eSIM - 30GB', category: 'esim', price: 45.00, stock: 1000, description: '30GB data valid for 30 days in the United Kingdom', shortDesc: 'UK mobile data', featured: false },

      // Gift Cards
      { name: 'Steam Gift Card $50', category: 'gift-cards', price: 50.00, stock: 500, description: 'Steam wallet gift card - instant delivery', shortDesc: 'Add funds to Steam wallet', featured: true },
      { name: 'PlayStation Store $25', category: 'gift-cards', price: 25.00, stock: 500, description: 'PlayStation Network gift card - instant delivery', shortDesc: 'PSN wallet top-up', featured: false },
      { name: 'Xbox Gift Card $100', category: 'gift-cards', price: 100.00, stock: 300, description: 'Xbox gift card for games and subscriptions', shortDesc: 'Xbox store credit', featured: true },
      { name: 'Amazon Gift Card $75', category: 'gift-cards', price: 75.00, stock: 400, description: 'Amazon.com gift card - instant delivery', shortDesc: 'Shop on Amazon', featured: false },
      { name: 'Netflix 3 Month Subscription', category: 'gift-cards', price: 45.00, stock: 200, description: '3-month Netflix Standard subscription gift card', shortDesc: 'Stream unlimited content', featured: true },

      // Virtual Numbers
      { name: 'US Virtual Number - Monthly', category: 'virtual-numbers', price: 15.00, stock: 100, description: 'US-based virtual phone number for SMS/calls', shortDesc: 'US phone number', featured: false },
      { name: 'UK Virtual Number - Monthly', category: 'virtual-numbers', price: 18.00, stock: 100, description: 'UK virtual phone number with SMS capability', shortDesc: 'UK phone number', featured: false },
      { name: 'Canada Virtual Number - Monthly', category: 'virtual-numbers', price: 16.00, stock: 100, description: 'Canadian virtual number for verification', shortDesc: 'Canada phone number', featured: false },
      { name: 'International Number Pack', category: 'virtual-numbers', price: 99.00, stock: 50, description: 'Bundle of 5 international virtual numbers', shortDesc: 'Multi-country numbers', featured: true },
      { name: 'Disposable Number - 24h', category: 'virtual-numbers', price: 5.00, stock: 500, description: 'Temporary virtual number valid for 24 hours', shortDesc: 'One-time verification', featured: false },
    ]

    for (const product of products) {
      const slug = generateSlug(product.name)
      const categoryId = categoryIds[product.category]
      const sku = `${product.category.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      await client.query(`
        INSERT INTO products (
          id, name, slug, description, "shortDescription", sku, price, "comparePrice", stock,
          status, "isFeatured", is_digital, "categoryId", "createdAt", "updatedAt"
        )
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          "isFeatured" = EXCLUDED."isFeatured"
      `, [
        product.name, slug, product.description, product.shortDesc, sku,
        product.price, product.comparePrice || null, product.stock,
        'ACTIVE', product.featured, true, categoryId
      ])

      console.log(`✅ Product: ${product.name}`)
    }

    // 4. Create sample discount codes
    console.log('\nCreating discount codes...')
    const discounts = [
      { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, usageLimit: null, description: 'Welcome discount for new customers' },
      { code: 'SUMMER2024', type: 'PERCENTAGE', value: 25, usageLimit: 500, expiresAt: '2024-08-31', description: 'Summer sale discount' },
      { code: 'FIXED50', type: 'FIXED', value: 50, usageLimit: 1000, minPurchase: 200, description: '$50 off on orders above $200' }
    ]

    for (const discount of discounts) {
      await client.query(`
        INSERT INTO discounts (id, code, type, value, "usageLimit", "minOrderValue", "expiresAt", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `, [
        discount.code,
        discount.type,
        discount.value,
        discount.usageLimit || null,
        discount.minPurchase || null,
        discount.expiresAt || null,
        true
      ])

      console.log(`✅ Discount: ${discount.code} (${discount.type === 'PERCENTAGE' ? discount.value + '%' : '$' + discount.value})`)
    }

    await client.query('COMMIT')

    console.log('\n✨ Database seeded successfully!')
    console.log('\n📝 Login credentials:')
    console.log('   Email: admin@zenorar.com')
    console.log('   Password: admin123')
    console.log('\n⚠️  Remember to change the admin password in production!')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await db.end()
  }
}

seed()
