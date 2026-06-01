# MVP Scope (proposal)

To deliver timeline-first value on the web quickly, we start by nailing “read/follow”.

## Phase 1 (usable fast)
- Workspace (add/move/resize/save tiles)
- Tiles: home/local/federated/hashtag/search/notifications
- Post detail (single) + basic thread when available
- Auth: start with a single Mastodon-compatible connector (Mastodon + Pixelfed)
- Cache: latest N items per tile + read boundary

## Phase 2 (expand services)
- Misskey connector (WS streaming / custom emoji reactions)
- Lemmy connector (community/thread model)
- PeerTube connector (turn videos/channels into timelines)

## Phase 3 (scale out connectors)
- Add Service Descriptors (more declarative services)
- Full-text search (FTS)
- Advanced rules/filters

