'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { BrowserProvider } from 'ethers'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login, logout, isAuthenticated, isLoading: authLoading, isStaff, refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const [isGoogleFailed, setIsGoogleFailed] = useState(false)
  const [isWalletLoading, setIsWalletLoading] = useState(false)

  // 2FA state
  const [twoFaRequired, setTwoFaRequired] = useState(false)
  const [twoFaTempToken, setTwoFaTempToken] = useState('')
  const [twoFaMethod, setTwoFaMethod] = useState('')
  const [twoFaCode, setTwoFaCode] = useState('')

  const currentYear = new Date().getFullYear()

  // Fetch branding settings for logo
  const { data: brandingData, isLoading: brandingLoading } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const res = await apiFetch<any>('/settings/public')
      return res.success ? res.data : null
    },
    staleTime: 5 * 60 * 1000,
  })

  const siteLogo = brandingData?.logoUrl || null

  // Helper function to get redirect URL
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
      if (savedRedirect) {
        sessionStorage.removeItem('redirectAfterLogin')
        return savedRedirect
      }
    }
    return '/'
  }

  // Redirect if already authenticated (non-staff only)
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isStaff) {
      // Only redirect non-staff authenticated users
      router.push(getRedirectUrl())
    }
  }, [isAuthenticated, authLoading, isStaff, router])

  // Check when Google script is ready
  useEffect(() => {
    const checkGoogleReady = () => {
      // Check if google object exists on window
      const win = window as typeof window & { google?: { accounts?: { id?: unknown } } }
      if (win.google?.accounts?.id) {
        setIsGoogleReady(true)
        setIsGoogleFailed(false)
        return true
      }
      return false
    }

    // Check immediately
    if (checkGoogleReady()) return

    // Also check periodically in case script is still loading
    const interval = setInterval(() => {
      if (checkGoogleReady()) {
        clearInterval(interval)
      }
    }, 500)

    // Mark as failed after 8 seconds if still not loaded
    const failTimeout = setTimeout(() => {
      clearInterval(interval)
      if (!checkGoogleReady()) {
        setIsGoogleFailed(true)
        setIsGoogleReady(true) // Stop showing loading state
      }
    }, 8000)

    return () => {
      clearInterval(interval)
      clearTimeout(failTimeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        if (result.user?.isStaff) {
          // Auto-redirect admin users to admin dashboard
          router.push('/admin')
          return
        }
        router.push(getRedirectUrl())
      } else if (result.requiresTwoFactor) {
        setTwoFaRequired(true)
        setTwoFaTempToken(result.tempToken || '')
        setTwoFaMethod(result.method || 'TOTP')
        setTwoFaCode('')
      } else {
        setError(result.error || 'Invalid email or password. Please try again.')
      }
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await authApi.verify2fa(twoFaTempToken, twoFaCode)
      if (result.success && result.data) {
        if (result.data.user?.isStaff) {
          // Auto-redirect admin users to admin dashboard
          router.push('/admin')
          return
        }
        refreshUser()
        router.push(getRedirectUrl())
      } else {
        setError(result.error || 'Invalid verification code')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Google Login - using GoogleLogin component callback
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsGoogleLoading(true)
    setError('')
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google')
      }
      // Send the ID token (credential) to our backend
      const result = await authApi.googleAuth(credentialResponse.credential)
      if (result.success) {
        if (result.data?.user?.isStaff) {
          // Auto-redirect admin users to admin dashboard
          router.push('/admin')
          return
        }
        refreshUser()
        router.push(getRedirectUrl())
      } else {
        setError(result.error || 'Failed to authenticate with Google')
      }
    } catch (err) {
      console.error('Google auth error:', err)
      setError('Failed to authenticate with Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    console.error('Google OAuth error')
    setIsGoogleFailed(true)
    setError('Google sign-in failed. Please try again or use another method.')
  }

  // Retry loading Google Sign-In
  const retryGoogleLoad = () => {
    setIsGoogleFailed(false)
    setIsGoogleReady(false)

    // Try to reload the Google script
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.remove()
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => {
        const win = window as typeof window & { google?: { accounts?: { id?: unknown } } }
        if (win.google?.accounts?.id) {
          setIsGoogleReady(true)
          setIsGoogleFailed(false)
        } else {
          setIsGoogleFailed(true)
          setIsGoogleReady(true)
        }
      }, 1000)
    }
    script.onerror = () => {
      setIsGoogleFailed(true)
      setIsGoogleReady(true)
    }
    document.head.appendChild(script)
  }

  // Wallet Login
  const handleWalletLogin = async () => {
    setError('')

    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet')
      return
    }

    setIsWalletLoading(true)
    try {
      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found. Please connect your wallet.')
      }

      const walletAddress = accounts[0]
      console.log('Wallet connected:', walletAddress)

      // Get nonce from server
      const nonceResult = await authApi.getWalletNonce(walletAddress)
      if (!nonceResult.success || !nonceResult.data) {
        console.error('Nonce error:', nonceResult)
        throw new Error(nonceResult.error || 'Failed to get authentication nonce from server')
      }

      const { nonce, message } = nonceResult.data
      console.log('Nonce received, requesting signature...')

      // Sign the message
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)
      console.log('Message signed successfully')

      // Authenticate with the server
      const result = await authApi.walletAuth(walletAddress, signature, nonce)
      if (result.success) {
        if (result.data?.user?.isStaff) {
          // Auto-redirect admin users to admin dashboard
          router.push('/admin')
          return
        }
        console.log('Wallet authentication successful')
        refreshUser()
        router.push(getRedirectUrl())
      } else {
        console.error('Auth failed:', result)
        throw new Error(result.error || 'Authentication failed. Please try again.')
      }
    } catch (err: unknown) {
      console.error('Wallet auth error:', err)
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          setError('Wallet connection was cancelled.')
        } else {
          setError(err.message)
        }
      } else if (typeof err === 'object' && err !== null && 'code' in err) {
        // Handle MetaMask RPC errors
        const rpcError = err as { code: number; message: string }
        if (rpcError.code === -32603 && rpcError.message?.includes('No active wallet')) {
          setError('No wallet account found. Please open MetaMask and create or import a wallet first.')
        } else if (rpcError.code === 4001) {
          setError('Wallet connection was cancelled.')
        } else {
          setError(rpcError.message || 'Wallet authentication failed. Please try again.')
        }
      } else {
        setError('Wallet authentication failed. Please try again.')
      }
    } finally {
      setIsWalletLoading(false)
    }
  }

  return (
    <div className="bg-surface-dark text-slate-100 min-h-screen flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex w-1/2 bg-black relative flex-col justify-between overflow-hidden">
        {/* Circuit Pattern */}
        <div className="absolute inset-0 circuit-pattern pointer-events-none" />

        {/* Background Image */}
        <Image
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9zmjTWwkSIvRt_r_zJS1pESJGySilOPv_BT2beUj4tLs8wRpIY4iW-nRJQd6OJ8IyrG8LJqg9QEkdv8fJxxqkZb3a4HFt31h8q2F8BZ_LANkp-OfbK4graOrsBsDt_4oxxO7ZJEVt4-OJfGKJHbHLxrqO1cHeksGSqsL_JhUaq-tsTCFwj0P98Zm3q6YSDwAFYy54t87GRKruTCmcWfOsij78_GYuyfu2OUsm_iReGEX1oCqxRIOveP0rQio4MOzBF7sB7e-m2OTF"
          alt="Cyber tech background"
          fill
          className="object-cover opacity-30 mix-blend-luminosity"
        />

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

        {/* Green Glow */}
        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-12 h-full flex flex-col">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 font-bold text-2xl tracking-tight text-white">
            {siteLogo ? (
              <img src={siteLogo} alt="Site Logo" className="h-10 w-auto object-contain" />
            ) : !brandingLoading ? (
              <>
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black">
                  <Icon name="grid-view" size={24} />
                </div>
                Marketplace
              </>
            ) : null}
          </Link>

          {/* Hero Content */}
          <div className="flex-grow flex items-center">
            <div className="max-w-xl">
              <h1 className="text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
                Join the future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-600">
                  digital assets.
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
                Access premium scripts, instant eSIM connectivity, and essential developer tools. Power your digital world today.
              </p>

              {/* Stats */}
              <div className="flex items-center gap-8 border-t border-white/10 pt-8">
                <div>
                  <p className="text-3xl font-bold text-white">10k+</p>
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mt-1">Creators</p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div>
                  <p className="text-3xl font-bold text-white">50k+</p>
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mt-1">Assets</p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div>
                  <p className="text-3xl font-bold text-white">4.9</p>
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mt-1">Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-slate-600 text-sm">
            &copy; {currentYear} Marketplace Inc.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-surface-dark relative flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[440px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              {siteLogo ? (
                <img src={siteLogo} alt="Site Logo" className="h-8 w-auto object-contain" />
              ) : !brandingLoading ? (
                <>
                  <Icon name="grid-view" size={24} />
                  Marketplace
                </>
              ) : null}
            </Link>
          </div>

          {/* Tab Switch */}
          <div className="bg-background-dark p-1.5 rounded-2xl grid grid-cols-2 gap-1 mb-10 border border-border-dark">
            <button
              type="button"
              className="py-3 rounded-xl text-sm font-bold bg-[#262626] text-white shadow-lg ring-1 ring-white/5 transition-all"
              aria-current="page"
            >
              Login
            </button>
            <Link href="/signup" className="py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors text-center">
              Sign Up
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 2FA Verification Step */}
          {twoFaRequired ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Icon name="lock" size={28} className="text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Verification Required</h2>
                <p className="text-slate-400">
                  {twoFaMethod === 'SMS'
                    ? 'Enter the 6-digit code sent to your phone.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>

              <form onSubmit={handle2faVerify} className="space-y-5">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-4 px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-3xl tracking-[0.5em] font-mono placeholder:text-slate-600 placeholder:tracking-[0.5em]"
                />
                <p className="text-slate-500 text-xs text-center">You can also use a backup code</p>

                <button
                  type="submit"
                  disabled={twoFaCode.length < 6 || isLoading}
                  className="w-full bg-primary hover:bg-[#3bc26d] text-black font-bold text-lg py-4 rounded-2xl shadow-glow-green hover:shadow-glow-green-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>

                <button
                  type="button"
                  onClick={() => { setTwoFaRequired(false); setTwoFaCode(''); setError('') }}
                  className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors"
                >
                  Back to login
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Welcome Text */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">Welcome back</h2>
                <p className="text-slate-400">Enter your details to access your account</p>
              </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center justify-center bg-surface-light border border-border-dark rounded-2xl transition-all overflow-hidden min-h-[52px]">
              {isGoogleLoading ? (
                <div className="flex items-center justify-center gap-3 py-3.5 w-full">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                    <path d="M12.24 24.0008C15.4765 24.0008 18.2058 22.9382 20.19 21.1039L16.323 18.1056C15.2424 18.8375 13.8643 19.252 12.2435 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                    <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                    <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                  </svg>
                  <span className="font-medium text-sm text-white">Signing in...</span>
                </div>
              ) : !isGoogleReady ? (
                <div className="flex items-center justify-center gap-3 py-3.5 w-full">
                  <Icon name="loading" size={20} className="animate-spin text-slate-400" />
                  <span className="font-medium text-sm text-slate-400">Loading...</span>
                </div>
              ) : isGoogleFailed ? (
                <button
                  type="button"
                  onClick={retryGoogleLoad}
                  className="flex items-center justify-center gap-2 py-3.5 w-full hover:bg-[#222] transition-colors"
                >
                  <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                    <path d="M12.24 24.0008C15.4765 24.0008 18.2058 22.9382 20.19 21.1039L16.323 18.1056C15.2424 18.8375 13.8643 19.252 12.2435 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                    <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                    <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                  </svg>
                  <span className="font-medium text-xs text-slate-400">Retry Google</span>
                </button>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  type="standard"
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  shape="pill"
                  width="200"
                />
              )}
            </div>
            
            <button
              type="button"
              onClick={handleWalletLogin}
              disabled={isWalletLoading}
              className="flex items-center justify-center gap-3 bg-surface-light hover:bg-[#222] border border-border-dark hover:border-slate-600 text-white py-3.5 rounded-2xl transition-all group disabled:opacity-50"
            >
              {isWalletLoading ? (
                <Icon name="loading" size={20} className="animate-spin" />
              ) : (
                <Icon name="wallet" size={20} className="text-white group-hover:text-primary transition-colors" />
              )}
              <span className="font-medium text-sm">Wallet</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-dark" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface-dark text-slate-500">Or login with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <label htmlFor="email" className="sr-only">Email Address</label>
              <Icon name="mail" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                autoComplete="email"
                className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium"
              />
            </div>

            <div className="relative group">
              <label htmlFor="password" className="sr-only">Password</label>
              <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <Icon name={showPassword ? 'eye' : 'visibility-off'} size={20} />
              </button>
            </div>

            <div className="flex justify-end mt-1">
              <Link href="/forgot-password" className="text-sm text-slate-400 hover:text-white transition-colors">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-[#3bc26d] text-black font-bold text-lg py-4 rounded-2xl shadow-glow-green hover:shadow-glow-green-lg transition-all transform hover:-translate-y-0.5 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-green-400 font-bold hover:underline transition-all">
              Sign Up
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
