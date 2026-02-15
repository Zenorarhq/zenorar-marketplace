// Load environment variables FIRST before any imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

// Now import the rest
import { Pool } from 'pg'

async function fixUserRoles() {
  // Create pool directly with DATABASE_URL from env
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔧 Fixing user roles and isStaff values...\n')

    // Fix 1: editor@zenorar.com - Set isStaff = true (keep EDITOR role)
    console.log('1. Updating editor@zenorar.com...')
    const result1 = await pool.query(`
      UPDATE users
      SET "isStaff" = true
      WHERE email = 'editor@zenorar.com'
      RETURNING email, role, "isStaff"
    `)
    if (result1.rows.length > 0) {
      console.log(`   ✅ ${result1.rows[0].email} - Role: ${result1.rows[0].role}, isStaff: ${result1.rows[0].isStaff}`)
    } else {
      console.log('   ⚠️  User not found')
    }

    // Fix 2: zenorarhq@proton.me - Set role = VIEWER, isStaff = false
    console.log('\n2. Updating zenorarhq@proton.me...')
    const result2 = await pool.query(`
      UPDATE users
      SET role = 'VIEWER', "isStaff" = false
      WHERE email = 'zenorarhq@proton.me'
      RETURNING email, role, "isStaff"
    `)
    if (result2.rows.length > 0) {
      console.log(`   ✅ ${result2.rows[0].email} - Role: ${result2.rows[0].role}, isStaff: ${result2.rows[0].isStaff}`)
    } else {
      console.log('   ⚠️  User not found')
    }

    // Fix 3: laskyrichard2@gmail.com - Set role = VIEWER, isStaff = false
    console.log('\n3. Updating laskyrichard2@gmail.com...')
    const result3 = await pool.query(`
      UPDATE users
      SET role = 'VIEWER', "isStaff" = false
      WHERE email = 'laskyrichard2@gmail.com'
      RETURNING email, role, "isStaff"
    `)
    if (result3.rows.length > 0) {
      console.log(`   ✅ ${result3.rows[0].email} - Role: ${result3.rows[0].role}, isStaff: ${result3.rows[0].isStaff}`)
    } else {
      console.log('   ⚠️  User not found')
    }

    // Verify final counts
    console.log('\n📊 Final counts:')
    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'VIEWER') AS viewer_count,
        COUNT(*) FILTER (WHERE "isStaff" = true) AS staff_count,
        COUNT(*) AS total_count
      FROM users
    `)
    console.log(`   Total Users: ${counts.rows[0].total_count}`)
    console.log(`   Staff (isStaff = true): ${counts.rows[0].staff_count}`)
    console.log(`   Viewers (role = VIEWER): ${counts.rows[0].viewer_count}`)

    console.log('\n✅ User roles fixed successfully!')
    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

fixUserRoles()
