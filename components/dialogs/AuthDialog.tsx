'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { BrowserProvider } from 'ethers'
import { authApi } from '@/lib/api'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultTab?: 'login' | 'signup'
}

export default function AuthDialog({ isOpen, onClose, onSuccess, defaultTab = 'login' }: AuthDialogProps) {
  const { login, register, refreshUser } = useAuth()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Signup form state
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Shared state
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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
      setError('')
      setTwoFaRequired(false)
      setTwoFaCode('')
    } else {
      // Reset forms when closed
      setLoginEmail('')
      setLoginPassword('')
      setSignupData({ fullName: '', email: '', password: '', confirmPassword: '' })
      setAgreedToTerms(false)
    }
  }, [isOpen, defaultTab])

  // Check when Google script is ready
  useEffect(() => {
    if (!isOpen) return

    const checkGoogleReady = () => {
      const win = window as typeof window & { google?: { accounts?: { id?: unknown } } }
      if (win.google?.accounts?.id) {
        setIsGoogleReady(true)
        setIsGoogleFailed(false)
        return true
      }
      return false
    }

    if (checkGoogleReady()) return

    const interval = setInterval(() => {
      if (checkGoogleReady()) {
        clearInterval(interval)
      }
    }, 500)

    const failTimeout = setTimeout(() => {
      clearInterval(interval)
      if (!checkGoogleReady()) {
        setIsGoogleFailed(true)
        setIsGoogleReady(true)
      }
    }, 8000)

    return () => {
      clearInterval(interval)
      clearTimeout(failTimeout)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleAuthSuccess = () => {
    onSuccess?.()
    onClose()
  }

  // Login handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(loginEmail, loginPassword)
      if (result.success) {
        handleAuthSuccess()
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
        refreshUser()
        handleAuthSuccess()
      } else {
        setError(result.error || 'Invalid verification code')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Signup handlers
  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSignupData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    setIsLoading(true)

    try {
      const result = await register(signupData.email, signupData.password, signupData.fullName)
      if (result.success) {
        handleAuthSuccess()
      } else {
        setError(result.error || 'An error occurred. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Google auth
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsGoogleLoading(true)
    setError('')
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google')
      }
      const result = await authApi.googleAuth(credentialResponse.credential)
      if (result.success) {
        refreshUser()
        handleAuthSuccess()
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

  const retryGoogleLoad = () => {
    setIsGoogleFailed(false)
    setIsGoogleReady(false)

    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.remove()
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
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

  // Wallet auth
  const handleWalletLogin = async () => {
    setError('')

    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet')
      return
    }

    setIsWalletLoading(true)
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found. Please connect your wallet.')
      }

      const walletAddress = accounts[0]

      const nonceResult = await authApi.getWalletNonce(walletAddress)
      if (!nonceResult.success || !nonceResult.data) {
        throw new Error(nonceResult.error || 'Failed to get authentication nonce from server')
      }

      const { nonce, message } = nonceResult.data

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)

      const result = await authApi.walletAuth(walletAddress, signature, nonce)
      if (result.success) {
        refreshUser()
        handleAuthSuccess()
      } else {
        throw new Error(result.error || 'Authentication failed. Please try again.')
      }
    } catch (err: unknown) {
      console.error('Wallet auth error:', err)
      if (err instanceof Error) {
        if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          setError('Wallet connection was cancelled.')
        } else {
          setError(err.message)
        }
      } else if (typeof err === 'object' && err !== null && 'code' in err) {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-[440px] max-h-[90vh] bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar"
      >
        {/* Close button - positioned outside content area */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 bg-surface-light hover:bg-[#333] border border-border-dark text-slate-400 hover:text-white rounded-lg transition-all z-10"
          aria-label="Close"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="p-6 sm:p-8 mt-10">
          {/* 2FA Verification Step */}
          {twoFaRequired ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Icon name="lock" size={28} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Verification Required</h2>
                <p className="text-slate-400 text-sm">
                  {twoFaMethod === 'SMS'
                    ? 'Enter the 6-digit code sent to your phone.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

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
              {/* Tab Switch */}
              <div className="bg-background-dark p-1.5 rounded-2xl grid grid-cols-2 gap-1 mb-8 border border-border-dark">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError('') }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'login'
                      ? 'bg-[#262626] text-white shadow-lg ring-1 ring-white/5 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setError('') }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'signup'
                      ? 'bg-[#262626] text-white shadow-lg ring-1 ring-white/5 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Welcome Text */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {activeTab === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {activeTab === 'login'
                    ? 'Enter your details to access your account'
                    : 'Enter your details to get started'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="relative flex items-center justify-center bg-surface-light hover:bg-[#222] border border-border-dark hover:border-slate-600 rounded-2xl transition-all overflow-hidden h-[48px] px-6">
                  {isGoogleLoading ? (
                    <div className="flex items-center justify-center gap-2 w-full">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                        <path d="M12.24 24.0008C15.4765 24.0008 18.2058 22.9382 20.19 21.1039L16.323 18.1056C15.2424 18.8375 13.8643 19.252 12.2435 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                        <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                        <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                      </svg>
                      <span className="font-medium text-sm text-white">Signing in...</span>
                    </div>
                  ) : !isGoogleReady ? (
                    <div className="flex items-center justify-center gap-2 w-full">
                      <Icon name="loading" size={18} className="animate-spin text-slate-400" />
                      <span className="font-medium text-sm text-slate-400">Loading...</span>
                    </div>
                  ) : isGoogleFailed ? (
                    <button
                      type="button"
                      onClick={retryGoogleLoad}
                      className="flex items-center justify-center gap-2 w-full h-full hover:bg-[#222] transition-colors"
                    >
                      <svg className="w-5 h-5 opacity-50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                        <path d="M12.24 24.0008C15.4765 24.0008 18.2058 22.9382 20.19 21.1039L16.323 18.1056C15.2424 18.8375 13.8643 19.252 12.2435 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z" fill="#34A853" />
                        <path d="M5.50253 14.3003C5.00236 12.8099 5.00236 11.1961 5.50253 9.70575V6.61481H1.5166C-0.18551 10.0056 -0.18551 14.0004 1.5166 17.3912L5.50253 14.3003Z" fill="#FBBC05" />
                        <path d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50253 9.70575C6.45064 6.86173 9.10947 4.74966 12.24 4.74966Z" fill="#EA4335" />
                      </svg>
                      <span className="font-medium text-sm text-slate-400">Retry</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center scale-[0.85]">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        type="standard"
                        theme="filled_black"
                        size="medium"
                        text={activeTab === 'login' ? 'signin_with' : 'signup_with'}
                        shape="pill"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleWalletLogin}
                  disabled={isWalletLoading}
                  className="flex items-center justify-center gap-2 bg-surface-light hover:bg-[#222] border border-border-dark hover:border-slate-600 text-white h-[48px] rounded-2xl transition-all group disabled:opacity-50"
                >
                  {isWalletLoading ? (
                    <Icon name="loading" size={18} className="animate-spin" />
                  ) : (
                    <Icon name="wallet" size={18} className="text-white group-hover:text-primary transition-colors" />
                  )}
                  <span className="font-medium text-sm">Wallet</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-dark" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface-dark text-slate-500">
                    Or {activeTab === 'login' ? 'login' : 'sign up'} with email
                  </span>
                </div>
              </div>

              {/* Login Form */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="relative group">
                    <label htmlFor="auth-login-email" className="sr-only">Email Address</label>
                    <Icon name="mail" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email Address"
                      required
                      autoComplete="email"
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <label htmlFor="auth-login-password" className="sr-only">Password</label>
                    <Icon name="lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      required
                      autoComplete="current-password"
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      <Icon name={showLoginPassword ? 'eye' : 'visibility-off'} size={18} />
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      onClick={onClose}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-[#3bc26d] text-black font-bold text-base py-3.5 rounded-2xl shadow-glow-green hover:shadow-glow-green-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? 'Signing in...' : 'Login'}
                  </button>
                </form>
              )}

              {/* Signup Form */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="relative group">
                    <label htmlFor="auth-signup-name" className="sr-only">Full Name</label>
                    <Icon name="user" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-signup-name"
                      name="fullName"
                      type="text"
                      value={signupData.fullName}
                      onChange={handleSignupInputChange}
                      placeholder="Full Name"
                      required
                      autoComplete="name"
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <label htmlFor="auth-signup-email" className="sr-only">Email Address</label>
                    <Icon name="mail" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-signup-email"
                      name="email"
                      type="email"
                      value={signupData.email}
                      onChange={handleSignupInputChange}
                      placeholder="Email Address"
                      required
                      autoComplete="email"
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                  </div>

                  <div className="relative group">
                    <label htmlFor="auth-signup-password" className="sr-only">Password</label>
                    <Icon name="lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-signup-password"
                      name="password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupData.password}
                      onChange={handleSignupInputChange}
                      placeholder="Password"
                      required
                      autoComplete="new-password"
                      minLength={8}
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      <Icon name={showSignupPassword ? 'eye' : 'visibility-off'} size={18} />
                    </button>
                  </div>

                  <div className="relative group">
                    <label htmlFor="auth-signup-confirm" className="sr-only">Confirm Password</label>
                    <Icon name="lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-signup-confirm"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={signupData.confirmPassword}
                      onChange={handleSignupInputChange}
                      placeholder="Confirm Password"
                      required
                      autoComplete="new-password"
                      className="w-full bg-surface-light text-white border border-border-dark rounded-2xl py-3.5 pl-11 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 font-medium text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      <Icon name={showConfirmPassword ? 'eye' : 'visibility-off'} size={18} />
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="auth-terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                    />
                    <label htmlFor="auth-terms" className="text-xs text-slate-400">
                      I agree to the{' '}
                      <Link href="/terms" onClick={onClose} className="text-primary hover:underline">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" onClick={onClose} className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-[#3bc26d] text-black font-bold text-base py-3.5 rounded-2xl shadow-glow-green hover:shadow-glow-green-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              )}

              {/* Switch prompt */}
              <p className="mt-6 text-center text-sm text-slate-500">
                {activeTab === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signup'); setError('') }}
                      className="text-primary hover:text-green-400 font-bold hover:underline transition-all"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setActiveTab('login'); setError('') }}
                      className="text-primary hover:text-green-400 font-bold hover:underline transition-all"
                    >
                      Login
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
