// Load environment variables FIRST before any imports
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

// Now import the rest
import { Pool } from 'pg'

async function setupTestVirtualNumber() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🔧 Setting up test virtual number...\n')

    // Step 1: Find user ID
    console.log('1. Finding user ID for zenorarhq@proton.me...')
    const userResult = await pool.query(`
      SELECT id, email, role FROM users WHERE email = 'zenorarhq@proton.me'
    `)

    if (userResult.rows.length === 0) {
      console.log('   ❌ User not found!')
      await pool.end()
      process.exit(1)
    }

    const userId = userResult.rows[0].id
    console.log(`   ✅ Found user: ${userResult.rows[0].email} (ID: ${userId})`)

    // Step 2: Check for existing test virtual number
    console.log('\n2. Checking for existing virtual numbers...')
    const existingResult = await pool.query(`
      SELECT id, phone_number, status FROM user_virtual_numbers WHERE user_id = $1
    `, [userId])

    if (existingResult.rows.length > 0) {
      console.log(`   ℹ️  User already has ${existingResult.rows.length} virtual number(s):`)
      existingResult.rows.forEach((row: any) => {
        console.log(`      - ${row.phone_number} (${row.status}) - ID: ${row.id}`)
      })
      console.log('\n   Use one of these IDs for testing.')
      await pool.end()
      process.exit(0)
    }

    // Step 3: Check if plan and country exist
    console.log('\n3. Checking virtual number plans and countries...')

    const planResult = await pool.query(`
      SELECT id, name, slug FROM virtual_number_plans LIMIT 5
    `)
    console.log('   Available plans:')
    planResult.rows.forEach((row: any) => {
      console.log(`      - ${row.name} (${row.slug}) - ID: ${row.id}`)
    })

    const countryResult = await pool.query(`
      SELECT id, name, iso_code FROM virtual_number_countries WHERE iso_code = 'US' LIMIT 1
    `)

    if (planResult.rows.length === 0 || countryResult.rows.length === 0) {
      console.log('   ❌ No plans or countries found. Need to seed virtual number data first.')
      await pool.end()
      process.exit(1)
    }

    const planId = planResult.rows[0].id
    const countryId = countryResult.rows[0].id

    // Step 4: Create test virtual number
    console.log('\n4. Creating test virtual number...')
    const insertResult = await pool.query(`
      INSERT INTO user_virtual_numbers (
        user_id,
        plan_id,
        country_id,
        phone_number,
        phone_number_display,
        number_type,
        provider,
        provider_number_sid,
        status,
        expires_at,
        sms_forwarding_enabled
      ) VALUES (
        $1,
        $2,
        $3,
        '+15551234567',
        '(555) 123-4567',
        'local',
        'twilio',
        'TEST_PN_' || floor(random() * 1000000)::text,
        'active',
        NOW() + INTERVAL '30 days',
        true
      )
      RETURNING id, phone_number, phone_number_display, status
    `, [userId, planId, countryId])

    const newNumber = insertResult.rows[0]
    console.log(`   ✅ Created test virtual number:`)
    console.log(`      Phone: ${newNumber.phone_number_display} (${newNumber.phone_number})`)
    console.log(`      Status: ${newNumber.status}`)
    console.log(`      ID: ${newNumber.id}`)

    console.log('\n📋 Testing Instructions:')
    console.log('─'.repeat(50))
    console.log(`1. Go to /profile/library and click "Numbers" tab`)
    console.log(`2. You should see your virtual number listed`)
    console.log(`3. To test receiving SMS, open browser console and run:`)
    console.log('')
    console.log(`   fetch('/api/virtual-numbers/test-sms', {`)
    console.log(`     method: 'POST',`)
    console.log(`     headers: { 'Content-Type': 'application/json' },`)
    console.log(`     body: JSON.stringify({`)
    console.log(`       virtualNumberId: '${newNumber.id}',`)
    console.log(`       message: 'Hello from test!',`)
    console.log(`       fromNumber: '+15559876543'`)
    console.log(`     })`)
    console.log(`   })`)
    console.log('')
    console.log(`4. Click "Manage" on your number to see the inbox`)
    console.log('─'.repeat(50))

    console.log('\n✅ Setup complete!')
    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

setupTestVirtualNumber()
