# Mastodon Preparation

## Purpose

This document describes the groundwork added before full Mastodon support is implemented.

## What Is Ready

- A `mastodon` account type now exists in the shared account store.
- The account store can persist Mastodon accounts separately from Misskey accounts.
- Mastodon OAuth PKCE helpers are available.
- Mastodon API endpoint helpers and timeline path mapping are available.

## Entry Points

- Account types: `/Users/agemizu/Documents/FediTile/src/state/accounts/accountTypes.ts`
- Shared account persistence: `/Users/agemizu/Documents/FediTile/src/state/accounts/accountsStore.ts`
- OAuth helpers: `/Users/agemizu/Documents/FediTile/src/integrations/mastodon/oauth.ts`
- API helpers: `/Users/agemizu/Documents/FediTile/src/integrations/mastodon/api.ts`

## Next Implementation Steps

1. Register Mastodon applications dynamically with `/api/v1/apps`
2. Complete OAuth token exchange with `/oauth/token`
3. Normalize Mastodon statuses into the shared `Post` type
4. Add Mastodon timeline fetching
5. Add Mastodon streaming support
6. Extend Settings UI to connect and select Mastodon accounts

## Notes

- Current UI still only exposes Misskey login flows.
- This change is intended to keep future Mastodon work isolated and low-risk.
