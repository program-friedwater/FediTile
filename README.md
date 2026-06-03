# FediTile

A tile-based (multi-column / multi-panel) viewer focused on timelines, targeting the Fediverse and beyond.

- Timeline-first (you open the app and timelines start moving immediately)
- Prioritized services: Misskey / Mastodon / Pixelfed / PeerTube / Lemmy
- Connector-based architecture to add more services later

Design docs live in `docs/`.


## Desktop app (Tauri)

This project has been migrated from the previous Electron shell to **Tauri v2**.

### Requirements

- Node.js compatible with Vite 5
- Rust toolchain (`rustup`, stable)
- Tauri OS prerequisites for your platform

### Commands

```bash
npm install
npm run dev          # Web only
npm run tauri:dev    # Desktop development
npm run tauri:build  # Build desktop bundles
```

The old Electron entry points were removed. The desktop bridge now uses `src/app/desktop.ts` and keeps the existing `window.feditileDesktop` interface so the React side only needed minimal changes.

Misskey MiAuth desktop callback handling was moved from `electron/main.mjs` into `src-tauri/src/lib.rs`. Tauri starts a local callback server on `127.0.0.1` and emits `feditile://auth-callback` to the frontend.
