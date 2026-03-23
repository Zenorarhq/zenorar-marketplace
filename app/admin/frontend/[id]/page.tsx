'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import PropertiesPanel from '@/components/cms/PropertiesPanel'
import PageRenderer from '@/components/cms/PageRenderer'
import EditorCanvas from '@/components/page-builder/EditorCanvas'
import useEditorHistory from '@/components/page-builder/hooks/useEditorHistory'
import useAutoSave from '@/components/page-builder/hooks/useAutoSave'
import { pagesApi, componentsApi, Page, Section, ComponentTemplate, PageVersion } from '@/lib/cms/api'
import LinkButtonScanner from '@/components/cms/LinkButtonScanner'
import LandingPageAnalytics from '@/components/cms/LandingPageAnalytics'
import Toast, { ToastState } from '@/components/ui/Toast'
import ConfirmModal, { ConfirmModalState } from '@/components/ui/ConfirmModal'

// Helper to update a section in a nested structure
function updateSectionInTree(
  sections: Section[],
  sectionId: string,
  updater: (section: Section) => Section
): Section[] {
  return sections.map(section => {
    if (section.id === sectionId) {
      return updater(section)
    }
    if (section.children) {
      return {
        ...section,
        children: updateSectionInTree(section.children, sectionId, updater)
      }
    }
    return section
  })
}

// Helper to find a section by ID recursively
function findSectionById(sections: Section[], id: string): Section | null {
  for (const section of sections) {
    if (section.id === id) return section
    if (section.children) {
      const found = findSectionById(section.children, id)
      if (found) return found
    }
  }
  return null
}

export default function PageEditorPage() {
  const params = useParams()
  const pageId = params.id as string

  const [page, setPage] = useState<Page | null>(null)
  const [components, setComponents] = useState<ComponentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [showProperties, setShowProperties] = useState(true)
  const { scheduleSave, isSaving: saving, lastSavedAt: lastSaved, saveError, hasUnsavedChanges } = useAutoSave()
  const [viewMode, setViewMode] = useState<'visual' | 'preview'>('visual')
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showVersions, setShowVersions] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [versions, setVersions] = useState<PageVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Undo/Redo history
  const { pushState: pushHistory, undo, redo, canUndo, canRedo } = useEditorHistory(page?.content || [])

  const handleUndo = useCallback(() => {
    if (!page) return
    const prev = undo()
    if (prev) {
      setPage({ ...page, content: prev })
      scheduleSave(async () => savePage({ ...page, content: prev }))
    }
  }, [page, undo, scheduleSave])

  const handleRedo = useCallback(() => {
    if (!page) return
    const next = redo()
    if (next) {
      setPage({ ...page, content: next })
      scheduleSave(async () => savePage({ ...page, content: next }))
    }
  }, [page, redo, scheduleSave])

  // Keyboard shortcuts for undo/redo/save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (page) scheduleSave(async () => savePage(page))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, page])

  // Warn on tab close with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // History debounce timer ref
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current) }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pageResult, componentsResult] = await Promise.all([
        pagesApi.getById(pageId),
        componentsApi.list(),
      ])

      if (pageResult.success && pageResult.data) {
        let pageData = pageResult.data

        // Auto-create a single design-block section if the page is empty
        if (!pageData.content || pageData.content.length === 0) {
          const designBlockSection: Section = {
            id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'design-block',
            order: 0,
            props: { code: '', overrides: '{}' },
          }
          pageData = { ...pageData, content: [designBlockSection] }

          // Save the auto-created section
          await pagesApi.update(pageData.id, {
            title: pageData.title,
            content: pageData.content,
          })
        }

        setPage(pageData)
        // Auto-select the first (only) section
        if (pageData.content && pageData.content.length > 0) {
          setSelectedSectionId(pageData.content[0].id)
        }
      } else {
        setError('Page not found')
      }

      if (componentsResult.success && componentsResult.data) {
        setComponents(componentsResult.data)
      }
    } catch (err) {
      setError('Failed to load page data')
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper: update page content + push to undo history (debounced)
  const updateContent = useCallback((updatedContent: Section[]) => {
    if (!page) return
    setPage({ ...page, content: updatedContent })
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
    historyTimerRef.current = setTimeout(() => pushHistory(updatedContent), 500)
  }, [page, pushHistory])

  const handleUpdateSection = useCallback(
    async (sectionId: string, props: Record<string, any>) => {
      if (!page) return

      const updatedContent = updateSectionInTree(page.content || [], sectionId, (section) => ({
        ...section,
        props
      }))

      updateContent(updatedContent)
      scheduleSave(async () => savePage({ ...page, content: updatedContent }))
    },
    [page, updateContent, scheduleSave]
  )

  const handleDeleteSection = useCallback((sectionId: string) => {
    if (!page) return
    const filtered = (page.content || []).filter(s => s.id !== sectionId)
    const reordered = filtered.map((s, i) => ({ ...s, order: i }))
    updateContent(reordered)
    scheduleSave(async () => savePage({ ...page, content: reordered }))
    if (selectedSectionId === sectionId) setSelectedSectionId(null)
  }, [page, updateContent, scheduleSave, selectedSectionId])

  const handleDuplicateSection = useCallback((sectionId: string) => {
    if (!page) return
    const content = page.content || []
    const idx = content.findIndex(s => s.id === sectionId)
    if (idx === -1) return
    const original = content[idx]
    const copy: Section = {
      ...original,
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: original.order + 0.5,
    }
    const withCopy = [...content, copy].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }))
    updateContent(withCopy)
    scheduleSave(async () => savePage({ ...page, content: withCopy }))
  }, [page, updateContent, scheduleSave])

  const handleMoveSection = useCallback((sectionId: string, direction: -1 | 1) => {
    if (!page) return
    const sorted = [...(page.content || [])].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(s => s.id === sectionId)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const updatedContent = sorted.map((s, i) => {
      if (i === idx) return { ...s, order: sorted[swapIdx].order }
      if (i === swapIdx) return { ...s, order: sorted[idx].order }
      return s
    })
    updateContent(updatedContent)
    scheduleSave(async () => savePage({ ...page, content: updatedContent }))
  }, [page, updateContent, scheduleSave])

  async function savePage(pageData: Page) {
    const updatePayload: Record<string, unknown> = {
      title: pageData.title,
      content: pageData.content || [],
    }
    if (pageData.description) {
      updatePayload.description = pageData.description
    }

    const result = await pagesApi.update(pageData.id, updatePayload)
    if (!result.success) {
      throw new Error(result.error || 'Failed to save')
    }
  }

  async function handleOpenVersions() {
    if (!page) return
    setShowVersions(true)
    setVersionsLoading(true)
    try {
      const result = await pagesApi.getVersions(page.id)
      if (result.success && result.data) {
        setVersions(result.data)
      }
    } catch {
      // silently fail
    } finally {
      setVersionsLoading(false)
    }
  }

  function handleRestoreVersion(versionId: string) {
    if (!page) return
    setConfirmModal({
      title: 'Restore Version',
      description: 'Restore this version? Current content will be saved as a new version first.',
      confirmLabel: 'Restore',
      danger: false,
      onConfirm: async () => {
        setConfirmLoading(true)
        setRestoringVersionId(versionId)
        try {
          const result = await pagesApi.restoreVersion(page.id, versionId)
          if (result.success && result.data) {
            setPage(result.data)
            setShowVersions(false)
          } else {
            setToast({ message: 'Failed to restore version', type: 'error' })
          }
        } catch {
          setToast({ message: 'Failed to restore version', type: 'error' })
        } finally {
          setRestoringVersionId(null)
          setConfirmModal(null)
          setConfirmLoading(false)
        }
      }
    })
  }

  async function handlePublish() {
    if (!page) return
    try {
      await pagesApi.publish(page.id)
      setPage({ ...page, status: 'PUBLISHED', publishedAt: new Date().toISOString() })
    } catch (err) {
      setToast({ message: 'Failed to publish: ' + (err instanceof Error ? err.message : 'Unknown error'), type: 'error' })
    }
  }

  async function handleUnpublish() {
    if (!page) return
    try {
      await pagesApi.unpublish(page.id)
      setPage({ ...page, status: 'DRAFT', publishedAt: null })
    } catch (err) {
      setToast({ message: 'Failed to unpublish: ' + (err instanceof Error ? err.message : 'Unknown error'), type: 'error' })
    }
  }

  // Find selected section
  const selectedSection = selectedSectionId
    ? findSectionById(page?.content || [], selectedSectionId)
    : null
  const selectedTemplate = selectedSection
    ? components.find((c) => c.name === selectedSection.type) || null
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Icon name="loading" size={40} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading page editor...</p>
        </div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Icon name="alert-circle" size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load page</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <Link
            href="/admin/frontend"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="arrow-left" size={16} />
            Back to Pages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-[#111111] border-b border-[#1f1f1f] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/frontend"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className="text-white font-medium text-sm">{page.title}</h1>
            <p className="text-slate-500 text-xs">/{page.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Undo (Ctrl+Z)"
            >
              <Icon name="undo" size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Icon name="redo" size={18} />
            </button>
          </div>

          {/* Save Indicator */}
          {saving && (
            <span className="flex items-center gap-1.5 text-slate-400 text-xs px-3">
              <Icon name="loading" size={14} className="animate-spin" />
              Saving...
            </span>
          )}
          {!saving && saveError && (
            <span className="flex items-center gap-1.5 text-red-400 text-xs px-3" title={saveError}>
              <Icon name="alert-circle" size={14} />
              Save failed
            </span>
          )}
          {!saving && !saveError && hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-yellow-400 text-xs px-3">
              <Icon name="edit" size={14} />
              Unsaved
            </span>
          )}
          {!saving && !saveError && !hasUnsavedChanges && lastSaved && (
            <span className="flex items-center gap-1.5 text-green-400 text-xs px-3">
              <Icon name="check" size={14} />
              Saved
            </span>
          )}

          {/* Status Badge */}
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              page.status === 'PUBLISHED'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}
          >
            {page.status}
          </span>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'visual'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Responsive Preview */}
          {viewMode === 'visual' && (
            <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1">
              <button
                onClick={() => setViewportSize('desktop')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewportSize === 'desktop'
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop"
              >
                <Icon name="monitor" size={16} />
              </button>
              <button
                onClick={() => setViewportSize('tablet')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewportSize === 'tablet'
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tablet (768px)"
              >
                <Icon name="tablet" size={16} />
              </button>
              <button
                onClick={() => setViewportSize('mobile')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewportSize === 'mobile'
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile (375px)"
              >
                <Icon name="smartphone" size={16} />
              </button>
            </div>
          )}

          {/* Toggle Properties */}
          {viewMode !== 'preview' && (
            <button
              onClick={() => setShowProperties(!showProperties)}
              className={`p-2 rounded-lg transition-colors ${
                showProperties
                  ? 'text-primary bg-primary/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Toggle Properties Panel"
            >
              <Icon name="settings" size={18} />
            </button>
          )}

          {/* Full Page Preview (in new tab) */}
          <Link
            href={`/admin/frontend/${pageId}/preview`}
            target="_blank"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Open Full Preview"
          >
            <Icon name="monitor" size={18} />
          </Link>

          {/* View Published */}
          {page.status === 'PUBLISHED' && (
            <a
              href={`/p/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-colors"
              title="View Live Page"
            >
              <Icon name="globe" size={18} />
            </a>
          )}

          {/* Analytics */}
          <button
            onClick={() => setShowAnalytics(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Page Analytics"
          >
            <Icon name="analytics" size={18} />
          </button>

          {/* Version History */}
          <button
            onClick={handleOpenVersions}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Version History"
          >
            <Icon name="clock" size={18} />
          </button>

          {/* Publish/Unpublish */}
          {page.status === 'PUBLISHED' ? (
            <button
              onClick={handleUnpublish}
              className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm font-medium hover:bg-[#222] transition-colors"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'preview' ? (
          <main className="flex-1 bg-[#1a1a1a] overflow-auto">
            <div className="max-w-6xl mx-auto">
              <div className="bg-[#0a0a0a] min-h-full shadow-2xl">
                <PageRenderer page={page} />
              </div>
            </div>
          </main>
        ) : (
          <>
            {/* Center Panel - Canvas */}
            <main className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden">
              <EditorCanvas
                sections={page.content || []}
                selectedSectionId={selectedSectionId}
                isDragging={false}
                viewportSize={viewportSize}
                onSelectSection={setSelectedSectionId}
                onDeleteSection={handleDeleteSection}
                onDuplicateSection={handleDuplicateSection}
                onMoveSection={handleMoveSection}
                onAddSection={() => {}}
                onAddToContainer={() => {}}
              />
            </main>

            {/* Right Panel - Properties */}
            {showProperties && (
              <aside className="w-80 bg-[#111111] border-l border-[#1f1f1f] flex-shrink-0 overflow-y-auto">
                <PropertiesPanel
                  section={selectedSection}
                  componentTemplate={selectedTemplate}
                  onUpdateSection={handleUpdateSection}
                  onClose={() => setSelectedSectionId(null)}
                  sections={page?.content || []}
                  componentTemplates={components}
                  onSelectSection={setSelectedSectionId}
                  onDeleteSection={handleDeleteSection}
                />
                {/* Link/Button Scanner */}
                {selectedSection?.type === 'design-block' && selectedSection.props?.code && (
                  <div className="border-t border-[#1f1f1f]">
                    <LinkButtonScanner
                      code={selectedSection.props.code}
                      onCodeUpdate={(newCode) => {
                        handleUpdateSection(selectedSection.id, {
                          ...selectedSection.props,
                          code: newCode,
                        })
                      }}
                    />
                  </div>
                )}
              </aside>
            )}
          </>
        )}
      </div>

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowVersions(false)} />
          <div className="relative bg-[#111111] border border-[#1f1f1f] rounded-xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <Icon name="clock" size={18} className="text-primary" />
                <h2 className="text-white font-semibold text-sm">Version History</h2>
              </div>
              <button
                onClick={() => setShowVersions(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Icon name="loading" size={24} className="text-primary animate-spin" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="clock" size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No versions yet</p>
                  <p className="text-slate-500 text-xs mt-1">Versions are created each time you publish</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">v{v.version}</span>
                          <span className="text-slate-500 text-xs">{v.title}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {new Date(v.createdAt).toLocaleDateString()} at{' '}
                          {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(v.id)}
                        disabled={restoringVersionId === v.id}
                        className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {restoringVersionId === v.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <LandingPageAnalytics pageId={pageId} onClose={() => setShowAnalytics(false)} />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {confirmModal && <ConfirmModal modal={confirmModal} loading={confirmLoading} onClose={() => { setConfirmModal(null); setConfirmLoading(false) }} />}
    </div>
  )
}
