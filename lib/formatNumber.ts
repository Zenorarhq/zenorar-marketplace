/**
 * Format large numbers with K, M, B suffixes
 * Examples:
 * 1000 → 1K
 * 1500 → 1.5K
 * 1000000 → 1M
 * 1500000 → 1.5M
 * 1000000000 → 1B
 */
export function formatNumber(num: number, decimals: number = 1): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(decimals).replace(/\.0$/, '') + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals).replace(/\.0$/, '') + 'K'
  }
  return num.toString()
}

/**
 * Format currency with K, M, B suffixes
 * Examples:
 * 1000 → $1K
 * 1500.50 → $1.5K
 * 1000000 → $1M
 */
export function formatCurrency(num: number, decimals: number = 1): string {
  return '$' + formatNumber(num, decimals)
}
