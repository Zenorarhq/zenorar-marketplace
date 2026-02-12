import { config } from 'dotenv'
import { join } from 'path'
import { readdirSync, readFileSync } from 'fs'

// Load environment variables from .env.local BEFORE importing db
config({ path: join(__dirname, '../../.env.local') })

// Import db after environment is loaded
const db = require('../../lib/db').default

async function migrate() {
  const client = await db.connect()

  try {
    console.log('🚀 Starting database migrations...\n')

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Get list of executed migrations
    const executedResult = await client.query(
      'SELECT name FROM migrations ORDER BY name'
    )
    const executed = new Set(executedResult.rows.map((r: any) => r.name))

    // Read migration files from migrations directory
    const migrationsDir = join(__dirname, 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (files.length === 0) {
      console.log('⚠️  No migration files found in', migrationsDir)
      return
    }

    let appliedCount = 0

    // Execute each migration
    for (const file of files) {
      if (executed.has(file)) {
        console.log(`✓ ${file} (already applied)`)
        continue
      }

      console.log(`⏳ Applying ${file}...`)

      const sql = readFileSync(join(migrationsDir, file), 'utf-8')

      await client.query('BEGIN')

      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')

        console.log(`✅ ${file} applied successfully`)
        appliedCount++
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Failed to apply ${file}: ${error}`)
      }
    }

    if (appliedCount === 0) {
      console.log('\n✨ All migrations are up to date!')
    } else {
      console.log(`\n✨ Successfully applied ${appliedCount} migration(s)!`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await db.end()
  }
}

migrate()
