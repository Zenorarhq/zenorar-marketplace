'use client'

import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'

export default function CartPage() {
  const { items, itemCount, total, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />
        <main className="flex-grow flex items-center justify-center px-8 py-24">
          <div className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 rounded-full bg-surface-dark flex items-center justify-center mx-auto mb-8">
              <Icon name="cart" size={64} className="text-slate-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
            <p className="text-slate-400 mb-8">
              Looks like you haven&apos;t added anything to your cart yet. Start browsing our products to find something you&apos;ll love.
            </p>
            <Link
              href="/products"
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl hover:brightness-105 transition-all inline-flex items-center gap-2"
            >
              <Icon name="compass" size={24} />
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24">
        <div className="py-4">
          <Breadcrumbs className="mb-0" />
        </div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2">Shopping Cart</h1>
            <p className="text-slate-400">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>
          </div>
          <button
            onClick={clearCart}
            className="text-slate-400 hover:text-red-400 text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Icon name="delete" size={18} />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.license}`}
                className="bg-surface-dark border border-border-dark rounded-2xl p-6 flex gap-6"
              >
                {/* Product Image */}
                <div className="w-24 h-24 bg-charcoal rounded-xl overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name={item.product.icon} size={30} className="text-slate-600" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="text-lg font-bold text-white hover:text-primary transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      aria-label="Remove item"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>

                  <div className="text-xs text-primary font-bold uppercase tracking-wider mb-4">
                    {item.license === 'extended' ? 'Extended License' : 'Standard License'}
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 bg-charcoal rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-dark transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Icon name="minus" size={18} />
                      </button>
                      <span className="w-8 text-center text-white font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-dark transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Icon name="plus" size={18} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-xl font-bold text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-charcoal border border-border-dark rounded-2xl p-8 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount</span>
                  <span className="text-primary font-medium">-$0.00</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="text-white font-medium">$0.00</span>
                </div>
              </div>

              <div className="border-t border-border-dark pt-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-extrabold text-white">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label htmlFor="promo" className="block text-sm font-bold text-slate-400 mb-2">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    type="text"
                    placeholder="Enter code"
                    className="flex-grow bg-background-dark border border-border-dark rounded-lg py-2 px-4 text-white placeholder:text-slate-500 focus:ring-primary focus:border-primary transition-all"
                  />
                  <button className="bg-surface-dark border border-border-dark text-white px-4 py-2 rounded-lg font-bold hover:border-primary transition-colors">
                    Apply
                  </button>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <Icon name="arrow-right" size={24} />
              </Link>

              <Link
                href="/products"
                className="block text-center text-primary text-sm font-bold mt-4 hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
