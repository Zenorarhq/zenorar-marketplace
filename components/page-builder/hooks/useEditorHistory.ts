import { useState, useCallback } from 'react'
import { Section } from '@/lib/cms/api'

const MAX_HISTORY = 50

interface UseEditorHistoryReturn {
  pushState: (sections: Section[]) => void
  undo: () => Section[] | null
  redo: () => Section[] | null
  canUndo: boolean
  canRedo: boolean
}

interface HistoryState {
  stack: Section[][]
  index: number
}

export default function useEditorHistory(initialSections: Section[]): UseEditorHistoryReturn {
  const [state, setState] = useState<HistoryState>({ stack: [initialSections], index: 0 })

  const pushState = useCallback((sections: Section[]) => {
    setState(prev => {
      // Trim any future states (branch after undo), then append
      const trimmed = prev.stack.slice(0, prev.index + 1)
      const newStack = [...trimmed, sections]
      // Cap at MAX_HISTORY — drop oldest entry if over limit
      if (newStack.length > MAX_HISTORY) newStack.shift()
      return { stack: newStack, index: newStack.length - 1 }
    })
  }, [])

  const undo = useCallback((): Section[] | null => {
    let result: Section[] | null = null
    setState(prev => {
      if (prev.index <= 0) return prev
      const newIndex = prev.index - 1
      result = prev.stack[newIndex] || null
      return { ...prev, index: newIndex }
    })
    return result
  }, [])

  const redo = useCallback((): Section[] | null => {
    let result: Section[] | null = null
    setState(prev => {
      if (prev.index >= prev.stack.length - 1) return prev
      const newIndex = prev.index + 1
      result = prev.stack[newIndex] || null
      return { ...prev, index: newIndex }
    })
    return result
  }, [])

  return {
    pushState,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.stack.length - 1,
  }
}