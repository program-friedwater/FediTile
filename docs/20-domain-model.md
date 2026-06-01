# Domain Model (Normalized Data)

Purpose: absorb service differences and keep UI/data stable.

## Core concepts

### Account (target + auth)
- `serviceId`: `"mastodon"` / `"misskey"` / `"lemmy"` / ...
- `instanceUrl`: e.g. `https://misskey.io`
- `auth`: tokens/refresh state (handle carefully on the web)

### Post (timeline item)
The first priority is: it must render well in a timeline.
- Identity: prefer `uri`; fallback to `(serviceId, remoteId)`
- Body: `content` carries either “rendered HTML” or “text + format” (sanitize before rendering)
- Conversation: `replyToUri` / `repostOfUri` (boost/renote/etc.)

### Notification
Notification taxonomies vary a lot; normalize common types first and keep the rest as extensible metadata.
- Examples: mention / reply / repost / reaction / follow / poll / system

### Capability
- Examples: `streaming`, `reactions` (custom emoji / arbitrary), `lists`, `bookmarks`, `filters`, `edit`, `quote`
- UI decides behavior from capabilities (e.g. streaming vs polling)

## TypeScript source of truth
- Keep the canonical types in `src/domain/types.ts` and share them across UI/connectors/store.
