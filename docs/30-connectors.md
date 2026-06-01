# Connector Spec (the key to multi-service support)

## Principles
- UI reads only the normalized model (no dependency on service-specific response shapes)
- Each connector declares capabilities; UI follows them
- If streaming is unavailable, automatically fall back to polling

## Connector responsibilities
- Auth: OAuth PKCE / token / API key / etc.
- Timelines: `kind` (home/local/federated/hashtag/search/...) + `cursor` paging
- Thread/detail: fetch conversation when possible
- Notifications: cursor-based paging
- Actions: post/reply/react/repost/bookmark/follow... (as supported)

## Extensibility for “more services”
### 1) Connector (code)
- Implement in code when differences are significant (auth, WebSocket, unique concepts)

### 2) Service descriptor (declarative)
- `serviceId`, `displayName`
- `authSchemes` (`oauth-pkce` / `token` / `none`)
- `supportedTimelineKinds`
- `defaultCapabilities`
- Keep room to connect “simple REST services” mostly via declaration later

## Reference
- Interface draft: `src/connectors/connector.ts`
