'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to library with cards tab
export default function ProfileCardsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile/library?tab=cards')
  }, [router])

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
