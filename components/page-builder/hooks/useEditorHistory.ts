import { useState, useCallback, useEffect } from 'react'
import { Section } from '@/lib/cms/api'

const MAX_HISTORY = 50

interface UseEditorHistoryReturn {
  pushState: (sections: Section[]) => void
  undo: () => Section[] | null
  redo: () => Section[] | null
  canUndo: boolean
  canRedo: boolean
}

export default function useEditorHistory(initialSections: Section[]): UseEditorHistoryReturn {
  const [history, setHistory] = useState<Section[][]>([initialSections])
  const [index, setIndex] = useState(0)

  // Reset history when initial sections change from outside (e.g. page load)
  useEffect(() => {
    setHistory([initialSections])
    setIndex(0)
  }, []) // Only on mount — subsequent changes go through pushState

  const pushState = useCallback((sections: Section[]) => {
    setHistory(prev => {
      // Trim future states (if we undid and then made a new change)
      const trimmed = prev.slice(0, index + 1)
      const newHistory = [...trimmed, sections]
      // Cap at MAX_HISTORY
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [index])

  const undo = useCallback((): Section[] | null => {
    if (index <= 0) return null
    const newIndex = index - 1
    setIndex(newIndex)
    return history[newIndex] || null
  }, [index, history])

  const redo = useCallback((): Section[] | null => {
    if (index >= history.length - 1) return null
    const newIndex = index + 1
    setIndex(newIndex)
    return history[newIndex] || null
  }, [index, history])

  return {
    pushState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  }
}