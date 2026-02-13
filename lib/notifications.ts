import { randomUUID } from 'crypto'
import { executeQuery } from './db-helpers'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  const id = randomUUID()
  await executeQuery(
    `INSERT INTO notifications (id, "userId", type, title, message, metadata) VALUES ($1, $2, $3::"NotificationType", $4, $5, $6::jsonb)`,
    [id, userId, type, title, message, JSON.stringify(data || {})]
  )
}
