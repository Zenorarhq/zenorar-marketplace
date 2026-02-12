'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { mediaApi, MediaFile } from '@/lib/api/media'

interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (file: MediaFile) => void
  allowedTypes?: ('image' | 'video' | 'document')[]
  title?: string
}

type FilterType = 'all' | 'images' | 'videos' | 'documents'

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

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = ['image', 'video', 'document'],
  title = 'Select Media',
}: MediaPickerModalProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])

  // Fetch media files
  const { data: mediaFiles = [], isLoading } = useQuery({
    queryKey: ['media-files', activeFilter, searchQuery],
    queryFn: async () => {
      const filters: any = {}
      if (activeFilter !== 'all') {
        filters.type = activeFilter.slice(0, -1) as 'image' | 'video' | 'document'
      }
      if (searchQuery) {
        filters.search = searchQuery
      }
      const result = await mediaApi.list(filters)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    enabled: isOpen && activeTab === 'library',
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
  }

  const handleUpload = async () => {
    for (const file of uploadingFiles) {
      const result = await uploadMutation.mutateAsync(file)
      if (result.success && result.data) {
        // Auto-select the uploaded file
        onSelect(result.data)
        onClose()
        return
      }
    }
    setUploadingFiles([])
    setActiveTab('library')
  }

  const handleSelect = (file: MediaFile) => {
    onSelect(file)
    onClose()
  }

  // Filter files by allowed types
  const filteredFiles = mediaFiles.filter((file) => {
    const fileType = getFileType(file.mimeType)
    return allowedTypes.includes(fileType)
  })

  if (!isOpen) return null

  const filterTabs: { id: FilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'folder' },
    { id: 'images', label: 'Images', icon: 'image' },
    { id: 'videos', label: 'Videos', icon: 'video' },
    { id: 'documents', label: 'Files', icon: 'file' },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-[#1f1f1f]">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'bg-primary text-black'
                : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
            }`}
          >
            <Icon name="folder" size={16} className="inline mr-2" />
            Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-primary text-black'
                : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
            }`}
          >
            <Icon name="upload" size={16} className="inline mr-2" />
            Upload New
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'library' ? (
            <>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Icon
                    name="search"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
              </div>

              {/* Files Grid */}
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading media files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                    <Icon name="image" size={32} className="text-slate-600" />
                  </div>
                  <h3 className="text-white font-medium mb-2">No files found</h3>
                  <p className="text-slate-500 text-sm">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Upload your first file to get started'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filteredFiles.map((file) => {
                    const fileType = getFileType(file.mimeType)
                    const isImage = fileType === 'image'

                    return (
                      <button
                        key={file.id}
                        onClick={() => handleSelect(file)}
                        className="bg-[#1a1a1a] border-2 border-[#2a2a2a] rounded-xl overflow-hidden hover:border-primary transition-all group text-left"
                      >
                        {/* Preview */}
                        <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center p-4 relative">
                          {isImage ? (
                            <img
                              src={file.url}
                              alt={file.alt || file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon
                              name={fileType === 'video' ? 'video' : 'file'}
                              size={32}
                              className="text-slate-700"
                            />
                          )}
                          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="check-circle" size={32} className="text-primary" />
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="p-2">
                          <h4
                            className="text-white text-xs font-medium truncate"
                            title={file.title || file.originalName}
                          >
                            {file.title || file.originalName}
                          </h4>
                          <p className="text-slate-500 text-xs">{formatFileSize(file.size)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            /* Upload Tab */
            <div className="max-w-2xl mx-auto">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                  <Icon name="upload" size={32} className="text-primary" />
                </div>
                <h3 className="text-white font-medium mb-2">Click to upload files</h3>
                <p className="text-slate-500 text-sm mb-4">or drag and drop files here</p>
                <p className="text-slate-600 text-xs">
                  {allowedTypes.includes('image') && 'Images, '}
                  {allowedTypes.includes('video') && 'Videos, '}
                  {allowedTypes.includes('document') && 'Documents '}
                  (Max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={
                    allowedTypes.includes('image')
                      ? 'image/*'
                      : allowedTypes.includes('video')
                        ? 'video/*'
                        : '*/*'
                  }
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {uploadingFiles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">Selected Files</h4>
                  <div className="space-y-2">
                    {uploadingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg"
                      >
                        <Icon name="file" size={20} className="text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{file.name}</p>
                          <p className="text-slate-500 text-xs">{formatFileSize(file.size)}</p>
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

                  <button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="w-full mt-4 py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Icon name="spinner" size={18} className="inline mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Icon name="upload" size={18} className="inline mr-2" />
                        Upload {uploadingFiles.length} {uploadingFiles.length === 1 ? 'File' : 'Files'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1f1f1f]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
