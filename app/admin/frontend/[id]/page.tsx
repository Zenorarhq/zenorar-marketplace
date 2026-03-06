'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import Icon from '@/components/ui/Icon'
import ComponentPalette from '@/components/cms/ComponentPalette'
import SectionList from '@/components/cms/SectionList'
import PropertiesPanel from '@/components/cms/PropertiesPanel'
import PageRenderer from '@/components/cms/PageRenderer'
import EditorCanvas from '@/components/page-builder/EditorCanvas'
import useEditorHistory from '@/components/page-builder/hooks/useEditorHistory'
import useAutoSave from '@/components/page-builder/hooks/useAutoSave'
import { pagesApi, componentsApi, Page, Section, ComponentTemplate } from '@/lib/cms/api'

// Container types that can have children
const containerTypes = ['section', 'column']

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

// Helper to find parent section by child ID
function findParentSection(sections: Section[], childId: string): Section | null {
  for (const section of sections) {
    if (section.children?.some(c => c.id === childId)) {
      return section
    }
    if (section.children) {
      const found = findParentSection(section.children, childId)
      if (found) return found
    }
  }
  return null
}

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

// Helper to delete a section from nested structure
function deleteSectionFromTree(sections: Section[], sectionId: string): Section[] {
  return sections
    .filter(section => section.id !== sectionId)
    .map(section => {
      if (section.children) {
        return {
          ...section,
          children: deleteSectionFromTree(section.children, sectionId)
        }
      }
      return section
    })
}

// Helper to add a section to a container
function addSectionToContainer(
  sections: Section[],
  containerId: string,
  newSection: Section
): Section[] {
  return sections.map(section => {
    if (section.id === containerId) {
      const children = section.children || []
      return {
        ...section,
        children: [...children, { ...newSection, order: children.length, parentId: containerId }]
      }
    }
    if (section.children) {
      return {
        ...section,
        children: addSectionToContainer(section.children, containerId, newSection)
      }
    }
    return section
  })
}

export default function PageEditorPage() {
  const params = useParams()
  const pageId = params.id as string

  const [page, setPage] = useState<Page | null>(null)
  const [components, setComponents] = useState<ComponentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [targetContainerId, setTargetContainerId] = useState<string | null>(null) // Which container to add new sections to
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(true)
  const [showProperties, setShowProperties] = useState(true)
  const { scheduleSave, isSaving: saving, lastSavedAt: lastSaved, saveError, hasUnsavedChanges } = useAutoSave()
  const [viewMode, setViewMode] = useState<'visual' | 'list' | 'preview'>('visual')
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // Undo/Redo history
  const { pushState: pushHistory, undo, redo, canUndo, canRedo } = useEditorHistory(page?.content || [])

  const handleUndo = useCallback(() => {
    if (!page) return
    const prev = undo()
    if (prev) {
      setPage({ ...page, content: prev })
      savePage({ ...page, content: prev })
    }
  }, [page, undo])

  const handleRedo = useCallback(() => {
    if (!page) return
    const next = redo()
    if (next) {
      setPage({ ...page, content: next })
      savePage({ ...page, content: next })
    }
  }, [page, redo])

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
        if (page) savePage(page).catch(() => {})
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

  // History debounce timer ref + cleanup on unmount
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current) }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pageResult, componentsResult] = await Promise.all([
        pagesApi.getById(pageId),
        componentsApi.list(),
      ])

      if (pageResult.success && pageResult.data) {
        setPage(pageResult.data)
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

  const generateSectionId = () => {
    // Generate a simple unique ID without external dependency
    return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const handleAddSection = useCallback(
    async (componentName: string, containerId?: string) => {
      if (!page) return

      const template = components.find((c) => c.name === componentName)
      if (!template) return

      const effectiveContainerId = containerId || targetContainerId

      const newSection: Section = {
        id: generateSectionId(),
        type: componentName,
        order: 0, // Will be set properly below
        props: { ...template.defaultProps },
        parentId: effectiveContainerId || undefined,
      }

      let updatedContent: Section[]

      if (effectiveContainerId) {
        // Add to a specific container
        const container = findSectionById(page.content || [], effectiveContainerId)
        if (container && containerTypes.includes(container.type)) {
          newSection.order = container.children?.length || 0
          updatedContent = addSectionToContainer(page.content || [], effectiveContainerId, newSection)
        } else {
          // Container not found or not a container type, add to root
          newSection.order = page.content?.length || 0
          updatedContent = [...(page.content || []), newSection]
        }
      } else {
        // Add to root level
        newSection.order = page.content?.length || 0
        updatedContent = [...(page.content || []), newSection]
      }

      updateContent(updatedContent)
      setSelectedSectionId(newSection.id)

      // Auto-save
      scheduleSave(async () => savePage({ ...page, content: updatedContent }))
    },
    [page, components, targetContainerId]
  )

  const handleAddSectionAtIndex = useCallback(
    async (componentName: string, insertIndex?: number) => {
      if (!page) return
      const template = components.find((c) => c.name === componentName)
      if (!template) return

      const content = page.content || []
      const idx = insertIndex !== undefined ? insertIndex : content.length
      const newSection: Section = {
        id: generateSectionId(),
        type: componentName,
        order: idx,
        props: { ...template.defaultProps },
      }

      const updatedContent = [
        ...content.slice(0, idx),
        newSection,
        ...content.slice(idx),
      ].map((s, i) => ({ ...s, order: i }))

      updateContent(updatedContent)
      setSelectedSectionId(newSection.id)
      scheduleSave(async () => savePage({ ...page, content: updatedContent }))
    },
    [page, components]
  )

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      if (!page) return

      // Delete section from tree (works recursively)
      const updatedContent = deleteSectionFromTree(page.content || [], sectionId)

      // Reorder root level sections
      const reorderedContent = updatedContent.map((s, i) => ({ ...s, order: i }))

      updateContent(reorderedContent)
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null)
      }
      if (targetContainerId === sectionId) {
        setTargetContainerId(null)
      }

      scheduleSave(async () => savePage({ ...page, content: reorderedContent }))
    },
    [page, selectedSectionId, targetContainerId]
  )

  // Helper to deep clone a section and its children with new IDs
  const cloneSectionWithNewIds = useCallback((section: Section, newParentId?: string): Section => {
    const newId = generateSectionId()
    return {
      ...section,
      id: newId,
      parentId: newParentId,
      children: section.children?.map(child => cloneSectionWithNewIds(child, newId))
    }
  }, [])

  const handleDuplicateSection = useCallback(
    async (sectionId: string) => {
      if (!page) return

      // Find section in tree
      const sectionToDuplicate = findSectionById(page.content || [], sectionId)
      if (!sectionToDuplicate) return

      // Find parent (if any)
      const parent = findParentSection(page.content || [], sectionId)

      // Clone with new IDs
      const duplicatedSection = cloneSectionWithNewIds(sectionToDuplicate, parent?.id)

      let updatedContent: Section[]

      if (parent) {
        // Duplicate within parent's children
        updatedContent = updateSectionInTree(page.content || [], parent.id, (parentSection) => {
          const children = parentSection.children || []
          const sectionIndex = children.findIndex(s => s.id === sectionId)
          const newChildren = [
            ...children.slice(0, sectionIndex + 1),
            { ...duplicatedSection, order: sectionIndex + 1 },
            ...children.slice(sectionIndex + 1).map(s => ({ ...s, order: s.order + 1 }))
          ]
          return { ...parentSection, children: newChildren }
        })
      } else {
        // Duplicate at root level
        const sectionIndex = page.content.findIndex(s => s.id === sectionId)
        updatedContent = [
          ...page.content.slice(0, sectionIndex + 1),
          { ...duplicatedSection, order: sectionIndex + 1 },
          ...page.content.slice(sectionIndex + 1).map(s => ({ ...s, order: s.order + 1 }))
        ]
      }

      updateContent(updatedContent)
      setSelectedSectionId(duplicatedSection.id)

      scheduleSave(async () => savePage({ ...page, content: updatedContent }))
    },
    [page, cloneSectionWithNewIds]
  )

  const handleMoveSection = useCallback(
    async (sectionId: string, direction: -1 | 1) => {
      if (!page) return
      const content = page.content || []
      const index = content.findIndex(s => s.id === sectionId)
      if (index === -1) return
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= content.length) return
      const reordered = arrayMove(content, index, newIndex).map((s, i) => ({ ...s, order: i }))
      updateContent(reordered)
      scheduleSave(async () => savePage({ ...page, content: reordered }))
    },
    [page]
  )

  const handleUpdateSection = useCallback(
    async (sectionId: string, props: Record<string, any>) => {
      if (!page) return

      // Update section in tree (works recursively)
      const updatedContent = updateSectionInTree(page.content || [], sectionId, (section) => ({
        ...section,
        props
      }))

      updateContent(updatedContent)

      // Debounced auto-save would be better here, but for simplicity we'll save immediately
      scheduleSave(async () => savePage({ ...page, content: updatedContent }))
    },
    [page]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !page) return

    // Handle dropping from palette
    if (active.data.current?.type === 'palette-item') {
      const componentName = active.data.current.componentName

      // Dropped on a drop zone — insert at that position
      if (over.data.current?.type === 'drop-zone') {
        const dropId = over.id as string // e.g. "drop-zone-2"
        const insertIndex = parseInt(dropId.replace('drop-zone-', ''), 10)
        handleAddSectionAtIndex(componentName, isNaN(insertIndex) ? undefined : insertIndex)
        return
      }

      // Check if dropping over a container - add inside it
      const overSection = findSectionById(page.content || [], over.id as string)
      if (overSection && containerTypes.includes(overSection.type)) {
        handleAddSection(componentName, over.id as string)
      } else {
        handleAddSection(componentName)
      }
      return
    }

    // Handle reordering sections
    if (active.id !== over.id) {
      const activeSection = findSectionById(page.content || [], active.id as string)
      const overSection = findSectionById(page.content || [], over.id as string)

      if (!activeSection || !overSection) return

      // Find parents
      const activeParent = findParentSection(page.content || [], active.id as string)
      const overParent = findParentSection(page.content || [], over.id as string)

      // Check if dropping INTO a container (over is a container and active is not already its child)
      const isDropIntoContainer = containerTypes.includes(overSection.type) &&
        !overSection.children?.some(c => c.id === active.id)

      if (isDropIntoContainer) {
        // Move section INTO the container
        let updatedContent = deleteSectionFromTree(page.content || [], active.id as string)
        updatedContent = addSectionToContainer(updatedContent, over.id as string, activeSection)
        updateContent(updatedContent)
        scheduleSave(async () => savePage({ ...page, content: updatedContent }))
        return
      }

      // Same parent - simple reorder
      if (activeParent?.id === overParent?.id) {
        if (activeParent) {
          // Reorder within parent's children
          const updatedContent = updateSectionInTree(page.content || [], activeParent.id, (parent) => {
            const children = parent.children || []
            const oldIndex = children.findIndex(s => s.id === active.id)
            const newIndex = children.findIndex(s => s.id === over.id)
            if (oldIndex !== -1 && newIndex !== -1) {
              const reordered = arrayMove(children, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
              return { ...parent, children: reordered }
            }
            return parent
          })
          updateContent(updatedContent)
          scheduleSave(async () => savePage({ ...page, content: updatedContent }))
        } else {
          // Reorder at root level
          const oldIndex = page.content.findIndex(s => s.id === active.id)
          const newIndex = page.content.findIndex(s => s.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedContent = arrayMove(page.content, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
            updateContent(reorderedContent)
            scheduleSave(async () => savePage({ ...page, content: reorderedContent }))
          }
        }
      } else {
        // Different parents - move between containers
        // Remove from old location
        let updatedContent = deleteSectionFromTree(page.content || [], active.id as string)

        if (overParent) {
          // Add to new parent
          updatedContent = addSectionToContainer(updatedContent, overParent.id, {
            ...activeSection,
            parentId: overParent.id
          })
        } else {
          // Add to root level
          const overIndex = updatedContent.findIndex(s => s.id === over.id)
          updatedContent = [
            ...updatedContent.slice(0, overIndex),
            { ...activeSection, parentId: undefined, order: overIndex },
            ...updatedContent.slice(overIndex).map(s => ({ ...s, order: s.order + 1 }))
          ]
        }

        updateContent(updatedContent)
        scheduleSave(async () => savePage({ ...page, content: updatedContent }))
      }
    }
  }

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

  async function handlePublish() {
    if (!page) return
    try {
      await pagesApi.publish(page.id)
      setPage({ ...page, status: 'PUBLISHED', publishedAt: new Date().toISOString() })
    } catch (err) {
      alert('Failed to publish: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleUnpublish() {
    if (!page) return
    try {
      await pagesApi.unpublish(page.id)
      setPage({ ...page, status: 'DRAFT', publishedAt: null })
    } catch (err) {
      alert('Failed to unpublish: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Find selected section recursively
  const selectedSection = selectedSectionId
    ? findSectionById(page?.content || [], selectedSectionId)
    : null
  const selectedTemplate = selectedSection
    ? components.find((c) => c.name === selectedSection.type) || null
    : null

  // Check if selected section is a container (for "Add to container" UI)
  const selectedIsContainer = selectedSection && containerTypes.includes(selectedSection.type)

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
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
                title="Visual Editor"
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List Editor"
              >
                List
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-primary text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Full Preview"
              >
                Preview
              </button>
            </div>

            {/* Responsive Preview (visual mode only) */}
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

            {/* Toggle Panels (only in edit modes) */}
            {viewMode !== 'preview' && (
              <>
                <button
                  onClick={() => setShowPalette(!showPalette)}
                  className={`p-2 rounded-lg transition-colors ${
                    showPalette
                      ? 'text-primary bg-primary/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Toggle Components Panel"
                >
                  <Icon name="grid-view" size={18} />
                </button>
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
              </>
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
            /* Preview Mode - Full preview of the page */
            <main className="flex-1 bg-[#1a1a1a] overflow-auto">
              <div className="max-w-6xl mx-auto">
                <div className="bg-[#0a0a0a] min-h-full shadow-2xl">
                  <PageRenderer page={page} />
                </div>
              </div>
            </main>
          ) : (
            <>
              {/* Left Panel - Component Palette */}
              {showPalette && (
                <aside className="w-72 bg-[#111111] border-r border-[#1f1f1f] flex-shrink-0 overflow-hidden flex flex-col">
                  {/* Target Container Indicator */}
                  {targetContainerId && (
                    <div className="p-3 bg-primary/10 border-b border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="folder" size={14} className="text-primary" />
                          <span className="text-primary text-xs font-medium">
                            Adding to: {findSectionById(page?.content || [], targetContainerId)?.type || 'container'}
                          </span>
                        </div>
                        <button
                          onClick={() => setTargetContainerId(null)}
                          className="p-1 text-primary hover:bg-primary/20 rounded"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <ComponentPalette components={components} onAddSection={handleAddSection} />
                  </div>
                </aside>
              )}

              {/* Center Panel - Visual Canvas or Section List */}
              {viewMode === 'visual' ? (
                <main className="flex-1 bg-[#1a1a1a] flex flex-col overflow-hidden">
                  <EditorCanvas
                    sections={page.content || []}
                    selectedSectionId={selectedSectionId}
                    isDragging={!!activeId}
                    viewportSize={viewportSize}
                    onSelectSection={setSelectedSectionId}
                    onDeleteSection={handleDeleteSection}
                    onDuplicateSection={handleDuplicateSection}
                    onMoveSection={handleMoveSection}
                  />
                </main>
              ) : (
                <main className="flex-1 bg-[#0d0d0d] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-semibold text-sm">Page Sections</h2>
                      <p className="text-slate-500 text-xs">{page.content?.length || 0} sections</p>
                    </div>
                    {/* Add to container button */}
                    {selectedIsContainer && (
                      <button
                        onClick={() => setTargetContainerId(
                          targetContainerId === selectedSectionId ? null : selectedSectionId
                        )}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          targetContainerId === selectedSectionId
                            ? 'bg-primary text-black'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        <Icon name="add" size={14} />
                        {targetContainerId === selectedSectionId ? 'Adding here' : 'Add to this container'}
                      </button>
                    )}
                  </div>
                  <SectionList
                    sections={page.content || []}
                    componentTemplates={components}
                    selectedSectionId={selectedSectionId}
                    onSelectSection={setSelectedSectionId}
                    onDeleteSection={handleDeleteSection}
                    onDuplicateSection={handleDuplicateSection}
                  />
                </main>
              )}

              {/* Right Panel - Properties */}
              {showProperties && (
                <aside className="w-80 bg-[#111111] border-l border-[#1f1f1f] flex-shrink-0 overflow-hidden">
                  <PropertiesPanel
                    section={selectedSection}
                    componentTemplate={selectedTemplate}
                    onUpdateSection={handleUpdateSection}
                    onClose={() => setSelectedSectionId(null)}
                  />
                </aside>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <div className="bg-[#1a1a1a] border border-primary rounded-lg p-3 shadow-lg opacity-80">
            <span className="text-white text-sm">Moving section...</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
