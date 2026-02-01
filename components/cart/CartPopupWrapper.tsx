'use client'

import { useCart } from '@/lib/cart-context'
import AddToCartPopup from './AddToCartPopup'

export default function CartPopupWrapper() {
  const { showPopup, popupProduct, popupPrice, hidePopup } = useCart()

  return (
    <AddToCartPopup
      isOpen={showPopup}
      onClose={hidePopup}
      product={popupProduct}
      price={popupPrice ?? undefined}
    />
  )
}
