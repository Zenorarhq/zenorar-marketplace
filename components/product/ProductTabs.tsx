'use client'

import { useState } from 'react'
import Image from 'next/image'
import Icon from '@/components/ui/Icon'
import { Product } from '@/lib/types'
import StarRating from '@/components/ui/StarRating'
import { useAuth } from '@/contexts/AuthContext'
import { getAccessToken } from '@/lib/api/client'

interface ProductTabsProps {
  product: Product
}

type TabId = 'overview' | 'specs' | 'reviews'

export default function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { isAuthenticated } = useAuth()
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewContent, setReviewContent] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleReviewSubmit() {
    if (!reviewRating) return
    setReviewSubmitting(true)
    setReviewMessage(null)
    try {
      const token = getAccessToken()
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productId: product.id, rating: reviewRating, title: reviewTitle || null, content: reviewContent || null }),
      })
      const data = await res.json()
      if (data.success) {
        setReviewMessage({ type: 'success', text: 'Review submitted successfully!' })
        setReviewRating(0)
        setReviewTitle('')
        setReviewContent('')
      } else {
        setReviewMessage({ type: 'error', text: data.error || 'Failed to submit review' })
      }
    } catch {
      setReviewMessage({ type: 'error', text: 'Failed to submit review' })
    } finally {
      setReviewSubmitting(false)
    }
  }

  const latestFile = product.files?.find(f => f.isLatest) || product.files?.[0]

  const formatFileSize = (bytes: string | null) => {
    if (!bytes) return null
    const num = Number(bytes)
    if (num < 1024) return `${num} B`
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
    return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Technical Specifications' },
    { id: 'reviews', label: 'Reviews' },
  ]

  return (
    <div className="bg-charcoal rounded-2xl border border-border-dark overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-border-dark px-4 lg:px-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 lg:px-6 lg:py-5 text-sm font-bold cursor-pointer border-b-2 transition-all hover:text-white flex-shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-slate-500 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* Product Description */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Product Overview</h2>
              <p className="text-slate-400 leading-relaxed text-sm">
                {product.description || 'The Python Automation Suite is a comprehensive collection of production-ready scripts designed to streamline your development workflow. From advanced web scraping and data processing to automated deployment and cloud management, this suite provides everything you need to build scalable, automated systems.'}
              </p>
            </div>

            {/* Product Demo */}
            {(product.images && product.images.length > 0) || product.demoInfo || product.demoUrl ? (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Product Demo</h2>

                {/* Screenshot Gallery - use all product images */}
                {product.images && product.images.length > 0 && (
                  <div className="overflow-x-auto no-scrollbar flex gap-4 pb-2">
                    {product.images.map((img, i) => (
                      <div
                        key={i}
                        className="min-w-[280px] md:min-w-[400px] h-[240px] rounded-xl border border-border-dark overflow-hidden bg-background-dark shrink-0"
                      >
                        <Image
                          src={img.url}
                          alt={`Screenshot ${i + 1}`}
                          width={400}
                          height={240}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Demo Info */}
                {product.demoInfo && (
                  <div className="bg-surface-dark/50 p-6 rounded-xl border border-border-dark">
                    <h4 className="text-white font-bold mb-2 text-sm">Demo Information</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {product.demoInfo}
                    </p>
                  </div>
                )}

                {/* Demo Link Button */}
                {product.demoUrl && (
                  <a
                    href={product.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-primary text-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-3 hover:brightness-105 transition-all text-sm uppercase tracking-wider"
                  >
                    Link to Demo
                    <Icon name="open-in-new" size={20} />
                  </a>
                )}
              </div>
            ) : null}

            {/* Key Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Key Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <Icon name={feature.icon} size={32} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{feature.title}</h4>
                        <p className="text-slate-500 text-xs">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version History */}
            {product.files && product.files.length > 1 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Version History</h2>
                <div className="space-y-3">
                  {product.files.slice(0, 5).map((file) => (
                    <div key={file.id} className="flex items-center justify-between py-2 border-b border-border-dark text-sm">
                      <div className="flex items-center gap-3">
                        <Icon name="code" size={16} className="text-primary" />
                        <span className="text-white font-medium">{file.version || 'v1.0'}</span>
                        {file.isLatest && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">LATEST</span>
                        )}
                      </div>
                      {file.createdAt && (
                        <span className="text-slate-500 text-xs">
                          {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Technical Specifications</h2>

            {/* File Details */}
            {latestFile && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Product Details</h3>
                <div className="space-y-4">
                  {latestFile.version && (
                    <div className="flex justify-between py-3 border-b border-border-dark text-sm">
                      <span className="text-slate-500">Current Version</span>
                      <span className="text-white font-medium">{latestFile.version}</span>
                    </div>
                  )}
                  {formatFileSize(latestFile.fileSize) && (
                    <div className="flex justify-between py-3 border-b border-border-dark text-sm">
                      <span className="text-slate-500">File Size</span>
                      <span className="text-white font-medium">{formatFileSize(latestFile.fileSize)}</span>
                    </div>
                  )}
                  {latestFile.fileType && (
                    <div className="flex justify-between py-3 border-b border-border-dark text-sm">
                      <span className="text-slate-500">File Type</span>
                      <span className="text-white font-medium uppercase">{latestFile.fileType}</span>
                    </div>
                  )}
                  {latestFile.createdAt && (
                    <div className="flex justify-between py-3 border-b border-border-dark text-sm">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="text-white font-medium">
                        {new Date(latestFile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.specs && product.specs.length > 0 ? (
              <div className="space-y-4">
                {product.specs.map((spec, index) => (
                  <div
                    key={index}
                    className="flex justify-between py-3 border-b border-border-dark text-sm"
                  >
                    <span className="text-slate-500">{spec.label}</span>
                    <span className="text-white font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : !latestFile ? (
              <p className="text-slate-500 text-sm">No specifications available yet.</p>
            ) : null}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
              <h2 className="text-xl font-bold text-white">User Reviews</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{product.rating.toFixed(1)}</span>
                <StarRating rating={product.rating} size="md" />
                <span className="text-slate-500 text-sm">({product.reviewCount} reviews)</span>
              </div>
            </div>

            {/* Reviews List */}
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-6 mb-8">
                {product.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border-dark pb-6">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-white text-sm">{review.author}</span>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    {review.content && (
                      <p className="text-slate-400 text-sm leading-relaxed">&quot;{review.content}&quot;</p>
                    )}
                    {review.adminReply && (
                      <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/30 bg-surface-dark/30 rounded-r-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">Store Reply</span>
                          {review.adminReplyAt && (
                            <span className="text-xs text-slate-600">{review.adminReplyAt}</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm">{review.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 mb-8">
                <Icon name="star" size={32} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No reviews yet. Be the first to review!</p>
              </div>
            )}

            {/* Write a Review Form */}
            <div className="border-t border-border-dark pt-8">
              <h3 className="text-lg font-bold text-white mb-4">Write a Review</h3>

              {!isAuthenticated ? (
                <p className="text-slate-500 text-sm">Please log in to write a review.</p>
              ) : (
                <div className="space-y-4">
                  {/* Star Selector */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Rating *</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          className="p-0.5"
                        >
                          <Icon
                            name="star"
                            size={24}
                            className={
                              (reviewHover || reviewRating) >= star
                                ? 'text-yellow-500'
                                : 'text-slate-600'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Title (optional)</label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Summarize your experience"
                      className="w-full bg-surface-dark border border-border-dark rounded-lg text-white text-sm px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-600"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Review</label>
                    <textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="Share your thoughts about this product..."
                      rows={3}
                      className="w-full bg-surface-dark border border-border-dark rounded-lg text-white text-sm px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-600"
                    />
                  </div>

                  {/* Message */}
                  {reviewMessage && (
                    <p className={`text-sm ${reviewMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {reviewMessage.text}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleReviewSubmit}
                    disabled={!reviewRating || reviewSubmitting}
                    className="bg-primary text-black font-bold py-3 px-6 rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
