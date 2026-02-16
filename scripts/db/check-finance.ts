// Load environment variables FIRST before any imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

// Now import the rest
import { Pool } from 'pg'

async function checkFinance() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔍 Checking finance data...\n')

    // Check orders count and totals
    const ordersCheck = await pool.query(`
      SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total), 0)::float as total_revenue,
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' THEN total ELSE 0 END), 0)::float as paid_total,
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PENDING' THEN total ELSE 0 END), 0)::float as pending_total,
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN total ELSE 0 END), 0)::float as refunded_total
      FROM orders
    `)

    console.log('📊 Orders Summary:')
    console.log(ordersCheck.rows[0])
    console.log('')

    // Check orders by status
    const statusBreakdown = await pool.query(`
      SELECT
        status,
        "paymentStatus",
        COUNT(*) as count,
        COALESCE(SUM(total), 0)::float as total_amount
      FROM orders
      GROUP BY status, "paymentStatus"
      ORDER BY count DESC
    `)

    console.log('📋 Orders by Status:')
    if (statusBreakdown.rows.length > 0) {
      statusBreakdown.rows.forEach(row => {
        console.log(`   ${row.status} / ${row.paymentstatus}: ${row.count} orders ($${row.total_amount})`)
      })
    } else {
      console.log('   ❌ No orders found')
    }
    console.log('')

    // Sample some recent orders
    const recentOrders = await pool.query(`
      SELECT
        id,
        total,
        status,
        "paymentStatus",
        "createdAt"
      FROM orders
      ORDER BY "createdAt" DESC
      LIMIT 5
    `)

    console.log('🕐 Recent Orders (last 5):')
    if (recentOrders.rows.length > 0) {
      recentOrders.rows.forEach(order => {
        console.log(`   ${order.id} - $${order.total} - ${order.status}/${order.paymentStatus} - ${order.createdAt}`)
      })
    } else {
      console.log('   ❌ No orders found')
    }

    console.log('\n✅ Check complete!')
    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Check failed:', error.message)
    console.error('Full error:', error)
    await pool.end()
    process.exit(1)
  }
}

checkFinance()
