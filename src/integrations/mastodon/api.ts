import type { TimelineKind } from "../../domain/types";

export const SUPPORTED_MASTODON_TIMELINES: TimelineKind[] = [
  "home",
  "local",
  "federated",
  "notifications",
  "search",
  "trending",
];

export function normalizeMastodonInstanceUrl(raw: string) {
  const value = raw.trim();
  if (!value) throw new Error("Instance URL is empty");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}

export function mastodonApiUrl(instanceUrl: string, path: string) {
  return `${normalizeMastodonInstanceUrl(instanceUrl)}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export function mastodonTimelinePath(kind: TimelineKind) {
  switch (kind) {
    case "home":
      return "/timelines/home";
    case "local":
      return "/timelines/public?local=true";
    case "federated":
      return "/timelines/public";
    case "notifications":
      return "/notifications";
    case "trending":
      return "/trends/statuses";
    case "search":
      return "/search";
    default:
      throw new Error(`Unsupported Mastodon timeline kind: ${kind}`);
  }
}

export function createMastodonHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export function readMastodonMaxId(linkHeader: string | null) {
  if (!linkHeader) return undefined;
  const match = linkHeader.match(/[?&]max_id=([^&>]+).*rel="next"/);
  return match?.[1];
}
