// Diagnose virtual numbers issue
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function diagnose() {
  const client = await pool.connect();

  try {
    console.log('=== VIRTUAL NUMBERS DIAGNOSTIC ===\n');

    // 1. Check user_virtual_numbers table structure
    console.log('1. Checking user_virtual_numbers table structure...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_virtual_numbers'
      ORDER BY ordinal_position
    `);
    console.log('Columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Check if there are ANY records in user_virtual_numbers
    console.log('\n2. Checking user_virtual_numbers records...');
    const countResult = await client.query('SELECT COUNT(*) as count FROM user_virtual_numbers');
    console.log(`Total records: ${countResult.rows[0].count}`);

    // 3. List all records with their status
    const allRecords = await client.query(`
      SELECT id, user_id, phone_number, status, plan_id, plan_category, created_at
      FROM user_virtual_numbers
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent records:');
    if (allRecords.rows.length === 0) {
      console.log('  (no records found)');
    } else {
      allRecords.rows.forEach(r => {
        console.log(`  ${r.id}: ${r.phone_number} - status: ${r.status}, plan: ${r.plan_id}/${r.plan_category}, user: ${r.user_id?.substring(0, 8)}...`);
      });
    }

    // 4. Check virtual_number_inventory
    console.log('\n3. Checking virtual_number_inventory...');
    const inventoryCount = await client.query('SELECT COUNT(*) as count FROM virtual_number_inventory');
    console.log(`Total inventory records: ${inventoryCount.rows[0].count}`);

    const inventoryRecords = await client.query(`
      SELECT id, phone_number, status, provider, rented_to_user_id, created_at
      FROM virtual_number_inventory
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent inventory:');
    if (inventoryRecords.rows.length === 0) {
      console.log('  (no records found)');
    } else {
      inventoryRecords.rows.forEach(r => {
        console.log(`  ${r.phone_number}: status=${r.status}, provider=${r.provider}, rented_to=${r.rented_to_user_id?.substring(0, 8) || 'none'}...`);
      });
    }

    // 5. Check provision log for failures
    console.log('\n4. Checking virtual_number_provision_log for failures...');
    const provisionLog = await client.query(`
      SELECT id, user_id, order_id, phone_number, status, error_message, created_at
      FROM virtual_number_provision_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    if (provisionLog.rows.length === 0) {
      console.log('  (no provision log entries)');
    } else {
      provisionLog.rows.forEach(r => {
        console.log(`  ${r.created_at}: ${r.status} - ${r.error_message || 'no error'}`);
      });
    }

    // 6. Check recent orders with virtual_number product type
    console.log('\n5. Checking recent orders with virtual_number items...');
    const recentOrders = await client.query(`
      SELECT o.id, o."orderNumber", o.status, o."createdAt",
             oi.product_type, oi.metadata
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      WHERE oi.product_type = 'virtual_number'
      ORDER BY o."createdAt" DESC
      LIMIT 5
    `);
    if (recentOrders.rows.length === 0) {
      console.log('  (no virtual_number orders found)');
    } else {
      recentOrders.rows.forEach(r => {
        console.log(`  Order ${r.orderNumber}: status=${r.status}`);
        console.log(`    Metadata: ${JSON.stringify(r.metadata)}`);
      });
    }

    // 7. Check if plan_id column allows TEXT values
    console.log('\n6. Testing INSERT capability...');
    try {
      await client.query('BEGIN');
      const testInsert = await client.query(`
        INSERT INTO user_virtual_numbers
          (id, user_id, plan_id, plan_category, country_id, phone_number, status)
        VALUES
          (gen_random_uuid()::text, 'test-user-delete-me', 'basic', 'basic',
           (SELECT id FROM virtual_number_countries LIMIT 1),
           '+1555TEST', 'active')
        RETURNING id
      `);
      console.log(`  Test INSERT succeeded with id: ${testInsert.rows[0].id}`);
      await client.query('ROLLBACK');
      console.log('  (rolled back test record)');
    } catch (err) {
      await client.query('ROLLBACK');
      console.log(`  Test INSERT FAILED: ${err.message}`);
    }

    console.log('\n=== END DIAGNOSTIC ===');

  } finally {
    client.release();
    await pool.end();
  }
}

diagnose().catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
