import Link from 'next/link'
import OrderSummary from '@/components/checkout/OrderSummary'

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background-dark">
      {/* Checkout Header */}
      <header className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-container mx-auto px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">grid_view</span>
            Marketplace
          </Link>

          {/* Checkout Steps */}
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
              {/* Step 1 - Active */}
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm">
                  1
                </span>
                <span className="text-primary font-bold text-sm tracking-wide">Shipping</span>
              </div>

              <div className="w-12 h-px bg-border-dark" />

              {/* Step 2 */}
              <div className="flex items-center gap-3 opacity-40">
                <span className="w-8 h-8 rounded-full bg-surface-dark text-slate-400 border border-border-dark flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <span className="text-slate-400 font-bold text-sm tracking-wide">Payment</span>
              </div>

              <div className="w-12 h-px bg-border-dark" />

              {/* Step 3 */}
              <div className="flex items-center gap-3 opacity-40">
                <span className="w-8 h-8 rounded-full bg-surface-dark text-slate-400 border border-border-dark flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <span className="text-slate-400 font-bold text-sm tracking-wide">Review</span>
              </div>
            </div>
          </div>

          {/* Exit Button */}
          <Link
            href="/"
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
            Exit
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-container mx-auto px-8 py-12">
        <div className="grid grid-cols-12 gap-16">
          {/* Left Column - Form */}
          <div className="col-span-12 lg:col-span-7">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                Shipping Details
              </h1>
              <p className="text-slate-500 mb-10">
                Please enter your delivery information to proceed with your order.
              </p>

              <form className="space-y-8">
                {/* Name & Email */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Shipping Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street address, apartment, suite"
                      className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all mb-4"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                      <input
                        type="text"
                        placeholder="State/Province"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Zip Code"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 px-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined">
                        call
                      </span>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-charcoal border-border-dark rounded-xl py-4 pl-14 pr-5 text-slate-200 placeholder:text-slate-600 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="pt-6 border-t border-border-dark">
                  <h3 className="text-white font-bold mb-4">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="relative flex items-center p-5 bg-charcoal border border-primary rounded-xl cursor-pointer">
                      <input
                        type="radio"
                        name="shipping"
                        defaultChecked
                        className="text-primary bg-background-dark border-border-dark focus:ring-primary w-5 h-5"
                      />
                      <div className="ml-4">
                        <div className="text-white font-bold text-sm">Standard Shipping</div>
                        <div className="text-slate-500 text-xs mt-0.5">3-5 business days</div>
                      </div>
                      <span className="ml-auto text-white font-bold text-sm">Free</span>
                    </label>

                    <label className="relative flex items-center p-5 bg-charcoal border border-border-dark rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="radio"
                        name="shipping"
                        className="text-primary bg-background-dark border-border-dark focus:ring-primary w-5 h-5"
                      />
                      <div className="ml-4">
                        <div className="text-white font-bold text-sm">Express Delivery</div>
                        <div className="text-slate-500 text-xs mt-0.5">1-2 business days</div>
                      </div>
                      <span className="ml-auto text-white font-bold text-sm">+$15.00</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="col-span-12 lg:col-span-5 relative">
            <OrderSummary />
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="mt-24 border-t border-border-dark py-12">
        <div className="max-w-container mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs">
          <div className="flex items-center gap-8">
            <p>&copy; 2024 Marketplace Inc.</p>
            <div className="flex gap-6 uppercase tracking-widest font-bold">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 grayscale opacity-50">
            <span className="material-symbols-outlined">payments</span>
            <span className="material-symbols-outlined">credit_card</span>
            <span className="material-symbols-outlined">account_balance</span>
            <span className="material-symbols-outlined">currency_bitcoin</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
