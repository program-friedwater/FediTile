# Source Tree Reference

This document explains the current source tree in two layers:

1. What each top-level directory is responsible for
2. What each file inside those directories currently does

The goal is to make the project easier to navigate after the responsibility-based restructure.

## `src/app`

Application bootstrapping and app-level wiring.

- `App.tsx`
  - Connects the workspace provider to the visible app shell
  - Owns global app flows such as auth callback handling and workspace-level modals
- `main.tsx`
  - React entrypoint used by Vite
  - Mounts the app and loads global styles
- `styles.css`
  - Global styling for the entire application
  - Includes tile layout, modal, timeline, compose, inspect, and utility styles
- `hooks/useElementSize.ts`
  - Small DOM measurement hook used by the workspace layout

## `src/components`

Reusable UI building blocks that are not tied to a single feature.

### `src/components/ui`

Generic UI primitives.

- `Button.tsx`
  - Standard button and icon button wrappers
- `Field.tsx`
  - Small form helpers such as field rows, labels, inputs, selects, and textareas
- `Modal.tsx`
  - Shared modal shell with escape-to-close and backdrop click handling
- `Pill.tsx`
  - Small pill-style status and metadata element

### `src/components/icons`

Shared icon components.

- `icons.tsx`
  - Icon set used across tiles, actions, and headers

### `src/components/post`

Shared post/media presentation components.

- `PostCard.tsx`
  - Common post renderer used by timeline and inspect views
  - Handles CW, renotes, replies, reactions, media, and action buttons
- `MediaLightboxModal.tsx`
  - Full-screen image viewer with next/previous navigation and scroll support

## `src/connectors`

Connector abstractions intended for multi-service support.

- `connector.ts`
  - Draft connector contract for services beyond the current Misskey implementation

## `src/domain`

App-wide normalized domain types.

- `types.ts`
  - Shared data model for authors, posts, notifications, cursors, requests, and related types

## `src/features`

Feature-oriented UI modules. These files are tied to product behavior rather than shared primitives.

### `src/features/workspace`

Workspace and tile-management UI.

- `AddTileModal.tsx`
  - Modal used to create a new tile
- `EditTileModal.tsx`
  - Modal used to edit an existing tile kind, title, and size
- `TileView.tsx`
  - Per-tile chrome, header, menu, and feature selection
- `TiledLayout.tsx`
  - Recursive tile layout renderer for split trees

### `src/features/timeline`

Timeline reading, reactions, and related interactions.

- `TileTimeline.tsx`
  - Main timeline tile implementation
  - Fetches, streams, paginates, and wires post actions
- `EmojiPickerModal.tsx`
  - Reaction picker modal
- `PostActionModal.tsx`
  - Quote/reply posting modal
- `VirtualList.tsx`
  - Lightweight virtualization helper for long timelines
- `mockData.ts`
  - Mock timeline data used as fallback or for non-wired tile kinds

### `src/features/compose`

Post creation UI.

- `TileCompose.tsx`
  - Compose tile for creating new notes and replies

### `src/features/inspect`

Detailed inspection UI for clicked posts and users.

- `TileInspect.tsx`
  - Shows profile-like user details or detailed post view with replies

### `src/features/settings`

Application settings and account management.

- `SettingsModal.tsx`
  - Misskey account connection, reconnection, and disconnect UI

## `src/integrations`

Service-specific and persistence-specific integrations.

### `src/integrations/misskey`

Misskey-specific API and protocol handling.

- `api.ts`
  - Misskey REST helpers and Misskey-to-domain normalization
- `authCallback.ts`
  - Hash-route callback handling for MiAuth
- `emojis.ts`
  - Emoji lookup, cache, and resolver helpers
- `miauth.ts`
  - MiAuth start/finish logic
- `streaming.ts`
  - Timeline WebSocket streaming integration

### `src/integrations/storage`

Low-level persistence adapters.

- `idb.ts`
  - Minimal IndexedDB key-value wrapper

## `src/mfm`

Misskey-flavored markdown rendering.

- `renderMfm.tsx`
  - Safe subset MFM renderer used by posts and some name rendering paths

## `src/state`

State containers, reducers, persistence, and event buses.

### `src/state/accounts`

Account state and storage.

- `accountsStore.ts`
  - Loads, saves, updates, and removes connected accounts
  - Emits account-change events for dependent UI refresh

### `src/state/events`

Cross-feature event buses.

- `composeBus.ts`
  - Sends reply intents into compose tiles
- `inspectBus.ts`
  - Sends inspect intents into inspect tiles

### `src/state/workspace`

Workspace data model and persistence.

- `WorkspaceProvider.tsx`
  - React context provider for workspace state
- `layoutTypes.ts`
  - Split-tree layout types and tree helpers
- `tileTypes.ts`
  - Tile and workspace type definitions
- `workspaceReducer.ts`
  - Tile and layout state transitions
- `workspaceStore.ts`
  - Local storage persistence and migration for workspace data
