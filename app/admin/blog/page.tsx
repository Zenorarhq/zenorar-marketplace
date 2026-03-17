'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { blogApi, BlogPostSummary } from '@/lib/api/blog'

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500/20 text-emerald-400',
  DRAFT: 'bg-yellow-500/20 text-yellow-400',
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
}

export default function AdminBlogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog', page, statusFilter, searchQuery],
    queryFn: () => blogApi.admin.list({ page, limit: 20, status: statusFilter || undefined, search: searchQuery || undefined }),
    staleTime: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.admin.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-blog'] }),
  })

  const posts = data?.data || []
  const pagination = data?.pagination

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Blog</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Create and manage blog posts</p>
          </div>
          <button
            onClick={() => router.push('/admin/blog/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon name="add" size={16} />
            New Post
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-dark">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Categories</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No blog posts found. Create your first post!
                    </td>
                  </tr>
                ) : (
                  posts.map((post: any) => (
                    <tr key={post.id} className="border-b border-border-dark hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {post.cover_image_url && (
                            <img src={post.cover_image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{post.title}</p>
                            <p className="text-slate-500 text-xs truncate">/blog/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm hidden md:table-cell">{post.author_name}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(post.categories || []).map((cat: any) => (
                            <span key={cat.id} className="px-2 py-0.5 bg-[#1a1a1a] text-slate-300 text-xs rounded">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || ''}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm hidden sm:table-cell">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                            title="Edit"
                          >
                            <Icon name="edit-02" size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this post?')) {
                                deleteMutation.mutate(post.id)
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-dark">
              <p className="text-slate-400 text-sm">
                Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
