import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, TokenPayload } from './auth-utils'
import db from './db'

// Railway backend URL for auth verification (must be absolute for server-side use)
const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://api-production-8db8.up.railway.app/api'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Extract and verify Bearer token from request
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // First try local verification (for tokens created locally)
    const payload = verifyAccessToken(token)
    if (payload) {
      const userId = payload.userId || (payload as any).id
      if (userId) {
        // Verify user still exists in DB
        const client = await db.connect()
        try {
          const result = await client.query(
            'SELECT id, email, name, role, avatar FROM users WHERE id = $1',
            [userId]
          )
          if (result.rows.length > 0) {
            return result.rows[0]
          }
        } finally {
          client.release()
        }
      }
    }

    // Fallback: verify against Railway backend (for tokens created by Railway)
    try {
      const railwayRes = await fetch(`${RAILWAY_API}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (railwayRes.ok) {
        const data = await railwayRes.json()
        if (data.success && data.data?.user) {
          const user = data.data.user
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
          }
        }
      }
    } catch (railwayError) {
      console.error('Railway auth verification error:', railwayError)
    }

    return null
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

// Extract session ID from request (for guest users)
export function getSessionId(request: NextRequest): string | null {
  return request.headers.get('X-Session-ID')
}

// Middleware wrapper that requires authentication
export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      )
    }

    return handler(request, user)
  }
}

// Middleware wrapper that requires admin role
export function requireAdmin(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      )
    }

    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Forbidden',
          message: 'Admin access required'
        },
        { status: 403 }
      )
    }

    return handler(request, user)
  }
}

// Middleware wrapper for optional authentication
export function optionalAuth(
  handler: (request: NextRequest, user: AuthenticatedUser | null) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await authenticateRequest(request)
    return handler(request, user)
  }
}

// Helper to create success response
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data
    },
    { status }
  )
}

// Helper to create error response
export function errorResponse(error: string, status: number = 400, message?: string): NextResponse {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
      message: message || error
    },
    { status }
  )
}

// Helper to create paginated response
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  return NextResponse.json<PaginatedResponse<T>>(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    },
    { status: 200 }
  )
}

// Validate request body
export async function parseRequestBody<T = any>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json()
  } catch (error) {
    return null
  }
}

// Legacy verifyAuth helper used by library API routes
// Wraps authenticateRequest with the { valid, payload } interface
export async function verifyAuth(request: Request) {
  const nextReq = request as unknown as NextRequest
  const user = await authenticateRequest(nextReq)
  if (!user) {
    return { valid: false, payload: null }
  }
  return { valid: true, payload: { userId: user.id, email: user.email } }
}

// Validate required fields in request body
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}
