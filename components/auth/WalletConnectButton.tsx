'use client'

import { useState, useCallback, useEffect } from 'react'
import { BrowserProvider } from 'ethers'
import Icon from '@/components/ui/Icon'
import { authApi } from '@/lib/api'

interface WalletConnectButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  mode?: 'login' | 'link'
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export default function WalletConnectButton({
  onSuccess,
  onError,
  mode = 'login'
}: WalletConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'connect' | 'sign'>('connect')
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [hasWallet, setHasWallet] = useState(true) // Default to true to avoid hydration mismatch

  // Set mounted state and check wallet availability
  useEffect(() => {
    setHasMounted(true)
    setHasWallet(!!window.ethereum)
  }, [])

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[]
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0])
            setIsConnected(true)
          }
        } catch {
          // Ignore errors
        }
      }
    }
    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accts = accounts as string[]
        if (accts && accts.length > 0) {
          setAddress(accts[0])
          setIsConnected(true)
        } else {
          setAddress(null)
          setIsConnected(false)
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const handleAuth = useCallback(async (walletAddress: string) => {
    if (!window.ethereum) {
      onError?.('No wallet detected')
      return
    }

    setIsLoading(true)
    setStep('sign')

    try {
      // Get nonce from server
      const nonceResult = await authApi.getWalletNonce(walletAddress)
      if (!nonceResult.success || !nonceResult.data) {
        throw new Error(nonceResult.error || 'Failed to get nonce')
      }

      const { nonce, message } = nonceResult.data

      // Sign the message using ethers
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)

      // Authenticate with the server
      let result
      if (mode === 'link') {
        result = await authApi.linkWallet(walletAddress, signature, nonce)
      } else {
        result = await authApi.walletAuth(walletAddress, signature, nonce)
      }

      if (result.success) {
        onSuccess?.()
      } else {
        throw new Error(result.error || 'Authentication failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
      onError?.(errorMessage)
      setStep('connect')
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError, mode])

  const handleConnect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      onError?.('Please install MetaMask or another Web3 wallet')
      return
    }

    setIsLoading(true)
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0]
        setAddress(connectedAddress)
        setIsConnected(true)
        // Auto-proceed to authentication
        await handleAuth(connectedAddress)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'
      onError?.(errorMessage)
      setIsLoading(false)
    }
  }

  const handleClick = () => {
    if (isConnected && address) {
      handleAuth(address)
    } else {
      handleConnect()
    }
  }

  const handleDisconnect = () => {
    setAddress(null)
    setIsConnected(false)
    setStep('connect')
  }

  // Determine button text - only show "Install MetaMask" after client mount
  const getButtonText = () => {
    if (isLoading) {
      return step === 'connect' ? 'Connecting...' : 'Signing...'
    }
    if (hasMounted && !hasWallet) {
      return 'Install MetaMask'
    }
    return mode === 'link' ? 'Link Wallet' : 'Wallet'
  }

  return (
    <div className="w-full space-y-2">
      <button
        onClick={handleClick}
        disabled={isLoading || (hasMounted && !hasWallet)}
        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Icon name="loading" size={20} className="animate-spin" />
        ) : (
          <Icon name="wallet" size={20} className="text-white" />
        )}
        <span className="font-medium text-sm">{getButtonText()}</span>
      </button>

      {isConnected && address && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="truncate max-w-[180px]">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={handleDisconnect}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
