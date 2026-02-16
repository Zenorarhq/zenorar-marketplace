// Load environment variables FIRST before any imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

// Now import the rest
import { Pool } from 'pg'

async function verifyLibrarySetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔍 Checking library database setup...\n')

    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('product_files', 'user_product_access', 'download_history')
      ORDER BY table_name
    `)

    console.log('📊 Library Tables Status:')
    const existingTables = tables.rows.map(r => r.table_name)
    ;['product_files', 'user_product_access', 'download_history'].forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`   ✅ ${tableName} - EXISTS`)
      } else {
        console.log(`   ❌ ${tableName} - MISSING`)
      }
    })

    // Check if products table has new columns
    console.log('\n📋 Products Table Columns:')
    const productCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('is_digital', 'product_type')
    `)

    if (productCols.rows.length > 0) {
      productCols.rows.forEach(col => {
        console.log(`   ✅ ${col.column_name} (${col.data_type})`)
      })
    } else {
      console.log('   ⚠️  New columns not found')
    }

    // Check product_files count
    const filesCount = await pool.query('SELECT COUNT(*) as count FROM product_files')
    console.log(`\n📁 Product Files: ${filesCount.rows[0].count}`)

    // Check user_product_access count
    const accessCount = await pool.query('SELECT COUNT(*) as count FROM user_product_access')
    console.log(`🔑 User Product Access: ${accessCount.rows[0].count}`)

    // Check download_history count
    const downloadsCount = await pool.query('SELECT COUNT(*) as count FROM download_history')
    console.log(`📥 Download History: ${downloadsCount.rows[0].count}`)

    // Check products with product_type set
    const productsWithType = await pool.query(`
      SELECT product_type, COUNT(*) as count
      FROM products
      WHERE product_type IS NOT NULL
      GROUP BY product_type
    `)

    console.log('\n📦 Products by Type:')
    if (productsWithType.rows.length > 0) {
      productsWithType.rows.forEach(row => {
        console.log(`   ${row.product_type}: ${row.count}`)
      })
    } else {
      console.log('   ⚠️  No products have product_type set yet')
    }

    console.log('\n✅ Verification complete!')
    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

verifyLibrarySetup()
