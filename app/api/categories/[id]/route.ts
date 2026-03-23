import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await executeQuery(
      `SELECT * FROM categories WHERE id = $1`,
      [params.id]
    )
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Category get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load category' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, image, icon, parentId } = body

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 })
    }

    const result = await executeQuery(`
      UPDATE categories
      SET name = $1, slug = $2, description = $3, image = $4, icon = $5,
          "parentId" = $6, "updatedAt" = NOW()
      WHERE id = $7
      RETURNING *
    `, [name.trim(), slug.trim(), description || null, image || null, icon || 'code', parentId || null, params.id])

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A category with this slug already exists' }, { status: 409 })
    }
    console.error('Category update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await executeQuery(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [params.id]
    )

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete category' }, { status: 500 })
  }
}
