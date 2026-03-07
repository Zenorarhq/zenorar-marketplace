'use client'

import { useState, useRef } from 'react'
import Icon from '@/components/ui/Icon'
import { mediaApi } from '@/lib/api/media'
import MediaPickerModal from '@/components/admin/MediaPickerModal'

interface ImageFieldProps {
  name: string
  value: string
  schema: { title?: string }
  onChange: (value: string) => void
}

export default function ImageField({ name, value, schema, onChange }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const result = await mediaApi.upload(file)
      if (result.success && result.data) {
        onChange(result.data.url)
      } else {
        setError(result.error || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2 capitalize">
        {schema.title || name.replace(/([A-Z])/g, ' $1').trim()}
      </label>

      {/* Image Preview */}
      {value && (
        <div className="relative mb-2 rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 rounded-md transition-colors"
            title="Remove image"
          >
            <Icon name="close" size={14} className="text-white" />
          </button>
        </div>
      )}

      {/* Upload + Browse Library + URL Input */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-slate-300 hover:bg-[#222] hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {uploading ? (
            <>
              <Icon name="loading" size={14} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Icon name="upload" size={14} />
              Upload
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-slate-300 hover:bg-[#222] hover:text-white transition-colors flex-shrink-0"
        >
          <Icon name="folder" size={14} />
          Library
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}

      {/* Media Library Modal */}
      <MediaPickerModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(file) => onChange(file.url)}
        allowedTypes={['image']}
        title="Select Image"
      />
    </div>
  )
}