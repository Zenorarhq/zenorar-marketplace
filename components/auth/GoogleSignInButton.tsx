'use client'

import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { authApi } from '@/lib/api'

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      onError?.('No credential received from Google')
      return
    }

    try {
      const result = await authApi.googleAuth(credentialResponse.credential)
      if (result.success) {
        onSuccess?.()
      } else {
        onError?.(result.error || 'Failed to authenticate with Google')
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const handleError = () => {
    onError?.('Google sign-in failed')
  }

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        theme="filled_black"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  )
}
