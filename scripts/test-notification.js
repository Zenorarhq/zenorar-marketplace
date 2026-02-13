require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const crypto = require('crypto')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function test() {
  const id = crypto.randomUUID()
  try {
    const result = await pool.query(
      'INSERT INTO notifications (id, "userId", type, title, message, metadata) VALUES ($1, $2, $3::"NotificationType", $4, $5, $6::jsonb)',
      [id, 'cmlexgoe5004ccsjpu659yhef', 'SYSTEM', 'Test Notification', 'This is a test', '{}']
    )
    console.log('SUCCESS: inserted', result.rowCount, 'row')
    // Clean up
    await pool.query('DELETE FROM notifications WHERE id = $1', [id])
    console.log('Cleaned up test row')
  } catch (e) {
    console.error('ERROR:', e.message)
  }
  await pool.end()
}

test()
