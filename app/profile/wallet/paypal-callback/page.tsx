'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'

function PayPalCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState('')

  useEffect(() => {
    const capturePayment = async () => {
      const depositId = searchParams.get('depositId')
      const token = searchParams.get('token') // PayPal order ID

      if (!depositId || !token) {
        setStatus('error')
        setError('Missing payment information')
        return
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
        const response = await fetch(`${apiUrl}/deposits/paypal/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') && {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }),
          },
          body: JSON.stringify({ depositId, orderId: token }),
        })

        const result = await response.json()
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          queryClient.invalidateQueries({ queryKey: ['deposits'] })
          setStatus('success')
        } else {
          setStatus('error')
          setError(result.error || 'Failed to capture payment')
        }
      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'Something went wrong')
      }
    }

    capturePayment()
  }, [searchParams, queryClient])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-border-dark rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Icon name="loading" size={48} className="text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-slate-400">Please wait while we confirm your PayPal payment...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <Icon name="check-circle" size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400 mb-6">Your wallet has been credited.</p>
            <button
              onClick={() => router.push('/profile/wallet')}
              className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105"
            >
              Back to Wallet
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/profile/wallet')}
              className="px-6 py-3 bg-surface-dark text-white font-bold rounded-xl hover:bg-border-dark"
            >
              Back to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PayPalCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Icon name="loading" size={48} className="text-primary animate-spin" />
      </div>
    }>
      <PayPalCallbackContent />
    </Suspense>
  )
}
