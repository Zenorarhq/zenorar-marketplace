// Test Twilio Connection Endpoint
// GET /api/virtual-numbers/test-twilio

import { NextResponse } from 'next/server'
import { twilioService } from '@/lib/virtual-numbers/providers/twilio'

export async function GET() {
  try {
    // Test connection
    const connectionTest = await twilioService.testConnection()

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: connectionTest.error,
        message: 'Twilio credentials not configured or invalid'
      })
    }

    // Try to search for numbers
    const numbers = await twilioService.searchNumbers('US', 'local', undefined, 5)

    return NextResponse.json({
      success: true,
      configured: true,
      mode: connectionTest.mode,
      numbersFound: numbers.length,
      sampleNumbers: numbers.slice(0, 3).map(n => ({
        phoneNumber: n.phoneNumber,
        locality: n.locality,
        capabilities: n.capabilities
      })),
      message: numbers.length > 0
        ? `Found ${numbers.length} real Twilio numbers`
        : 'No numbers returned - check if your Twilio account has access to this country'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: error.message,
      message: 'Error connecting to Twilio'
    })
  }
}
