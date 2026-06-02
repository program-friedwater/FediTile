import type { TimelineKind } from "../../domain/types";

export type TileId = string & { readonly __brand: "TileId" };

export type TileSize = "s" | "m" | "l";

export type TileQuery =
  | { kind: "home" }
  | { kind: "local" }
  | { kind: "social" }
  | { kind: "federated" }
  | { kind: "hashtag"; tag: string }
  | { kind: "search"; q: string }
  | { kind: "notifications" }
  | { kind: "compose" }
  | { kind: "inspect" };

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
    case "social":
      return "Social";
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
    case "inspect":
      return "Inspect";
    default:
      return String(kind);
  }
}

// (icons removed; keep UI minimal)
