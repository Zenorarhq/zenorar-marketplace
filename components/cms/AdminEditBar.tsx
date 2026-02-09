'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface AdminEditBarProps {
  pageId: string
  pageTitle: string
  pageSlug: string
  pageStatus: string
}

export default function AdminEditBar({ pageId, pageTitle, pageSlug, pageStatus }: AdminEditBarProps) {
  const { user, isAuthenticated } = useAuth()

  // Only show for authenticated admin/editor users
  if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#1a1a1a] border border-[#2a2a2a] rounded-full shadow-2xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-4">
      {/* Status Badge */}
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium hidden sm:inline-flex items-center gap-1 ${
          pageStatus === 'PUBLISHED'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${pageStatus === 'PUBLISHED' ? 'bg-green-400' : 'bg-yellow-400'}`} />
        {pageStatus}
      </span>

      {/* Page Title */}
      <span className="text-white text-xs sm:text-sm font-medium max-w-[120px] sm:max-w-[200px] truncate">
        {pageTitle}
      </span>

      {/* Divider */}
      <div className="w-px h-4 bg-[#2a2a2a]" />

      {/* Edit Button */}
      <Link
        href={`/admin/frontend/${pageId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-black rounded-full text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Icon name="edit" size={14} />
        <span className="hidden sm:inline">Edit Page</span>
        <span className="sm:hidden">Edit</span>
      </Link>

      {/* Preview Button */}
      <Link
        href={`/admin/frontend/${pageId}/preview`}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        title="Preview Mode"
      >
        <Icon name="visibility" size={16} />
      </Link>

      {/* Dashboard Link */}
      <Link
        href="/admin/frontend"
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        title="Back to Dashboard"
      >
        <Icon name="grid-view" size={16} />
      </Link>
    </div>
  )
}
