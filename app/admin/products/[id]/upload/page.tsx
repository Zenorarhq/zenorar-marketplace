'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import UploadProgressModal from '@/components/admin/UploadProgressModal'
import { downloadsApi, ProductFile } from '@/lib/api/downloads'
import Toast, { ToastState } from '@/components/ui/Toast'
import ConfirmModal, { ConfirmModalState } from '@/components/ui/ConfirmModal'

export default function UploadProductFilePage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  // File management state
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadStage, setUploadStage] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileVersion, setFileVersion] = useState('1.0.0')
  const [fileIsLatest, setFileIsLatest] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [uploadJobStatus, setUploadJobStatus] = useState<'processing' | 'complete' | 'failed'>('processing')
  const [uploadRawStage, setUploadRawStage] = useState('queued')
  const jobProcessedRef = useRef(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load existing files
  useEffect(() => {
    downloadsApi.adminListFiles(productId).then(res => {
      if (res.success && res.data) setProductFiles(res.data)
    }).finally(() => setLoadingFiles(false))
  }, [productId])

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const handleFileUpload = async () => {
    if (!selectedFile) return
    jobProcessedRef.current = false
    setUploadingFile(true)
    setUploadError(null)
    setUploadStage('Uploading...')
    setUploadRawStage('queued')
    setUploadJobStatus('processing')
    setShowUploadModal(true)

    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('version', fileVersion)
      form.append('isLatest', String(fileIsLatest))

      const res = await downloadsApi.adminUpload(productId, form)
      if (!res.success || !res.data?.jobId) {
        setUploadError(res.error || 'Upload failed. Please try again.')
        setUploadingFile(false)
        setUploadStage('')
        return
      }

      const jobId = res.data.jobId
      const stageLabels: Record<string, string> = {
        queued: 'Queued...',
        obfuscating: 'Obfuscating...',
        injecting: 'Injecting license gate...',
        uploading: 'Uploading to R2...',
        saving: 'Saving...',
      }

      const poll = setInterval(async () => {
        try {
          const statusRes = await downloadsApi.getJobStatus(jobId)
          if (!statusRes.success || !statusRes.data) return

          const { stage, status: jobStatus, result, error } = statusRes.data
          setUploadStage(stageLabels[stage] ?? 'Processing...')
          setUploadRawStage(stage)

          if (jobStatus === 'complete' && result && !jobProcessedRef.current) {
            jobProcessedRef.current = true
            clearInterval(poll)
            pollIntervalRef.current = null
            setProductFiles(prev => fileIsLatest
              ? [result, ...prev.map(f => ({ ...f, is_latest: false }))]
              : [...prev, result]
            )
            setUploadJobStatus('complete')
          } else if (jobStatus === 'failed' && !jobProcessedRef.current) {
            jobProcessedRef.current = true
            clearInterval(poll)
            pollIntervalRef.current = null
            setUploadError(error || 'Upload failed. Please try again.')
            setUploadJobStatus('failed')
          }
        } catch {
          // ignore transient poll errors
        }
      }, 3000)
      pollIntervalRef.current = poll
    } catch {
      setUploadError('Upload failed. Please try again.')
      setUploadJobStatus('failed')
      setUploadingFile(false)
      setUploadStage('')
    }
  }

  const handleCloseUploadModal = () => {
    setShowUploadModal(false)
    setUploadingFile(false)
    setUploadStage('')
    if (uploadJobStatus === 'complete') {
      setSelectedFile(null)
      setFileVersion('1.0.0')
    }
    setUploadError(null)
  }

  const handleCancelUpload = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    jobProcessedRef.current = true
    setShowUploadModal(false)
    setUploadingFile(false)
    setUploadStage('')
    setUploadError(null)
  }

  const handleDeleteFile = (fileId: string) => {
    setConfirmModal({
      title: 'Delete File',
      description: 'Permanently delete this file from storage?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true)
        setDeletingFileId(fileId)
        const res = await downloadsApi.adminDeleteFile(productId, fileId)
        setConfirmModal(null)
        setConfirmLoading(false)
        if (res.success) {
          setProductFiles(prev => prev.filter(f => f.id !== fileId))
        } else {
          setToast({ message: res.error || 'Failed to delete file', type: 'error' })
        }
        setDeletingFileId(null)
      }
    })
  }

  const handleSetLatest = async (fileId: string) => {
    await downloadsApi.adminSetLatest(productId, fileId)
    setProductFiles(prev => prev.map(f => ({ ...f, is_latest: f.id === fileId })))
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary text-sm mb-4">
            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</span>
            <span className="text-slate-500">Create Product</span>
            <Icon name="chevron-right" size={14} className="text-slate-600" />
            <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black text-xs font-bold">2</span>
            <span className="text-primary font-medium">Upload Files</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Upload Script Files</h1>
          <p className="text-slate-400 text-sm">Upload your script files to complete the product setup. Files are automatically protected with obfuscation and license gating.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-[#111] rounded-xl border border-[#2a2a2a] p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Downloadable Files</h2>
          <p className="text-slate-500 text-sm mb-5">Upload script files to Cloudflare R2 secure storage. Buyers receive time-limited download links.</p>

          {/* Upload area */}
          <div className="border border-dashed border-[#2a2a2a] rounded-lg p-5 mb-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-slate-300">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20"
                />
                {selectedFile && <p className="text-xs text-slate-500">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Version</label>
                <input
                  type="text"
                  value={fileVersion}
                  onChange={(e) => setFileVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-28 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input
                  id="isLatest"
                  type="checkbox"
                  checked={fileIsLatest}
                  onChange={(e) => setFileIsLatest(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="isLatest" className="text-sm text-slate-300">Mark as latest</label>
              </div>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={!selectedFile || uploadingFile}
                className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Icon name={uploadingFile ? 'loading' : 'upload'} size={14} className={uploadingFile ? 'animate-spin' : ''} />
                {uploadingFile ? (uploadStage || 'Processing...') : 'Upload to R2'}
              </button>
            </div>
            {uploadError && (
              <p className="text-red-400 text-sm mt-2">{uploadError}</p>
            )}
          </div>

          {/* Files list */}
          {loadingFiles ? (
            <div className="text-center py-8 text-slate-400">Loading files...</div>
          ) : productFiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-slate-500 text-left">
                    <th className="pb-2 font-medium">Filename</th>
                    <th className="pb-2 font-medium">Version</th>
                    <th className="pb-2 font-medium">Size</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Protection</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {productFiles.map(file => (
                    <Fragment key={file.id}>
                    <tr className="py-2">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <Icon name="file" size={14} className="text-slate-400 shrink-0" />
                          <span className="text-white truncate max-w-[180px]" title={file.file_name}>{file.file_name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-slate-300">{file.version || '—'}</td>
                      <td className="py-2 pr-4 text-slate-400">
                        {file.file_size ? (file.file_size / 1024 / 1024).toFixed(2) + ' MB' : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {file.is_latest
                          ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400">Latest</span>
                          : <span className="text-slate-600 text-xs">—</span>
                        }
                      </td>
                      <td className="py-2 pr-4">
                        {file.obfuscation_level
                          ? <button type="button" onClick={() => file.obfuscation_report && setExpandedReportId(expandedReportId === file.id ? null : file.id)} className={`px-2 py-0.5 rounded-full text-xs ${
                              file.obfuscation_level === 'HEAVY' ? 'bg-red-500/15 text-red-400' :
                              file.obfuscation_level === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                              'bg-blue-500/15 text-blue-400'
                            } ${file.obfuscation_report ? 'cursor-pointer hover:opacity-80' : ''}`}>{file.obfuscation_level}</button>
                          : <span className="text-slate-600 text-xs">—</span>
                        }
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          {!file.is_latest && (
                            <button type="button" onClick={() => handleSetLatest(file.id)} className="text-xs text-primary hover:underline">Set latest</button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingFileId === file.id}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                          >
                            {deletingFileId === file.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedReportId === file.id && file.obfuscation_report && (
                      <tr>
                        <td colSpan={6} className="py-2 px-4 bg-[#111]">
                          <div className="text-xs space-y-1">
                            <div className="text-slate-400 mb-1">Total files: <span className="text-white">{file.obfuscation_report.totalFiles}</span></div>
                            <div className="text-green-400">Obfuscated: {file.obfuscation_report.obfuscatedFiles}</div>
                            <div className="text-slate-500">Skipped: {file.obfuscation_report.skippedFiles}</div>
                            {(file.obfuscation_report.failedFiles ?? 0) > 0 && (
                              <div className="text-red-400">Failed: {file.obfuscation_report.failedFiles}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Icon name="upload" size={32} className="mx-auto mb-3 text-slate-600" />
              <p>No files uploaded yet. Select a file above to get started.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={() => router.push(`/admin/products/${productId}/edit`)}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Edit Product Details
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="px-6 py-2 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg transition-colors text-sm"
            >
              Skip for Now
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              disabled={productFiles.length === 0}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Icon name="check" size={16} />
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={showUploadModal}
        fileName={selectedFile?.name || ''}
        stage={uploadRawStage}
        status={uploadJobStatus}
        error={uploadError}
        onClose={handleCloseUploadModal}
        onCancel={handleCancelUpload}
      />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {confirmModal && <ConfirmModal modal={confirmModal} loading={confirmLoading} onClose={() => { setConfirmModal(null); setConfirmLoading(false) }} />}
    </AdminLayout>
  )
}
