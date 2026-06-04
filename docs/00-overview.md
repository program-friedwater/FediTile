# Design Overview (Timeline-First / Tile UI / Multi-Service)

## Goals
- **Timeline-first**: timelines start flowing per-tile right after launch; details are secondary
- **Tiles**: one tile = one query (timeline/search/notifications/list/etc.). Each tile owns refresh, filters, and read boundary
- **Multi-service**: not limited to Misskey/Mastodon/Pixelfed/PeerTube/Lemmy; additional services are added as **connectors**

## Assumptions (confirmed)
- Target: **Web app**
- Accounts: single or multiple are both OK (tile-level account selection)

## Docs
- `docs/10-architecture.md`: responsibilities and layering
- `docs/20-domain-model.md`: normalized internal data model
- `docs/30-connectors.md`: connector interface/spec
- `docs/40-tiles.md`: tile UX/state spec
- `docs/50-mvp.md`: MVP scope and phases
- `docs/70-current-status.md`: current implementation status
- `docs/80-source-tree.md`: directory-by-directory and file-by-file source tree reference
- `docs/90-mastodon-preparation.md`: groundwork added before full Mastodon support

## Writing rule
- Please write Markdown docs in English going forward.
