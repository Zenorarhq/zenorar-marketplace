import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get access token from cookie or localStorage (via header)
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Proxy to Express API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/backend'
    const backendUrl = apiUrl.startsWith('http') ? apiUrl : `http://localhost:4000`

    const response = await fetch(`${backendUrl}/orders/${params.id}/invoice`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate invoice' }))
      return NextResponse.json(errorData, { status: response.status })
    }

    // Get PDF buffer
    const pdfBuffer = await response.arrayBuffer()

    // Get order number from filename header if available
    const contentDisposition = response.headers.get('content-disposition')
    const filename = contentDisposition ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') : `invoice-${params.id}.pdf`

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('[Invoice Download] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
