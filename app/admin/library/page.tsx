'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'
import { mediaApi, MediaFile } from '@/lib/api/media'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDateShort } from '@/lib/date-utils'

type UploadType = 'all' | 'images' | 'documents' | 'videos'

interface Upload {
  id: string
  name: string
  title: string
  alt: string
  url: string
  type: 'image' | 'document' | 'video'
  size: string
  uploadedBy: string
  uploadedAt: string
}

const filterTabs: { id: UploadType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Files', icon: 'folder' },
  { id: 'images', label: 'Images', icon: 'image' },
  { id: 'documents', label: 'Documents', icon: 'file' },
  { id: 'videos', label: 'Videos', icon: 'video' },
]

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

// Helper function to get file type from mimeType
function getFileType(mimeType: string | null | undefined): 'image' | 'document' | 'video' {
  if (!mimeType) return 'document'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

export default function AdminLibraryPage() {
  const queryClient = useQueryClient()
  const tz = useTimezone()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<UploadType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUpload, setEditingUpload] = useState<MediaFile | null>(null)
  const [editForm, setEditForm] = useState({ title: '', alt: '', description: '' })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([])
  const [previewingUpload, setPreviewingUpload] = React.useState<MediaFile | null>(null)

  // Fetch media files
  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media-files', activeFilter, searchQuery, currentPage],
    queryFn: async () => {
      const filters: any = { page: currentPage, limit: 50 }
      if (activeFilter !== 'all') {
        // Convert plural lowercase to singular uppercase (images -> IMAGE)
        const typeMap: Record<string, string> = {
          'images': 'IMAGE',
          'videos': 'VIDEO',
          'documents': 'DOCUMENT'
        }
        filters.type = typeMap[activeFilter]
      }
      if (searchQuery) {
        filters.search = searchQuery
      }
      const result = await mediaApi.list(filters)
      if (result.success && result.data) {
        return { files: result.data, pagination: result.pagination }
      }
      return { files: [], pagination: undefined }
    },
  })
  const mediaFiles = mediaData?.files ?? []
  const pagination = mediaData?.pagination

  // Fetch media stats
  const { data: stats = null } = useQuery({
    queryKey: ['media-stats'],
    queryFn: async () => {
      const result = await mediaApi.getStats()
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; alt?: string; description?: string } }) =>
      mediaApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      setEditingUpload(null)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      queryClient.invalidateQueries({ queryKey: ['media-stats'] })
    },
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      queryClient.invalidateQueries({ queryKey: ['media-stats'] })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadingFiles(files)
    setShowUploadModal(true)
  }

  const handleUpload = async () => {
    for (const file of uploadingFiles) {
      await uploadMutation.mutateAsync(file)
    }
    setUploadingFiles([])
    setShowUploadModal(false)
  }

  const handleEditClick = (file: MediaFile) => {
    setEditingUpload(file)
    setEditForm({
      title: file.name || '',
      alt: file.alt || '',
      description: file.description || '',
    })
  }

  const handleSaveEdit = async () => {
    if (editingUpload) {
      await updateMutation.mutateAsync({
        id: editingUpload.id,
        data: {
          title: editForm.title,
          alt: editForm.alt,
          description: editForm.description,
        },
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  // Convert MediaFile to Upload format for rendering
  const uploads: Upload[] = mediaFiles.map((file) => ({
    id: file.id,
    name: file.name,
    title: file.title || file.name,
    alt: file.alt || '',
    url: file.url,
    type: file.type.toLowerCase() as 'image' | 'video' | 'document',
    size: formatFileSize(file.size),
    uploadedBy: file.uploadedBy?.name || 'Unknown',
    uploadedAt: formatDateShort(file.createdAt, tz),
  }))

  const filteredUploads = uploads

  return (
    <AdminLayout>
      <div className="max-w-full overflow-hidden">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">
              Upload Library
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Manage and organize your uploaded files and images
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="upload" size={18} />
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Stats Cards - Dashboard Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs lg:text-sm">Total Files</p>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="image" size={16} />
              </div>
            </div>
            <p className="text-white text-lg lg:text-2xl font-bold mb-1">
              {formatNumber(stats?.totalFiles || 0)}
            </p>
            <p className="text-xs">
              <span className="text-slate-500">in library</span>
            </p>
          </div>

          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs lg:text-sm">Storage Used</p>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Icon name="database" size={16} />
              </div>
            </div>
            <p className="text-white text-lg lg:text-2xl font-bold mb-1">
              {formatFileSize(stats?.totalSize || 0)}
            </p>
            <p className="text-xs">
              <span className="text-slate-500">of storage</span>
            </p>
          </div>

          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs lg:text-sm">Images</p>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Icon name="image" size={16} />
              </div>
            </div>
            <p className="text-white text-lg lg:text-2xl font-bold mb-1">
              {formatNumber(stats?.imageCount || 0)}
            </p>
            <p className="text-xs">
              <span className="text-purple-400">
                {stats?.totalFiles ? Math.round((stats.imageCount / stats.totalFiles) * 100) : 0}%
              </span>
              <span className="text-slate-500 ml-1">of files</span>
            </p>
          </div>

          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs lg:text-sm">Videos</p>
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Icon name="video" size={16} />
              </div>
            </div>
            <p className="text-white text-lg lg:text-2xl font-bold mb-1">
              {formatNumber(stats?.videoCount || 0)}
            </p>
            <p className="text-xs">
              <span className="text-slate-500">video files</span>
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-[#1f1f1f]">
            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveFilter(tab.id); setCurrentPage(1) }}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeFilter === tab.id
                      ? 'bg-primary text-black'
                      : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  <Icon name={tab.icon} size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full sm:w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Files Grid */}
          <div className="p-4">
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading media files...</p>
              </div>
            ) : filteredUploads.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                  <Icon name="image" size={32} className="text-slate-600" />
                </div>
                <h3 className="text-white font-medium mb-2">No files found</h3>
                <p className="text-slate-500 text-sm">
                  {searchQuery ? 'Try a different search term' : 'Upload your first file to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-10 gap-4">
                {filteredUploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-primary/50 transition-all group"
                  >
                    {/* Image Preview */}
                    <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                      {upload.type === 'image' ? (
                        <img
                          src={upload.url}
                          alt={upload.alt || upload.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon name={upload.type === 'video' ? 'video' : 'file'} size={48} className="text-slate-700" />
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => { const original = mediaFiles.find(f => f.id === upload.id); if (original) handleEditClick(original); }}
                          className="p-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"
                          title="Edit"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          onClick={() => setPreviewingUpload(upload as any)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="View"
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(upload.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Delete"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-3">
                      <h4 className="text-white text-sm font-medium truncate mb-1" title={upload.title}>
                        {upload.title}
                      </h4>
                      <p className="text-slate-500 text-xs truncate mb-2" title={upload.name}>
                        {upload.name}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{upload.size}</span>
                        <span className="text-slate-500 capitalize">{upload.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredUploads.length > 0 && pagination && (
            <div className="px-6 py-4 bg-charcoal border-t border-[#1f1f1f] flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold">{(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
                <span className="font-bold">{pagination.total}</span> files
              </p>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={currentPage <= 1}
                >
                  <Icon name="chevron-left" size={18} />
                </button>
                <span className="px-3 py-1 text-white text-xs font-bold">
                  {currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="p-2 rounded bg-charcoal border border-border-dark text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={currentPage >= pagination.totalPages}
                >
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
              <h3 className="text-white font-semibold text-lg">Edit Image Details</h3>
              <button
                onClick={() => setEditingUpload(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Preview */}
              <div className="aspect-video bg-[#0a0a0a] rounded-lg flex items-center justify-center overflow-hidden">
                {editingUpload.mimeType?.startsWith('image/') ? (
                  <img
                    src={editingUpload.url}
                    alt={editingUpload.alt || editingUpload.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Icon name={editingUpload.mimeType?.startsWith('video/') ? 'video' : 'file'} size={64} className="text-slate-700" />
                )}
              </div>

              {/* File Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">File Name</label>
                <input
                  type="text"
                  value={editingUpload.name}
                  disabled
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">File name cannot be changed</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Enter a descriptive title"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Alt Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Alt Text</label>
                <textarea
                  value={editForm.alt}
                  onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                  rows={2}
                  placeholder="Describe the image for accessibility and SEO"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                />
                <p className="text-xs text-slate-500">
                  Alt text helps with accessibility and SEO. Be descriptive and concise.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="Enter additional details about this file"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              {/* File Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Uploaded By</p>
                  <p className="text-white text-sm">{editingUpload.uploadedBy?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Upload Date</p>
                  <p className="text-white text-sm">
                    {formatDateShort(editingUpload.createdAt, tz)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">File Size</p>
                  <p className="text-white text-sm">{formatFileSize(editingUpload.size)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">MIME Type</p>
                  <p className="text-white text-sm">{editingUpload.mimeType}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-5 border-t border-[#1f1f1f]">
              <button
                onClick={() => navigator.clipboard.writeText(editingUpload.url)}
                className="mr-auto inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
              >
                <Icon name="copy" size={16} />
                Copy URL
              </button>
              <button
                onClick={() => setEditingUpload(null)}
                className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <Icon name="check" size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Lightbox Modal */}
      {previewingUpload && (
        <div
          onClick={() => setPreviewingUpload(null)}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        >
          <div className="relative max-w-7xl w-full max-h-[90vh] flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setPreviewingUpload(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors z-10"
            >
              <Icon name="x" size={24} />
            </button>

            {/* Image */}
            <img
              src={previewingUpload.url}
              alt={previewingUpload.alt || previewingUpload.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-white font-medium mb-1">
                {previewingUpload.title || previewingUpload.name}
              </h3>
              <p className="text-slate-300 text-sm">
                {previewingUpload.width} × {previewingUpload.height} • {formatFileSize(previewingUpload.size)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && uploadingFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl max-w-2xl w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
              <h3 className="text-white font-semibold text-lg">Upload Files</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingFiles([])
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3">
              <h4 className="text-white font-medium">Selected Files ({uploadingFiles.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                  >
                    <Icon name="file" size={20} className="text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.name}</p>
                      <p className="text-slate-500 text-xs">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setUploadingFiles(uploadingFiles.filter((_, i) => i !== index))
                      }
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1f1f1f]">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingFiles([])
                }}
                className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="upload" size={18} />
                    Upload {uploadingFiles.length} {uploadingFiles.length === 1 ? 'File' : 'Files'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
