# Misskey roadmap (timeline-first)

This document focuses on Misskey support, with **timelines as the top priority**.

## Goals
- Timeline-first UX: tiles start showing content immediately after sign-in
- Streaming when available (WebSocket), polling fallback
- Support **modern Misskey (v13+) first**, with a path to add legacy support (v12 or earlier)
- Auth-first: prefer proper auth flows; keep “manual token” as an optional legacy/backdoor mode later

## Phase 1 — Auth + read-only timelines (MVP)
### 1.1 Auth (recommended)
- Implement **MiAuth** (or the most compatible official Misskey auth flow) as the primary path
- Store credentials in a safer storage than plain localStorage (IndexedDB at minimum)
- Support multiple instances (account per instance URL)

### 1.2 Timeline connector (read-only)
- Add `misskey` connector implementation
- Implement timeline kinds (tile queries):
  - `home`, `local`, `federated` (global)
  - `hashtag`, `search` (if supported on the target instance/API version)
- Paging:
  - Map Misskey `sinceId` / `untilId` to our `Cursor` abstraction
  - Integrate with the virtual list infinite-loading behavior

### 1.3 Rendering
- Normalize Misskey `note` to internal `Post`
- Use `contentFormat: "mfm"` so the UI can render MFM via the existing MFM renderer subset

## Phase 2 — Streaming (feel like a real client)
- Add WebSocket streaming:
  - home/local/global/hashtag channels as available
  - reconnect/backoff + duplicate suppression
- Deletion/update events (where provided) should patch cached timeline items

## Phase 3 — Expand coverage (still timeline-centric)
- Notifications tile (read-only first)
- Thread/detail view (conversation fetch if available)
- Media attachments (image/video preview, lazy load)

## Phase 4 — Posting + reactions
- Compose tile -> `notes/create`
- CW, visibility, reply, renote
- Reactions (custom emoji): fetch emoji catalog + picker

## Phase 5 — Legacy compatibility mode (v12 or earlier)
- Add a connector compatibility layer:
  - Capability-based endpoint selection
  - Version/probing on instance connect
- Add **Manual token** option in Settings:
  - Only for legacy instances / self-hosters
  - Clearly labeled as “less safe / advanced”

