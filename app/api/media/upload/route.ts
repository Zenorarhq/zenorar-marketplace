import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { authenticateRequest } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Convert file to base64 data URI for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    // Generate signature for authenticated upload
    const timestamp = Math.floor(Date.now() / 1000)
    const folder = 'zenorar'
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex')

    // Upload to Cloudinary
    const uploadForm = new FormData()
    uploadForm.append('file', dataUri)
    uploadForm.append('api_key', apiKey)
    uploadForm.append('timestamp', timestamp.toString())
    uploadForm.append('signature', signature)
    uploadForm.append('folder', folder)

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: uploadForm }
    )

    if (!cloudinaryRes.ok) {
      const errText = await cloudinaryRes.text()
      console.error('Cloudinary upload error:', errText)
      return NextResponse.json(
        { success: false, error: 'Upload to Cloudinary failed' },
        { status: 500 }
      )
    }

    const cloudinaryData = await cloudinaryRes.json()

    // Return in MediaFile format expected by frontend
    return NextResponse.json({
      success: true,
      data: {
        id: cloudinaryData.asset_id || cloudinaryData.public_id,
        name: file.name,
        url: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        type: 'IMAGE',
        mimeType: file.type,
        size: cloudinaryData.bytes || file.size,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
