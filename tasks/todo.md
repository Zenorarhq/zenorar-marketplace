# Page Builder Fixes — Todo

## Checklist

- [x] 1. CRITICAL — Implement section delete / duplicate / move handlers (`[id]/page.tsx`)
- [x] 2. HIGH — Fix Ctrl+S bypassing save indicator (`[id]/page.tsx`)
- [x] 3. HIGH — Fix Undo/Redo hammering API (`[id]/page.tsx`)
- [x] 4. HIGH — Set `NEXT_PUBLIC_SITE_URL` on Railway (deploy config, no code change)
- [x] 5. MEDIUM — Fix tab counts resetting when filtered (`frontend/page.tsx`)
- [x] 6. MEDIUM — Show error feedback on list page action failures (`frontend/page.tsx`)
- [x] 7. LOW — Fix stale `index` closure in `useEditorHistory` (`useEditorHistory.ts`)
- [x] 8. LOW — Fix missing `useCallback` deps on `handleUpdateSection` (`[id]/page.tsx`)

## Review

### What changed and why

1. **Section delete/duplicate/move** (`[id]/page.tsx`): Implemented `handleDeleteSection`, `handleDuplicateSection`, `handleMoveSection` as `useCallback` functions. All three reorder content, call `updateContent` + `scheduleSave`, and are wired to `EditorCanvas` and `PropertiesPanel`. Previously they were `() => {}` no-ops so the Navigator delete button did nothing.

2. **Ctrl+S save indicator** (`[id]/page.tsx` line 102): Changed `savePage(page).catch(() => {})` to `scheduleSave(async () => savePage(page))` so the save flows through `useAutoSave` and the "Saved" indicator updates correctly.

3. **Undo/Redo API hammering** (`[id]/page.tsx` lines 71–87): Changed both `handleUndo` and `handleRedo` to use `scheduleSave` instead of calling `savePage` directly. Rapid Ctrl+Z now batches into one API call after 3 seconds.

4. **Deploy config**: No code change. Set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` on Railway to fix public pages 404 risk.

5. **Tab counts** (`frontend/page.tsx`): Added `allPages` state. `loadPages` now does a parallel fetch of the unfiltered list alongside the filtered one. Tab badges and Quick Stats always read from `allPages`.

6. **Silent action failures** (`frontend/page.tsx`): Added `actionError` state. All four action handlers (`handleDelete`, `handlePublish`, `handleUnpublish`, `handleDuplicate`) now call `setActionError` on failure. A dismissible red banner renders above the page list.

7. **Stale history closure** (`useEditorHistory.ts`): Replaced two separate `useState` atoms with a single `{ stack, index }` state object. All three functions (`pushState`, `undo`, `redo`) use functional `setState(prev => ...)` — no stale closure is possible.

8. **Missing useCallback deps** (`[id]/page.tsx`): Added `updateContent` and `scheduleSave` to `handleUpdateSection` deps array (fixed as part of item 1 — same location).