import db from './db'
import { PoolClient, QueryResult } from 'pg'

// Execute a single query with error handling
export async function executeQuery<T extends Record<string, any> = any>(
  query: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const client = await db.connect()
  try {
    return await client.query<T>(query, params)
  } catch (error) {
    console.error('Query error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Execute multiple queries in a transaction
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Transaction error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Generate order number in format: ORD-YYYYMMDD-XXXXX
export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `ORD-${year}${month}${day}-${random}`
}

// Generate ticket number in format: TKT-XXXXXXXXXX
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `TKT-${timestamp}${random}`
}

// Generate URL-friendly slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Build pagination metadata
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}

// Build WHERE clause from filters
export function buildWhereClause(
  filters: Record<string, any>,
  startIndex: number = 1
): { clause: string; values: any[]; nextIndex: number } {
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = startIndex

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'search') {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
        values.push(`%${value}%`)
        paramIndex++
      } else if (Array.isArray(value)) {
        conditions.push(`${key} = ANY($${paramIndex})`)
        values.push(value)
        paramIndex++
      } else {
        conditions.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }
  })

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    nextIndex: paramIndex
  }
}

// Build ORDER BY clause
export function buildOrderByClause(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): string {
  if (!sortBy) return 'ORDER BY created_at DESC'

  const sanitizedSortBy = sortBy.replace(/[^a-zA-Z0-9_]/g, '')
  const sanitizedOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  return `ORDER BY ${sanitizedSortBy} ${sanitizedOrder}`
}

// Build LIMIT and OFFSET clause
export function buildPaginationClause(page: number = 1, limit: number = 20): {
  limit: number
  offset: number
  clause: string
} {
  const sanitizedLimit = Math.min(Math.max(1, limit), 100) // Max 100 per page
  const sanitizedPage = Math.max(1, page)
  const offset = (sanitizedPage - 1) * sanitizedLimit

  return {
    limit: sanitizedLimit,
    offset,
    clause: `LIMIT ${sanitizedLimit} OFFSET ${offset}`
  }
}

// Calculate cart summary
export interface CartSummary {
  subtotal: number
  itemCount: number
  uniqueItems: number
}

export function calculateCartSummary(items: Array<{ price: number; quantity: number }>): CartSummary {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const uniqueItems = items.length

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    itemCount,
    uniqueItems
  }
}

// Validate stock availability
export async function validateStock(productId: string, quantity: number): Promise<boolean> {
  const result = await executeQuery(
    'SELECT stock FROM products WHERE id = $1',
    [productId]
  )

  if (result.rows.length === 0) return false
  return result.rows[0].stock >= quantity
}

// Format price for display
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// ============================================================================
// Site Settings (shared Neon DB with Railway API)
// ============================================================================

// Get a single site setting by key
export async function getSiteSetting(key: string): Promise<any> {
  const result = await executeQuery(
    'SELECT value FROM site_settings WHERE key = $1',
    [key]
  )
  const value = result.rows[0]?.value ?? null
  if (value === null) return null
  // Parse JSON values - settings are stored as JSON strings
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// Get all settings in a group
export async function getSiteSettingsByGroup(group: string): Promise<Record<string, any>> {
  const result = await executeQuery(
    'SELECT key, value FROM site_settings WHERE "group" = $1',
    [group]
  )
  const settings: Record<string, any> = {}
  for (const row of result.rows) {
    // Parse JSON values - settings are stored as JSON strings
    let parsedValue = row.value
    try {
      parsedValue = JSON.parse(row.value)
    } catch {
      // Keep original value if not valid JSON
    }
    settings[row.key] = parsedValue
  }
  return settings
}

// ============================================================================
// Email Settings CRUD
// ============================================================================

export interface EmailProviderConfig {
  provider: 'smtp' | 'resend' | 'sendgrid'
  is_active: boolean
  config: Record<string, any>
}

// Get all email provider settings
export async function getEmailSettings(): Promise<EmailProviderConfig[]> {
  const result = await executeQuery<EmailProviderConfig>(
    'SELECT provider, is_active, config FROM email_settings ORDER BY provider'
  )
  return result.rows
}

// Get the currently active email provider
export async function getActiveEmailProvider(): Promise<EmailProviderConfig | null> {
  const result = await executeQuery<EmailProviderConfig>(
    'SELECT provider, config FROM email_settings WHERE is_active = true LIMIT 1'
  )
  return result.rows[0] || null
}

// Update email provider configuration
export async function updateEmailProvider(
  provider: 'smtp' | 'resend' | 'sendgrid',
  config: Record<string, any>,
  isActive: boolean
): Promise<void> {
  await executeTransaction(async (client) => {
    // If setting this provider as active, deactivate all others
    if (isActive) {
      await client.query('UPDATE email_settings SET is_active = false')
    }

    // Update the selected provider
    await client.query(
      'UPDATE email_settings SET config = $1, is_active = $2, updated_at = NOW() WHERE provider = $3',
      [JSON.stringify(config), isActive, provider]
    )
  })
}
