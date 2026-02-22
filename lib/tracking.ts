// Tracking utility for Facebook Pixel and Google Analytics 4
// Events fire to both platforms when their scripts are loaded

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return

  // Facebook Pixel
  if (window.fbq) {
    window.fbq('track', eventName, params)
  }

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', eventName, params)
  }
}

export function trackViewContent(product: { id: string; name: string; price: number; category?: string }) {
  trackEvent('ViewContent', {
    content_name: product.name,
    content_ids: [product.id],
    content_type: 'product',
    value: product.price,
    currency: 'USD',
  })

  // GA4 uses different event name
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      items: [{ item_id: product.id, item_name: product.name, price: product.price, item_category: product.category }],
      value: product.price,
      currency: 'USD',
    })
  }
}

export function trackAddToCart(product: { id: string; name: string; price: number }, quantity: number, value: number) {
  trackEvent('AddToCart', {
    content_name: product.name,
    content_ids: [product.id],
    content_type: 'product',
    value,
    currency: 'USD',
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity }],
      value,
      currency: 'USD',
    })
  }
}

export function trackInitiateCheckout(value: number, numItems: number) {
  trackEvent('InitiateCheckout', {
    value,
    currency: 'USD',
    num_items: numItems,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      value,
      currency: 'USD',
    })
  }
}

export function trackPurchase(orderId: string, value: number, items: { id: string; name: string; price: number; quantity: number }[]) {
  trackEvent('Purchase', {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    value,
    currency: 'USD',
    num_items: items.length,
  })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value,
      currency: 'USD',
      items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
    })
  }
}
