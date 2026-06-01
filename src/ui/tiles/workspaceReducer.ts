import type { Tile, TileId, TileQuery, TileSize, Workspace } from "./tileTypes";
import type { LayoutNode } from "./layoutTypes";
import { clampRatio, findLeafPath, pruneMissingTiles, removeTileFromLayout, setNodeAtPath } from "./layoutTypes";

function nowIso() {
  return new Date().toISOString();
}

function newId(): TileId {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return (`t_${hex}` as TileId);
}

export type WorkspaceAction =
  | { type: "tile/add"; tile: { title: string; query: TileQuery; size: TileSize } }
  | { type: "tile/remove"; id: TileId }
  | { type: "tile/move"; id: TileId; delta: -1 | 1 }
  | { type: "tile/resize"; id: TileId; size: TileSize }
  | { type: "tile/setWidthPx"; id: TileId; widthPx: number }
  | { type: "tile/setHeightPx"; id: TileId; heightPx: number }
  | { type: "tile/rename"; id: TileId; title: string }
  | { type: "tile/setQuery"; id: TileId; query: TileQuery; title?: string }
  | { type: "layout/split"; targetId: TileId; dir: "row" | "col"; newTile: { title: string; query: TileQuery; size: TileSize } }
  | { type: "layout/setRatio"; path: Array<"a" | "b">; ratio: number }
  | { type: "workspace/reset"; workspace: Workspace };

export function buildRowLayout(tileIds: TileId[]): LayoutNode {
  if (tileIds.length === 0) throw new Error("buildRowLayout requires at least 1 tile");
  let node: LayoutNode = { type: "leaf", tileId: tileIds[0] };
  for (let i = 1; i < tileIds.length; i++) {
    node = { type: "split", dir: "row", ratio: 0.5, a: node, b: { type: "leaf", tileId: tileIds[i] } };
  }
  return node;
}

export function createDefaultWorkspace(): Workspace {
  const t = nowIso();
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tiles: Tile[] = [
    {
      id: newId(),
      title: "Home",
      query: { kind: "home" },
      size: "m",
      widthPx: Math.round(vw / 4),
      heightPx: Math.round(vh / 2),
      refreshMode: "polling",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: newId(),
      title: "Local",
      query: { kind: "local" },
      size: "m",
      widthPx: Math.round(vw / 4),
      heightPx: Math.round(vh / 2),
      refreshMode: "polling",
      createdAt: t,
      updatedAt: t,
    },
    {
      id: newId(),
      title: "Notifications",
      query: { kind: "notifications" },
      size: "s",
      widthPx: Math.round(vw / 4),
      heightPx: Math.round(vh / 2),
      refreshMode: "polling",
      createdAt: t,
      updatedAt: t,
    },
  ];
  return { version: 2, tiles, layout: buildRowLayout(tiles.map((x) => x.id)), updatedAt: t };
}

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  const t = nowIso();
  switch (action.type) {
    case "tile/add": {
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const tile: Tile = {
        id: newId(),
        title: action.tile.title,
        query: action.tile.query,
        size: action.tile.size,
        widthPx: Math.round(vw / 4),
        heightPx: Math.round(vh / 2),
        refreshMode: "polling",
        createdAt: t,
        updatedAt: t,
      };
      const layout = state.tiles.length === 0 ? { type: "leaf", tileId: tile.id } : buildRowLayout([tile.id, ...state.tiles.map((x) => x.id)]);
      return { ...state, tiles: [tile, ...state.tiles], layout, updatedAt: t };
    }
    case "tile/remove": {
      const tiles = state.tiles.filter((x) => x.id !== action.id);
      if (state.tiles.length === tiles.length) return state;

      if (tiles.length === 0) {
        // Keep a placeholder root; renderer will show empty.
        const layout = { type: "leaf", tileId: ("t_none" as unknown) as TileId } as LayoutNode;
        return { ...state, tiles, layout, updatedAt: t };
      }

      const removed = removeTileFromLayout(state.layout, action.id);
      const existing = new Set(tiles.map((x) => x.id));
      const pruned = removed.next ? pruneMissingTiles(removed.next, existing) : null;
      const layout = pruned ?? ({ type: "leaf", tileId: tiles[0].id } as LayoutNode);

      return { ...state, tiles, layout, updatedAt: t };
    }
    case "tile/move": {
      const idx = state.tiles.findIndex((x) => x.id === action.id);
      if (idx < 0) return state;
      const next = idx + action.delta;
      if (next < 0 || next >= state.tiles.length) return state;
      const tiles = state.tiles.slice();
      const [item] = tiles.splice(idx, 1);
      tiles.splice(next, 0, item);
      return { ...state, tiles, layout: buildRowLayout(tiles.map((x) => x.id)), updatedAt: t };
    }
    case "tile/resize": {
      return {
        ...state,
        tiles: state.tiles.map((x) =>
          x.id === action.id ? { ...x, size: action.size, widthPx: undefined, updatedAt: t } : x,
        ),
        updatedAt: t,
      };
    }
    case "tile/setWidthPx": {
      return {
        ...state,
        tiles: state.tiles.map((x) => (x.id === action.id ? { ...x, widthPx: action.widthPx, updatedAt: t } : x)),
        updatedAt: t,
      };
    }
    case "tile/setHeightPx": {
      return {
        ...state,
        tiles: state.tiles.map((x) => (x.id === action.id ? { ...x, heightPx: action.heightPx, updatedAt: t } : x)),
        updatedAt: t,
      };
    }
    case "tile/rename": {
      return {
        ...state,
        tiles: state.tiles.map((x) => (x.id === action.id ? { ...x, title: action.title, updatedAt: t } : x)),
        updatedAt: t,
      };
    }
    case "tile/setQuery": {
      return {
        ...state,
        tiles: state.tiles.map((x) =>
          x.id === action.id
            ? {
                ...x,
                query: action.query,
                title: action.title ?? x.title,
                updatedAt: t,
              }
            : x,
        ),
        updatedAt: t,
      };
    }
    case "layout/split": {
      const path = findLeafPath(state.layout, action.targetId);
      if (!path) return state;

      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const newTile: Tile = {
        id: newId(),
        title: action.newTile.title,
        query: action.newTile.query,
        size: action.newTile.size,
        widthPx: Math.round(vw / 4),
        heightPx: Math.round(vh / 2),
        refreshMode: "polling",
        createdAt: t,
        updatedAt: t,
      };

      const nextLeaf: LayoutNode = { type: "leaf", tileId: newTile.id };
      const split: LayoutNode = { type: "split", dir: action.dir, ratio: 0.5, a: { type: "leaf", tileId: action.targetId }, b: nextLeaf };
      const layout = setNodeAtPath(state.layout, path, split);
      return { ...state, tiles: [newTile, ...state.tiles], layout, updatedAt: t };
    }
    case "layout/setRatio": {
      const ratio = clampRatio(action.ratio);
      const node = (function get(root: LayoutNode, path: Array<"a" | "b">): LayoutNode {
        let cur = root;
        for (const s of path) {
          if (cur.type !== "split") return root;
          cur = s === "a" ? cur.a : cur.b;
        }
        return cur;
      })(state.layout, action.path);
      if (node.type !== "split") return state;
      const nextNode: LayoutNode = { ...node, ratio };
      const layout = setNodeAtPath(state.layout, action.path, nextNode);
      return { ...state, layout, updatedAt: t };
    }
    case "workspace/reset":
      return action.workspace;
    default:
      return state;
  }
}
