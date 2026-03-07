// Run all SQL migrations
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running: ${file}...`);
      try {
        await client.query(sql);
        console.log(`  ✓ Success\n`);
      } catch (err) {
        // Many migrations use IF NOT EXISTS, so some errors are expected
        if (err.message.includes('already exists') ||
            err.message.includes('duplicate key') ||
            err.message.includes('does not exist') && err.message.includes('DROP')) {
          console.log(`  ⚠ Skipped (already applied or no-op)\n`);
        } else {
          console.error(`  ✗ Error: ${err.message}\n`);
        }
      }
    }

    console.log('Migration run complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
