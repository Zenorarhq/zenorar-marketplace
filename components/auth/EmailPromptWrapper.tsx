'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import EmailPromptModal from '@/components/dialogs/EmailPromptModal'

/**
 * Wrapper component that shows email prompt modal for wallet users
 * who have auto-generated @wallet.local emails
 */
export default function EmailPromptWrapper() {
  const { user, updateUser, isLoading } = useAuth()
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [hasShownPrompt, setHasShownPrompt] = useState(false)

  // Check if user needs to add a real email
  useEffect(() => {
    // Skip if loading, no user, or already shown this session
    if (isLoading || !user || hasShownPrompt) return

    // Check if email is auto-generated wallet email
    const isWalletEmail = user.email?.endsWith('@wallet.local')

    // Check if we've already prompted this session (stored in sessionStorage)
    const alreadyPrompted = sessionStorage.getItem('emailPromptShown')

    if (isWalletEmail && !alreadyPrompted) {
      // Delay showing the prompt to let user see the page first
      const timer = setTimeout(() => {
        setShowEmailPrompt(true)
        setHasShownPrompt(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [user, isLoading, hasShownPrompt])

  const handleClose = () => {
    setShowEmailPrompt(false)
    // Mark as shown for this session (don't prompt again until new session)
    sessionStorage.setItem('emailPromptShown', 'true')
  }

  const handleSuccess = (email: string) => {
    // Update user state with new email
    updateUser({ email })
    setShowEmailPrompt(false)
    // Mark as shown
    sessionStorage.setItem('emailPromptShown', 'true')
  }

  return (
    <EmailPromptModal
      isOpen={showEmailPrompt}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  )
}
