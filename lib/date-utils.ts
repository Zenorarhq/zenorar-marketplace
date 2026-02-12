// Centralized date formatting utilities with timezone support.
// When timezone is undefined or 'auto', the browser's default timezone is used.

function withTimezone(
  options: Intl.DateTimeFormatOptions,
  timezone?: string
): Intl.DateTimeFormatOptions {
  if (timezone && timezone !== 'auto') {
    return { ...options, timeZone: timezone }
  }
  return options
}

/** "3m ago", "2h ago", "5d ago", or "Jan 5" for older dates */
export function formatTimeAgo(dateString: string, timezone?: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString('en-US', withTimezone({ month: 'short', day: 'numeric' }, timezone))
}

/** "Monday, January 5, 2025, 3:45 PM" */
export function formatFullDate(dateString: string, timezone?: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', withTimezone({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }, timezone))
}

/** "Jan 5, 2025, 3:45 PM" */
export function formatDate(dateString: string, timezone?: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', withTimezone({
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }, timezone))
}

/** "Jan 5, 2025" (date only, no time) */
export function formatDateShort(dateString: string, timezone?: string): string {
  return new Date(dateString).toLocaleDateString('en-US', withTimezone({
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }, timezone))
}

/** "3:45 PM" (time only) */
export function formatTime(date: Date, timezone?: string): string {
  return date.toLocaleTimeString('en-US', withTimezone({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }, timezone))
}
