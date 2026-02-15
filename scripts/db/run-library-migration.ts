// Load environment variables FIRST before any imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

// Now import the rest
import * as fs from 'fs'
import { Pool } from 'pg'

async function runLibraryMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    const migrationPath = path.join(__dirname, 'migrations', '022_create_library_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running library tables migration...')
    await pool.query(sql)
    console.log('✅ Library tables created successfully!')

    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('product_files', 'user_product_access', 'download_history')
      ORDER BY table_name
    `)

    console.log('\n📊 Created tables:')
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`)
    })

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

runLibraryMigration()
