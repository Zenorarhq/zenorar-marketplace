export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { inventoryService } from '@/lib/virtual-numbers/inventory'

/**
 * GET /api/virtual-numbers/available
 * Search available numbers - inventory first, then Twilio
 * Returns numbers with 'source' field: 'inventory' (instant) or 'twilio' (new)
 *
 * type param: 'local', 'toll-free', 'mobile', or undefined/null for ALL types
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('country')
    const type = searchParams.get('type') // undefined = all types
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'Country code is required' },
        { status: 400 }
      )
    }

    // Validate country is supported
    const countryResult = await query(
      `SELECT retail_monthly FROM virtual_number_countries WHERE iso_code = $1 AND is_active = true`,
      [countryCode]
    )

    if (countryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Country not supported' },
        { status: 404 }
      )
    }

    const baseRetailMonthly = parseFloat(countryResult.rows[0].retail_monthly) || 5.00

    let allNumbers: any[] = []

    if (!type) {
      // Fetch ALL types in parallel
      const types = ['local', 'toll-free', 'mobile'] as const
      const limitPerType = Math.ceil(limit / 3) + 5 // Get extra to ensure we have enough

      const results = await Promise.allSettled(
        types.map(t => inventoryService.getAvailableNumbers(countryCode, t, limitPerType))
      )

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const numberType = types[i]
        if (result.status === 'fulfilled') {
          // Add type to each number
          const numbersWithType = result.value.map(n => ({
            ...n,
            numberType: n.numberType || numberType
          }))
          allNumbers.push(...numbersWithType)
        }
      }
    } else {
      // Single type
      allNumbers = await inventoryService.getAvailableNumbers(countryCode, type, limit)
    }

    // Sort: inventory first, then by type (local, toll-free, mobile)
    const typeOrder = { local: 1, 'toll-free': 2, mobile: 3 }
    allNumbers.sort((a, b) => {
      // Inventory first
      if (a.source === 'inventory' && b.source !== 'inventory') return -1
      if (a.source !== 'inventory' && b.source === 'inventory') return 1
      // Then by type order
      const typeA = typeOrder[a.numberType as keyof typeof typeOrder] || 4
      const typeB = typeOrder[b.numberType as keyof typeof typeOrder] || 4
      return typeA - typeB
    })

    // Limit total results
    allNumbers = allNumbers.slice(0, limit)

    // Get the country ID for this country code
    const countryIdResult = await query(
      `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
      [countryCode]
    )
    const resolvedCountryId = countryIdResult.rows[0]?.id || null

    // Format for frontend
    const formattedNumbers = allNumbers.map(n => {
      const numberType = n.numberType || type || 'local'
      const retailMonthly = numberType === 'toll-free' ? baseRetailMonthly * 1.5
        : numberType === 'mobile' ? baseRetailMonthly * 1.2
        : baseRetailMonthly

      return {
        phoneNumber: n.phoneNumber,
        friendlyName: n.phoneNumberDisplay || n.phoneNumber,
        locality: n.locality,
        region: n.region,
        type: numberType,
        capabilities: {
          sms: n.smsEnabled,
          voice: n.voiceEnabled,
          mms: n.mmsEnabled
        },
        monthlyPrice: retailMonthly,
        source: n.source, // 'inventory' or 'twilio' or other provider
        countryId: n.countryId || resolvedCountryId, // Include countryId for checkout
        provider: n.provider || 'twilio' // Include provider for multi-provider support
      }
    })

    // Count inventory vs Twilio numbers for stats
    const inventoryCount = formattedNumbers.filter(n => n.source === 'inventory').length
    const twilioCount = formattedNumbers.filter(n => n.source === 'twilio').length

    return NextResponse.json({
      success: true,
      data: formattedNumbers,
      stats: {
        total: formattedNumbers.length,
        fromInventory: inventoryCount,
        fromTwilio: twilioCount
      },
      message: formattedNumbers.length === 0 ? 'No numbers available for this country/type' : undefined
    })
  } catch (error: any) {
    console.error('Error searching available numbers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search numbers' },
      { status: 500 }
    )
  }
}
