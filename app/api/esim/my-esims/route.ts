export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { esimProvisioningService } from '@/lib/esim'

export async function GET(request: Request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId

    // Get user's eSIMs
    const esims = await esimProvisioningService.getUserEsims(userId)

    return NextResponse.json({ success: true, data: esims })
  } catch (error: any) {
    console.error('Error fetching user eSIMs:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch eSIMs' },
      { status: 500 }
    )
  }
}
