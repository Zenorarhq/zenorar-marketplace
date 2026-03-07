const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== user_virtual_numbers (latest 5) ===');
    const uvn = await client.query(`
      SELECT id, phone_number, status, plan_category, created_at
      FROM user_virtual_numbers
      ORDER BY created_at DESC LIMIT 5
    `);
    uvn.rows.forEach(r => console.log(`  ${r.phone_number}: ${r.status} (${r.plan_category}) - ${r.created_at}`));
    if (uvn.rows.length === 0) console.log('  (none)');

    console.log('\n=== Recent virtual_number orders ===');
    const orders = await client.query(`
      SELECT o."orderNumber", o.status, o."createdAt", oi.metadata->>'phone_number' as phone
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      WHERE oi.product_type = 'virtual_number'
      ORDER BY o."createdAt" DESC LIMIT 5
    `);
    orders.rows.forEach(r => console.log(`  ${r.orderNumber}: ${r.status} - ${r.phone} (${r.createdAt})`));

    console.log('\n=== Recent provision log ===');
    const log = await client.query(`
      SELECT status, error_message, created_at
      FROM virtual_number_provision_log
      ORDER BY created_at DESC LIMIT 3
    `);
    log.rows.forEach(r => console.log(`  ${r.status}: ${r.error_message || 'ok'} (${r.created_at})`));
    if (log.rows.length === 0) console.log('  (none)');
  } finally {
    client.release();
    await pool.end();
  }
}
check();
