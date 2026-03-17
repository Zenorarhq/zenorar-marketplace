# Upload Library — Bug Fix Plan

## Files in Scope

| File | Role |
|------|------|
| `zenorar-api/src/services/media.service.ts` | Upload logic — mimeType missing |
| `zenorar-api/src/controllers/media.controller.ts` | Upload controller — mimeType available but not forwarded |
| `zenorar-marketplace/app/admin/library/page.tsx` | All frontend bugs |

---

## Bug 1 — mimeType never saved to database

**Root cause:** `media.controller.ts` has access to `req.file.mimetype` (provided by multer) but never passes it to `mediaService.upload()`. The service then never writes it to `prisma.media.create()`. Every uploaded file has `mimeType = null` in the DB.

**Effect:** Edit modal shows blank MIME Type. The preview icon logic in the edit modal (`editingUpload.mimeType?.startsWith('image/')`) always falls through to the document icon for any file uploaded through this admin flow.

**Fix plan:**

Step 1 — `media.controller.ts:29-34`
Pass `mimetype` from `req.file` into `mediaService.upload()` options:
```
// Before
const media = await mediaService.upload(
  req.file.buffer,
  req.file.originalname,
  req.user.userId,
  { alt, folder, title, description }
)

// After
const media = await mediaService.upload(
  req.file.buffer,
  req.file.originalname,
  req.user.userId,
  { alt, folder, title, description, mimeType: req.file.mimetype }
)
```

Step 2 — `media.service.ts:9-50`
Add `mimeType` to the options parameter and pass it into `prisma.media.create()`:
```
// Before
options: { alt?, folder?, title?, description? }
...
prisma.media.create({ data: { name, url, publicId, type, size, width, height, alt, title, description, uploadedById } })

// After
options: { alt?, folder?, title?, description?, mimeType? }
...
prisma.media.create({ data: { ..., mimeType } })
```

- [ ] Add mimeType param to service upload options
- [ ] Pass req.file.mimetype from controller to service
- [ ] Include mimeType in prisma.media.create() call

---

## Bug 2 — Lightbox shows `undefined × undefined` for image dimensions

**Root cause:** Line 379 in `library/page.tsx` calls `setPreviewingUpload(upload as any)`. The `upload` variable is the local `Upload` interface (stripped-down version with no `width`/`height`). But `previewingUpload` is typed as `MediaFile`, which has `width`/`height`. The lightbox at line 606 renders `{previewingUpload.width} × {previewingUpload.height}` — both are always `undefined`.

**Fix plan:**

`library/page.tsx:379`
Change the Eye button's `onClick` to look up the original `MediaFile` from `mediaFiles` by ID (same pattern already used for Edit on line 371):
```
// Before
onClick={() => setPreviewingUpload(upload as any)}

// After
onClick={() => { const original = mediaFiles.find(f => f.id === upload.id); if (original) setPreviewingUpload(original); }}
```

- [ ] Fix Eye button onClick to pass MediaFile instead of Upload

---

## Bug 3 — Edit modal title hardcoded as "Edit Image Details" for all file types

**Root cause:** Line 452 in `library/page.tsx` has a static string `"Edit Image Details"` regardless of whether the file is an image, video, or document.

**Fix plan:**

`library/page.tsx:452`
Make the title dynamic based on `editingUpload.type`:
```
// Before
<h3 className="text-white font-semibold text-lg">Edit Image Details</h3>

// After
<h3 className="text-white font-semibold text-lg">
  Edit {editingUpload.type === 'IMAGE' ? 'Image' : editingUpload.type === 'VIDEO' ? 'Video' : 'Document'} Details
</h3>
```

- [ ] Make edit modal title dynamic based on file type

---

## Bug 4 — Dead code: `getFileType` helper never used

**Root cause:** The `getFileType` function defined at lines 44–49 of `library/page.tsx` is never called anywhere. Type is determined server-side via `file.type.toLowerCase()` in the `uploads` mapping.

**Fix plan:**

`library/page.tsx:44-49`
Delete the function entirely:
```
// Remove this entire block:
function getFileType(mimeType: string | null | undefined): 'image' | 'document' | 'video' {
  if (!mimeType) return 'document'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}
```

- [ ] Remove dead getFileType function

---

## Bug 5 — Documents count missing from stats cards

**Root cause:** The backend returns `stats.documentCount` from `GET /api/media/stats` but there is no stats card on the page for it. The 4th card shows "Videos" — there is no Documents card at all.

**Fix plan:**

`library/page.tsx:279-292`
Replace the "Videos" card with two smaller cards — or add a 5th card. Given the grid is `grid-cols-2 lg:grid-cols-4`, the cleanest fix is to **replace** the Videos card with a combined "Other" card showing documents, since documents are less prominent than videos. OR change the grid to `lg:grid-cols-5` and add it. Cleanest: keep the 4-column grid and swap Videos for Documents is wrong — both matter. Best approach: keep 4 cards, change the 4th to show both Video and Document counts:

Actually — simplest and cleanest: change the grid to show 4 cards as now but replace the 4th card ("Videos") with a "Documents" card, and show videos inline with images. No — better: add a proper Documents card and go to 5 columns on large screens. The grid already has `lg:grid-cols-4`, change to `lg:grid-cols-5` and add the Documents card.

```
// Change grid from:
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">

// To:
<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">

// Add a 5th card after the Videos card showing documentCount
```

- [ ] Add Documents stat card (grid-cols-5, documentCount from stats)

---

## Execution Order

Fix in this order to minimise context switching between files:

1. **Bug 1** — backend first (2 files: controller + service) — deploy to Railway
2. **Bug 2** — 1-line frontend fix
3. **Bug 3** — 1-line frontend fix
4. **Bug 4** — delete 6 lines of dead code
5. **Bug 5** — add stat card

**Total files touched:** 3 (`media.controller.ts`, `media.service.ts`, `library/page.tsx`)

---

## Review
*(To be filled after implementation)*
