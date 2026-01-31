'use client'

import Image from 'next/image'
import { useCart } from '@/lib/cart-context'

interface OrderSummaryProps {
  onSubmit?: (e: React.FormEvent) => void
  isSubmitting?: boolean
}

interface OrderItem {
  id: string
  name: string
  image: string
  license: string
  price: number
  quantity: number
}

const mockOrderItems: OrderItem[] = [
  {
    id: '1',
    name: 'Python Automation Suite',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvwgfYMEvcI_nX3811VEyCy34SMnKHy9dmdnqG3nSMOUjjKLHrwM1Buu7vIN4sHUv_IHj3lxtx8AuvVgtQJrjdBjilef-qD6NbH3AMwpj-xP3Cl3XD4r8kxRx3ZJzJe8Y-Z4MqVrZdrhg60-dWHm_iNTlUzZhPqmEvucOUsNN2Cqq1nlRE-lUiK6PR4GpN2-YM32iXvk86ERNf_KfTr8v3fkU0u395JRo_hw-hlhfenuygiypi5Pyn0V13zGizBFBqXGrkP8TTlHSx',
    license: 'Extended License',
    price: 120,
    quantity: 1,
  },
  {
    id: '2',
    name: 'Data Scraper Pro',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvO_4p2ZHk3KJpXIKRaPxhahZ8fC5c6Ep1ii4Ag9NPHSF4u8B6OJBKlF0EMkQW3Il7TPAKtOrqdr0OlIVWLuq5SuDvgsoVcsfWCJymRcNoBb8oUE9000jHw7R-B3x4w0SNKIw13OTBsqdGlmczJdoxZG_UEcPQpD3LrcXm18n_8OeNvRRLso7wqgvc9ALsjpM_MKRWmbsgLQZZtV38rJHQ1o5PF5WkGoxK71hhBJwZEEViuOP3LTPKt6BjJrwTTY2GFme74AvcnfYK',
    license: 'Standard License',
    price: 29,
    quantity: 1,
  },
]

export default function OrderSummary({ onSubmit, isSubmitting = false }: OrderSummaryProps) {
  const { items: cartItems } = useCart()

  // Use cart items if available, otherwise fall back to mock data
  const displayItems = cartItems.length > 0
    ? cartItems.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        image: item.product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvwgfYMEvcI_nX3811VEyCy34SMnKHy9dmdnqG3nSMOUjjKLHrwM1Buu7vIN4sHUv_IHj3lxtx8AuvVgtQJrjdBjilef-qD6NbH3AMwpj-xP3Cl3XD4r8kxRx3ZJzJe8Y-Z4MqVrZdrhg60-dWHm_iNTlUzZhPqmEvucOUsNN2Cqq1nlRE-lUiK6PR4GpN2-YM32iXvk86ERNf_KfTr8v3fkU0u395JRo_hw-hlhfenuygiypi5Pyn0V13zGizBFBqXGrkP8TTlHSx',
        license: item.license === 'extended' ? 'Extended License' : 'Standard License',
        price: item.price,
        quantity: item.quantity,
      }))
    : mockOrderItems

  const subtotal = displayItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 0 // Free shipping
  const tax = 0
  const total = subtotal + shipping + tax

  const handleClick = (e: React.MouseEvent) => {
    if (onSubmit) {
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="sticky top-32 bg-charcoal rounded-2xl border border-border-dark p-8 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">shopping_bag</span>
        Order Summary
      </h2>

      {/* Order Items */}
      <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
        {displayItems.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-background-dark border border-border-dark overflow-hidden shrink-0">
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-sm">{item.name}</h3>
                <span className="font-bold text-white">${item.price}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                {item.license}
              </div>
              <div className="text-[10px] text-slate-600 mt-2">Qty: {item.quantity}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Totals */}
      <div className="space-y-4 pt-8 border-t border-border-dark">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Subtotal</span>
          <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Shipping</span>
          <span className="text-primary font-medium">Free</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">Tax</span>
          <span className="text-white font-medium">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-border-dark">
          <span className="text-lg font-bold text-white">Total</span>
          <span className="text-2xl font-black text-white">${total.toFixed(2)}</span>
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
          <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform" aria-hidden="true">
            arrow_forward
          </span>
        )}
      </button>

      {/* Trust Badge */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="bg-background-dark/50 border border-border-dark p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">verified_user</span>
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
