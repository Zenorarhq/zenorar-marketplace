'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'

interface PaymentInfo {
  method: string
  crypto?: string
  txHash?: string
  amount?: string
  usdAmount?: number
  walletAddress?: string
  orderId?: string
  orderNumber?: string
}

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  const txHashParam = searchParams.get('txHash')
  const orderNumberParam = searchParams.get('orderNumber')

  useEffect(() => {
    const storedPayment = sessionStorage.getItem('checkoutPayment')
    if (storedPayment) {
      setPaymentInfo(JSON.parse(storedPayment))
    }
  }, [])

  const orderNumber = orderNumberParam || paymentInfo?.orderNumber || `ZEN-${Date.now().toString(36).toUpperCase()}`
  const txHash = txHashParam || paymentInfo?.txHash

  const getExplorerUrl = (network: string, hash: string) => {
    switch (network?.toUpperCase()) {
      case 'ETH':
        return `https://etherscan.io/tx/${hash}`
      case 'BNB':
        return `https://bscscan.com/tx/${hash}`
      case 'MATIC':
        return `https://polygonscan.com/tx/${hash}`
      default:
        return `https://etherscan.io/tx/${hash}`
    }
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 pb-24 w-full">
        <div className="max-w-2xl mx-auto py-16 text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8">
            <Icon name="check" size={48} className="text-primary" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-extrabold text-white mb-4">
            Order Confirmed!
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Thank you for your purchase. Your order has been successfully processed.
          </p>

          {/* Order Number */}
          <div className="bg-charcoal border border-border-dark rounded-xl p-6 mb-8">
            <p className="text-slate-500 text-sm mb-2">Order Number</p>
            <p className="text-2xl font-bold text-white font-mono">{orderNumber}</p>
          </div>

          {/* Crypto Transaction Info */}
          {txHash && paymentInfo?.method === 'wallet' && (
            <div className="bg-charcoal border border-primary/30 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Icon name="wallet" size={20} className="text-primary" />
                <p className="text-primary font-bold">Crypto Payment Confirmed</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Network:</span>
                  <span className="text-white font-medium">{paymentInfo.crypto}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Amount:</span>
                  <span className="text-white font-medium">
                    {paymentInfo.amount} {paymentInfo.crypto}
                    <span className="text-slate-500 ml-1">(${paymentInfo.usdAmount?.toFixed(2)})</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-border-dark mt-2">
                  <span className="text-slate-500 text-xs">Transaction Hash:</span>
                  <a
                    href={getExplorerUrl(paymentInfo.crypto || 'ETH', txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-mono hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-surface-dark border border-border-dark rounded-xl p-8 mb-8 text-left">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2">
              <Icon name="info" size={20} className="text-primary" />
              What happens next?
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Confirmation Email</p>
                  <p className="text-slate-500 text-sm">
                    You&apos;ll receive an email with your order details and download links.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Access Your Products</p>
                  <p className="text-slate-500 text-sm">
                    Visit your library to download your purchased products anytime.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Get Support</p>
                  <p className="text-slate-500 text-sm">
                    Need help? Our support team is available 24/7 to assist you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/profile/library"
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl hover:brightness-105 transition-all inline-flex items-center justify-center gap-2"
            >
              <Icon name="download" size={20} />
              Go to My Library
            </Link>
            <Link
              href="/profile/orders"
              className="bg-surface-dark border border-border-dark text-white font-bold px-8 py-4 rounded-xl hover:border-primary/50 transition-all inline-flex items-center justify-center gap-2"
            >
              <Icon name="file" size={20} />
              View Order Details
            </Link>
          </div>

          {/* Continue Shopping */}
          <Link
            href="/scripts"
            className="inline-flex items-center gap-2 text-primary font-bold mt-8 hover:underline"
          >
            Continue Shopping
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
