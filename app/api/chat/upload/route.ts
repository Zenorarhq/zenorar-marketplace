import { NextRequest, NextResponse } from 'next/server'

// POST /api/chat/upload — Upload file to Cloudinary for chat attachments
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName) {
      return NextResponse.json({ success: false, error: 'Cloudinary not configured' }, { status: 500 })
    }

    // Upload to Cloudinary
    const cloudFormData = new FormData()
    cloudFormData.append('file', file)
    cloudFormData.append('upload_preset', uploadPreset || 'ml_default')
    cloudFormData.append('folder', 'chat-attachments')

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: cloudFormData }
    )

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      console.error('Cloudinary upload error:', errorData)
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
    }

    const uploadResult = await uploadResponse.json()

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        name: file.name,
        type: file.type,
        size: file.size,
      },
    })
  } catch (error) {
    console.error('Chat upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 })
  }
}
