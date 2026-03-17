# Live Chat — Fix 11 Bugs & Issues

## Root Causes

The live chat system is functional but has edge cases in real-time event handling, missing features in typing indicators, and security gaps in file uploads.

---

## Plan

### Fix #1 HIGH: Double event emission (admin receives same message twice)
**Root cause:** `emitNewMessage()` in `socket/chat.ts:48-55` broadcasts to BOTH `conversation:{id}` room AND `admin` room. Admin is in both rooms, so they receive every message twice. Current fix is a fragile `processedMsgIds` Set that clears on unmount.

**Fix:** Stop emitting to `admin` room when message is already going to `conversation:{id}` — instead, only emit to `admin` room for messages in conversations the admin is NOT currently viewing. Simpler approach: emit to admin room with a flag `fromAdminRoom: true`, and skip those in the admin UI if the conversation is already active.

**Files:**
- [ ] `zenorar-api/src/socket/chat.ts` — Add `fromAdminRoom` flag on admin room emissions
- [ ] `zenorar-marketplace/app/admin/chat/page.tsx` — Skip messages with `fromAdminRoom: true` if conversation is active (already joined room)

---

### Fix #2 HIGH: File upload has no auth
**Root cause:** `chat.routes.ts:65` — `router.post('/upload', upload.single('file'), chatController.uploadChatFile)` has no auth middleware.

**Fix:** Add `optionalAuth` middleware so at minimum we can identify the uploader. Validate that a conversation ID is provided and the user/session has access to it.

**Files:**
- [ ] `zenorar-api/src/routes/chat.routes.ts` — Add `optionalAuth` to upload route

---

### Fix #3 HIGH: Typing indicator only works admin→user, not user→admin
**Root cause:** `LiveChat.tsx` never emits typing events. The socket hook has `emitTyping()` but the user-facing chat widget doesn't call it.

**Fix:** Add typing event emission to `LiveChat.tsx` when user types in the input field. Use debounce to avoid spamming.

**Files:**
- [ ] `zenorar-marketplace/components/LiveChat.tsx` — Import `emitTyping` from socket hook, call on input change with debounce

---

### Fix #4 HIGH: No `typing:stop` event — indicator stays for 5 seconds
**Root cause:** `socket/chat.ts:32-38` broadcasts `typing` event but there's no explicit stop. The admin page uses a 5-second timeout to clear it, but if the user stops typing after 1 second, it still shows for 4 more seconds.

**Fix:** This is actually fine architecturally — the 5-second timeout is a standard pattern (Slack, Discord all do this). The real issue is #3 (user doesn't emit at all). Once #3 is fixed, the debounce pattern will naturally handle start/stop: emit `isTyping: true` on keypress, debounce emit `isTyping: false` after 2 seconds of no typing.

**Files:**
- [ ] Same as Fix #3 — handled together in `LiveChat.tsx`

---

### Fix #5 MEDIUM: Auto-assign race condition (two agents replying simultaneously)
**Root cause:** `chat.service.ts:293-301` checks `assignedToId === null` then assigns, but no lock prevents two agents from passing the check simultaneously.

**Fix:** Use a database-level `WHERE "assignedToId" IS NULL` in the UPDATE query so only the first one wins. The second agent's update affects 0 rows.

**Files:**
- [ ] `zenorar-api/src/services/chat.service.ts` — Change assignment to atomic UPDATE with WHERE clause

---

### Fix #6 MEDIUM: Message polling timestamp collision
**Root cause:** `chat.service.ts:446-457` uses `createdAt > $2` — messages with the exact same millisecond timestamp could be missed on the next poll.

**Fix:** Change to `createdAt >= $2` and add `id NOT IN (lastSeenIds)` or use cursor-based pagination with message ID instead of timestamp.

**Files:**
- [ ] `zenorar-api/src/services/chat.service.ts` — Change `>` to `>=` and exclude already-seen message IDs
- [ ] `zenorar-api/src/controllers/chat.controller.ts` — Pass last message ID in addition to `after` timestamp

---

### Fix #7 MEDIUM: No online presence tracking
**Root cause:** No mechanism tracks which agents are connected. The "online" status is a manual toggle in settings, not based on actual socket connections.

**Fix:** Track agent socket connections in memory. When agent connects and joins admin room, mark online. On disconnect, mark offline. Expose via API so user widget shows real agent availability.

**Files:**
- [ ] `zenorar-api/src/socket/chat.ts` — Track connected admin sockets in a Map, emit presence updates
- [ ] `zenorar-api/src/controllers/chat.controller.ts` — Add endpoint or modify settings to include real-time presence

---

### Fix #8 MEDIUM: Auto-close uses `updatedAt` instead of last message time
**Root cause:** `chat.service.ts:557-579` uses `updatedAt < cutoff` but `updatedAt` changes on any update (tag change, assignment, etc.), not just messages. A conversation with frequent tag changes but no messages could stay open forever.

**Fix:** Use last message time via subquery instead of `updatedAt`.

**Files:**
- [ ] `zenorar-api/src/services/chat.service.ts` — Change auto-close query to use last message time via subquery

---

### Fix #9 LOW: No message rate limiting
**Root cause:** `chat.routes.ts:77` — message sending has no rate limit. Users can spam messages.

**Fix:** Add a simple rate limiter (e.g., max 10 messages per 10 seconds per conversation).

**Files:**
- [ ] `zenorar-api/src/routes/chat.routes.ts` — Add rate limiter to send message route

---

### Fix #10 LOW: Admin reloads full conversation on every selection
**Root cause:** `admin/chat/page.tsx` — selecting a conversation triggers `getConversation()` + `loadConversations()` + `loadStats()` every time.

**Fix:** Only reload the conversation messages, not the full list and stats. Use React Query cache for the conversation list.

**Files:**
- [ ] `zenorar-marketplace/app/admin/chat/page.tsx` — Remove redundant `loadConversations()` and `loadStats()` on conversation select

---

### Fix #11 LOW: Audio notification no error handling
**Root cause:** `LiveChat.tsx` — `play()` can throw if browser blocks autoplay. Currently no try/catch.

**Fix:** Wrap `play()` in try/catch.

**Files:**
- [ ] `zenorar-marketplace/components/LiveChat.tsx` — Add try/catch around audio play calls
- [ ] `zenorar-marketplace/app/admin/chat/page.tsx` — Same fix for admin notification sound

---

## File Change Summary

| File | Changes |
|------|---------|
| `zenorar-api/src/socket/chat.ts` | Fix #1 (admin room flag), Fix #7 (presence tracking) |
| `zenorar-api/src/routes/chat.routes.ts` | Fix #2 (upload auth), Fix #9 (message rate limit) |
| `zenorar-api/src/services/chat.service.ts` | Fix #5 (atomic assign), Fix #6 (polling fix), Fix #8 (auto-close) |
| `zenorar-api/src/controllers/chat.controller.ts` | Fix #6 (pass last ID), Fix #7 (presence endpoint) |
| `zenorar-marketplace/components/LiveChat.tsx` | Fix #3+#4 (user typing), Fix #11 (audio error) |
| `zenorar-marketplace/app/admin/chat/page.tsx` | Fix #1 (skip admin room dupes), Fix #10 (reduce reloads), Fix #11 (audio error) |

**Total: 6 files modified, 0 files created**

---

## Review
*(To be filled after implementation)*
