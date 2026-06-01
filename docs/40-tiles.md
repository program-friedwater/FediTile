# Tile Spec (Timeline-first UX)

## Basics
- Screen = Workspace (tile layout + configuration)
- Tile = one query (timeline/search/notifications/profile/thread...)
- Each tile owns:
  - `query` (kind + params)
  - `accountRef` (defaults to a default account if omitted)
  - `filters` (CW/NSFW/language/keywords/domains/users)
  - `refreshMode` (streaming/polling/manual)
  - `readState` (read boundary / last seen position)

## Read boundary (the readability core)
- Persist `lastSeenAt` or `lastSeenUri` per tile
- Restore it on launch and render an “unread above” boundary

## Tile kinds (MVP candidates)
- Timeline: home / local / federated
- Hashtag / Search
- Notifications
- Thread (detail/conversation)
