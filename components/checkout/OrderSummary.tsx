'use client'

import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'

interface OrderSummaryProps {
  onSubmit?: (e: React.FormEvent) => void
  isSubmitting?: boolean
}

export default function OrderSummary({ onSubmit, isSubmitting = false }: OrderSummaryProps) {
  const { items: cartItems, total } = useCart()
  const { formatPrice } = usePreferences()

  // Use only actual cart items
  const displayItems = cartItems.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    icon: item.product.icon || 'code',
    license: item.license === 'extended' ? 'Extended License' : 'Standard License',
    price: item.price,
    quantity: item.quantity,
  }))

  const shipping = 0 // Free shipping
  const tax = 0
  const orderTotal = total + shipping + tax

  const handleClick = (e: React.MouseEvent) => {
    if (onSubmit) {
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="sticky top-32 bg-charcoal rounded-2xl border border-border-dark p-8 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
        <Icon name="shopping-bag" size={24} className="text-primary" />
        Order Summary
      </h2>

      {/* Order Items */}
      <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="cart" size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Your cart is empty</p>
          </div>
        ) : (
          displayItems.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-background-dark border border-border-dark overflow-hidden shrink-0 flex items-center justify-center">
                <Icon name={item.icon} size={24} className="text-slate-500" />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white text-sm">{item.name}</h3>
                  <span className="font-bold text-white">{formatPrice(item.price * item.quantity)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                  {item.license}
                </div>
                <div className="text-[10px] text-slate-600 mt-2">Qty: {item.quantity}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Totals */}
      <div className="space-y-4 pt-8 border-t border-border-dark">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="text-white font-medium">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Shipping</span>
          <span className="text-primary font-medium">Free</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Tax</span>
          <span className="text-white font-medium">{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-border-dark">
          <span className="text-lg font-bold text-white">Total</span>
          <span className="text-2xl font-black text-white">{formatPrice(orderTotal)}</span>
        </div>
      </div>

      {/* Continue Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="w-full bg-primary text-black font-extrabold py-5 rounded-xl mt-8 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Processing...' : 'Next: Payment'}
        {!isSubmitting && (
          <Icon name="arrow-right" size={20} className="group-hover:translate-x-1 transition-transform" />
        )}
      </button>

      {/* Trust Badge */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="bg-background-dark/50 border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <Icon name="verified" size={20} className="text-primary" />
          <div className="text-[10px] leading-tight">
            <div className="text-white font-bold uppercase tracking-widest mb-0.5">
              Buyer Protection
            </div>
            <div className="text-slate-500">
              Your transaction is secured with end-to-end encryption.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
