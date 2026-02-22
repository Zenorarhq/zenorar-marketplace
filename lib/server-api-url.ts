/**
 * Get the API URL for server-side fetch calls.
 * NEXT_PUBLIC_API_URL may be relative (e.g., '/backend') which fails server-side.
 * This resolves to an absolute Railway URL using NEXT_PUBLIC_SOCKET_URL.
 */
export function getServerApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (url && url.startsWith('http')) return url
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
  if (socketUrl) return `${socketUrl}/api`
  return 'http://localhost:4000/api'
}
