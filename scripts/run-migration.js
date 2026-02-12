// Try .env.local first, fallback to .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration(filename) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();
    try {
      const migrationPath = path.join(__dirname, 'db', 'migrations', filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      console.log(`Running migration: ${filename}`);
      await client.query(sql);
      console.log('✓ Migration completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  process.exit(1);
}

runMigration(migrationFile);
