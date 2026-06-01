import type { TimelineKind } from "../../domain/types";

export type TileId = string & { readonly __brand: "TileId" };

export type TileSize = "s" | "m" | "l";

export type TileQuery =
  | { kind: "home" }
  | { kind: "local" }
  | { kind: "federated" }
  | { kind: "hashtag"; tag: string }
  | { kind: "search"; q: string }
  | { kind: "notifications" }
  | { kind: "compose" };

export type Tile = {
  id: TileId;
  title: string;
  query: TileQuery;
  size: TileSize;
  widthPx?: number;
  heightPx?: number;
  refreshMode: "streaming" | "polling" | "manual";
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  version: 2;
  layout: import("./layoutTypes").LayoutNode;
  tiles: Tile[];
  updatedAt: string;
};

export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${String(x)}`);
}

export function tileKindLabel(kind: TimelineKind | TileQuery["kind"]): string {
  switch (kind) {
    case "home":
      return "Home";
    case "local":
      return "Local";
    case "federated":
      return "Federated";
    case "hashtag":
      return "Hashtag";
    case "search":
      return "Search";
    case "notifications":
      return "Notifications";
    case "compose":
      return "Compose";
    default:
      return String(kind);
  }
}

export function tileKindIcon(kind: TileQuery["kind"]): string {
  switch (kind) {
    case "home":
      return "⌂";
    case "local":
      return "⌁";
    case "federated":
      return "◎";
    case "notifications":
      return "🔔";
    case "hashtag":
      return "#";
    case "search":
      return "⌕";
    case "compose":
      return "✎";
    default:
      return "◻";
  }
}
