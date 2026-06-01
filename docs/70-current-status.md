# Current status (as of 2026-06-01)

This document summarizes what the repo currently implements, and what is still missing.

## Product/UI
- Web app (Vite + React + TypeScript)
- Tile-based workspace with a **tiled/BSP** layout (Hyprland-ish “fill the screen” splits)
  - Split a tile horizontally/vertically
  - Drag split bars to adjust ratios
  - Remove tiles while keeping layout consistent (prunes layout nodes)
- Bottom “FediTile” floating menu (Add tile / Settings / Reset), shown on bottom hover
- Per-tile header shows: **(icon) tile kind + menu button**
- Tile edit: existing tile kind can be changed (e.g. Home -> Federated)

## Tiles
- Timeline tiles:
  - Home / Local / Federated (Misskey-only currently)
  - Hashtag / Search / Notifications exist as tile kinds but are not wired to Misskey yet
- Compose tile:
  - Posts to Misskey `notes/create`
  - CW + visibility mapping (public/unlisted/followers/direct)

## Misskey support
### Auth
- MiAuth flow implemented:
  - Settings -> Connect/Reconnect opens a popup to authorize
  - Callback handled via hash route `#/auth/misskey?...`
- Credentials storage:
  - Accounts stored in IndexedDB (simple `kv` store)
  - Settings shows connected Misskey accounts + local “Disconnect”
- Manual token entry:
  - Not implemented yet (planned for legacy support)

### Timeline (Realtime)
- Read-only timeline fetch:
  - `notes/timeline`, `notes/local-timeline`, `notes/global-timeline`
  - Infinite scroll paging via `untilId`
- Streaming:
  - WebSocket `/streaming?i=...` connect to channels:
    - `homeTimeline`, `localTimeline`, `globalTimeline`
  - New notes are prepended with de-dupe

### Posting / interactions
- Reactions:
  - Emoji picker modal for reactions
  - Add reaction via `notes/reactions/create`
  - Toggle existing reactions (attach/detach) using:
    - `notes/reactions/delete`
    - `notes/show` as a fallback to fetch `myReaction`/reactions for older notes
  - Optimistic UI update + refetch for correctness
- Renote:
  - Renote action menu: choose Renote vs Quote
  - Quote/Reply are posted via `notes/create` (`renoteId`/`replyId`)
- Reply:
  - Reply modal posts to `notes/create` with `replyId`

### Rendering
- MFM subset renderer:
  - Basic inline: **bold/italic/strike/code**, links, URLs, mentions, hashtags
  - `$[...]` function subset: spin/shake/jump/etc. + some parameters
  - `<small>` / `<center>` subset
  - Custom emoji rendering for `:name:` when URL can be resolved
- Renote rendering:
  - Displays renote target, and quote text if present
- CW:
  - CW is hidden by default: `<text> View` to toggle (includes media)
- Media:
  - Misskey note `files` normalized to `Post.media`
  - Simple media grid thumbnails (image/video preview)

## Internal architecture bits
- Normalized types live in `src/domain/types.ts` (e.g. `Post`, `Notification`, `Cursor`)
- Connector interface draft exists but Misskey is currently implemented directly in UI-layer helpers

## Known limitations / TODO
- No instance selection per tile (uses first connected Misskey account)
- No notifications tile implementation (API + streaming)
- No hashtag/search timeline wiring for Misskey
- No persistence for “read markers” / unread boundary
- No rate limit handling, reconnect/backoff strategy is minimal
- MFM is a safe subset; many functions/blocks are not supported
- Security hardening for credential storage is minimal (IndexedDB only; no encryption yet)

