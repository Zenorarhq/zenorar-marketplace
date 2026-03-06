import { useRef, useCallback, useEffect, useState } from 'react'

const SAVE_DEBOUNCE_MS = 3000

interface UseAutoSaveReturn {
  scheduleSave: (saveFn: () => Promise<void>) => void
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null
  hasUnsavedChanges: boolean
}

export default function useAutoSave(): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef = useRef<(() => Promise<void>) | null>(null)

  const executeSave = useCallback(async () => {
    const fn = saveFnRef.current
    if (!fn) return

    setIsSaving(true)
    setSaveError(null)
    try {
      await fn()
      setLastSavedAt(new Date())
      setHasUnsavedChanges(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const scheduleSave = useCallback((saveFn: () => Promise<void>) => {
    saveFnRef.current = saveFn
    setHasUnsavedChanges(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(executeSave, SAVE_DEBOUNCE_MS)
  }, [executeSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    scheduleSave,
    isSaving,
    lastSavedAt,
    saveError,
    hasUnsavedChanges,
  }
}