import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { esimProvisioningService } from '@/lib/esim'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const esimId = params.id

    // Get user's eSIM
    const esim = await esimProvisioningService.getUserEsim(esimId, userId)

    if (!esim) {
      return NextResponse.json(
        { success: false, error: 'eSIM not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: esim })
  } catch (error: any) {
    console.error('Error fetching user eSIM:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch eSIM' },
      { status: 500 }
    )
  }
}
