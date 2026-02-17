'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import StarRating from '@/components/ui/StarRating'
import { getAccessToken } from '@/lib/api/client'

interface Review {
  id: string
  rating: number
  title: string | null
  content: string | null
  author: string
  isVerified: boolean
  adminReply: string | null
  adminReplyAt: string | null
  createdAt: string
}

interface ProductReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

export default function ProductReviewsModal({ isOpen, onClose, productId, productName }: ProductReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  useEffect(() => {
    if (isOpen) loadReviews()
  }, [isOpen, productId])

  async function loadReviews() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/product/${productId}`)
      const data = await res.json()
      if (data.success) setReviews(data.data)
    } catch {}
    setLoading(false)
  }

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return
    setReplyLoading(true)
    const token = getAccessToken()
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reply: replyText.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, adminReply: replyText.trim(), adminReplyAt: new Date().toISOString() } : r))
        setReplyingTo(null)
        setReplyText('')
      }
    } catch {}
    setReplyLoading(false)
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return
    const token = getAccessToken()
    const res = await fetch(`/api/reviews/${reviewId}/reject`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await res.json()
    if (data.success) {
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
          <div>
            <h2 className="text-lg font-bold text-white">Reviews</h2>
            <p className="text-slate-500 text-sm">{productName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="star" size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No reviews yet for this product.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border border-[#1f1f1f] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{review.author}</span>
                        {review.isVerified && (
                          <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <span className="text-slate-600 text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {review.title && (
                    <p className="text-white text-sm font-medium mb-1">{review.title}</p>
                  )}
                  {review.content && (
                    <p className="text-slate-400 text-sm">{review.content}</p>
                  )}

                  {/* Existing Admin Reply */}
                  {review.adminReply && (
                    <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30 p-2 bg-primary/5 rounded-r">
                      <p className="text-xs text-primary font-bold mb-1">Your Reply</p>
                      <p className="text-sm text-slate-400">{review.adminReply}</p>
                    </div>
                  )}

                  {/* Admin Actions */}
                  <div className="flex gap-2 mt-3">
                    {!review.adminReply && (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText('') }}
                        className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <Icon name="chat" size={14} />
                        Reply
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Icon name="delete" size={14} />
                      Delete
                    </button>
                  </div>

                  {/* Reply Input */}
                  {replyingTo === review.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        rows={2}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(review.id)}
                          disabled={replyLoading || !replyText.trim()}
                          className="text-xs font-bold text-black bg-primary px-3 py-1.5 rounded-lg hover:brightness-105 transition-colors disabled:opacity-50"
                        >
                          {replyLoading ? 'Sending...' : 'Submit Reply'}
                        </button>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
