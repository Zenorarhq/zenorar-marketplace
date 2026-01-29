'use client'

import Image from 'next/image'
import Link from 'next/link'

interface CartItem {
  id: string
  name: string
  image: string
  license: string
  price: number
  quantity: number
}

interface CartSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

// Mock cart items
const mockCartItems: CartItem[] = [
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

export default function CartSlideOver({ isOpen, onClose }: CartSlideOverProps) {
  const subtotal = mockCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Slide Over Panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-[450px] bg-background-dark z-[70] shadow-2xl flex flex-col border-l border-border-dark">
        {/* Header */}
        <div className="p-8 flex items-center justify-between border-b border-border-dark">
          <h2 className="text-2xl font-bold text-white">Your Cart ({mockCartItems.length})</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-8 space-y-4 no-scrollbar">
          {mockCartItems.map((item) => (
            <div
              key={item.id}
              className="bg-charcoal border border-border-dark rounded-2xl p-4 flex gap-4"
            >
              {/* Item Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Item Details */}
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm">{item.name}</h3>
                  <button className="text-slate-600 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 mb-3">{item.license}</div>

                <div className="flex justify-between items-center">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 bg-background-dark rounded-lg p-1 border border-border-dark">
                    <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white">
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span className="text-xs font-bold text-white">{item.quantity}</span>
                    <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>

                  <span className="font-bold text-white">${item.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border-dark bg-background-dark sticky bottom-0">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-medium">Subtotal</span>
            <span className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</span>
          </div>

          <Link
            href="/checkout"
            className="w-full bg-primary text-black font-extrabold py-5 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
          >
            Checkout Now
            <span className="material-symbols-outlined font-bold">arrow_forward</span>
          </Link>

          <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-widest">
            Taxes calculated at checkout
          </p>
        </div>
      </aside>
    </>
  )
}
