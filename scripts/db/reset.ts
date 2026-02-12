import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(__dirname, '../../.env.local') })

// Import db after environment is loaded
const db = require('../../lib/db').default

async function reset() {
  const client = await db.connect()

  try {
    console.log('🔄 Resetting database...\n')

    await client.query('BEGIN')

    // Drop all tables in reverse order of dependencies
    const tables = [
      'refresh_tokens',
      'tickets',
      'notifications',
      'discounts',
      'wishlists',
      'reviews',
      'addresses',
      'order_items',
      'orders',
      'cart_items',
      'carts',
      'product_variants',
      'product_images',
      'products',
      'categories',
      'users',
      'migrations'
    ]

    console.log('Dropping existing tables...')
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`)
      console.log(`✓ Dropped ${table}`)
    }

    // Drop trigger function
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE')
    await client.query('DROP FUNCTION IF EXISTS cleanup_expired_tokens CASCADE')
    console.log('✓ Dropped trigger functions')

    await client.query('COMMIT')

    console.log('\n✅ Database reset successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run: npm run db:migrate')
    console.log('   2. Run: npm run db:seed')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Reset failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await db.end()
  }
}

reset()
