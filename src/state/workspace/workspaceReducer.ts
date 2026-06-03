import type { LayoutNode } from "./layoutTypes";
import { clampRatio, findLeafPath, pruneMissingTiles, removeTileFromLayout, setNodeAtPath } from "./layoutTypes";
import type { TabId, TabWorkspace, Tile, TileId, TileQuery, TileSize, Workspace } from "./tileTypes";

function nowIso() {
  return new Date().toISOString();
}

function newTileId(): TileId {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return (`t_${hex}` as TileId);
}

function newTabId(): TabId {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return (`tab_${hex}` as TabId);
}

export type WorkspaceAction =
  | { type: "tab/add" }
  | { type: "tab/remove"; id: TabId }
  | { type: "tab/activate"; id: TabId }
  | { type: "tab/rename"; id: TabId; title: string }
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
  | { type: "workspace/setWidthPx"; widthPx: number }
  | { type: "workspace/reset"; workspace: Workspace };

export function buildRowLayout(tileIds: TileId[]): LayoutNode {
  if (tileIds.length === 0) throw new Error("buildRowLayout requires at least 1 tile");
  let node: LayoutNode = { type: "leaf", tileId: tileIds[0] };
  for (let i = 1; i < tileIds.length; i++) node = { type: "split", dir: "row", ratio: 0.5, a: node, b: { type: "leaf", tileId: tileIds[i] } };
  return node;
}

function createTile(args: { title: string; query: TileQuery; size: TileSize }, now: string): Tile {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return {
    id: newTileId(),
    title: args.title,
    query: args.query,
    size: args.size,
    widthPx: Math.round(vw / 4),
    heightPx: Math.round(vh / 2),
    refreshMode: "polling",
    createdAt: now,
    updatedAt: now,
  };
}

function createTab(title: string, now: string): TabWorkspace {
  return {
    id: newTabId(),
    title,
    layout: { type: "leaf", tileId: ("t_none" as unknown) as TileId },
    tiles: [],
    updatedAt: now,
  };
}

function getActiveTab(state: Workspace) {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0] ?? null;
}

function updateActiveTab(state: Workspace, nextTab: TabWorkspace, now: string): Workspace {
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.id === nextTab.id ? { ...nextTab, updatedAt: now } : tab)),
    updatedAt: now,
  };
}

export function createDefaultWorkspace(): Workspace {
  const now = nowIso();
  const tiles = [
    createTile({ title: "Home", query: { kind: "home" }, size: "m" }, now),
    createTile({ title: "Local", query: { kind: "local" }, size: "m" }, now),
    createTile({ title: "Notifications", query: { kind: "notifications" }, size: "s" }, now),
  ];
  const tab: TabWorkspace = { id: newTabId(), title: "Tab 1", tiles, layout: buildRowLayout(tiles.map((x) => x.id)), updatedAt: now };
  return { version: 3, activeTabId: tab.id, tabs: [tab], updatedAt: now };
}

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  const now = nowIso();
  const activeTab = getActiveTab(state);
  if (!activeTab && action.type !== "workspace/reset" && action.type !== "tab/add") return state;

  switch (action.type) {
    case "tab/add": {
      const next = createTab(`Tab ${state.tabs.length + 1}`, now);
      return { ...state, activeTabId: next.id, tabs: [...state.tabs, next], updatedAt: now };
    }
    case "tab/remove": {
      if (state.tabs.length <= 1) return state;
      const idx = state.tabs.findIndex((tab) => tab.id === action.id);
      if (idx < 0) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      const fallback = tabs[Math.max(0, idx - 1)] ?? tabs[0];
      return { ...state, tabs, activeTabId: state.activeTabId === action.id ? fallback.id : state.activeTabId, updatedAt: now };
    }
    case "tab/activate":
      return state.tabs.some((tab) => tab.id === action.id) ? { ...state, activeTabId: action.id, updatedAt: now } : state;
    case "tab/rename":
      return { ...state, tabs: state.tabs.map((tab) => (tab.id === action.id ? { ...tab, title: action.title, updatedAt: now } : tab)), updatedAt: now };
    case "tile/add": {
      if (!activeTab) return state;
      const tile = createTile(action.tile, now);
      const layout = activeTab.tiles.length === 0 ? ({ type: "leaf", tileId: tile.id } as LayoutNode) : buildRowLayout([tile.id, ...activeTab.tiles.map((x) => x.id)]);
      return updateActiveTab(state, { ...activeTab, tiles: [tile, ...activeTab.tiles], layout }, now);
    }
    case "tile/remove": {
      if (!activeTab) return state;
      const tiles = activeTab.tiles.filter((x) => x.id !== action.id);
      if (tiles.length === activeTab.tiles.length) return state;
      const removed = removeTileFromLayout(activeTab.layout, action.id);
      const existing = new Set(tiles.map((x) => x.id));
      const pruned = removed.next ? pruneMissingTiles(removed.next, existing) : null;
      const layout = tiles.length === 0 ? ({ type: "leaf", tileId: ("t_none" as unknown) as TileId } as LayoutNode) : pruned ?? ({ type: "leaf", tileId: tiles[0].id } as LayoutNode);
      return updateActiveTab(state, { ...activeTab, tiles, layout }, now);
    }
    case "tile/move": {
      if (!activeTab) return state;
      const idx = activeTab.tiles.findIndex((x) => x.id === action.id);
      const next = idx + action.delta;
      if (idx < 0 || next < 0 || next >= activeTab.tiles.length) return state;
      const tiles = activeTab.tiles.slice();
      const [item] = tiles.splice(idx, 1);
      tiles.splice(next, 0, item);
      return updateActiveTab(state, { ...activeTab, tiles, layout: buildRowLayout(tiles.map((x) => x.id)) }, now);
    }
    case "tile/resize":
      return updateActiveTab(state, { ...activeTab!, tiles: activeTab!.tiles.map((x) => (x.id === action.id ? { ...x, size: action.size, widthPx: undefined, updatedAt: now } : x)) }, now);
    case "tile/setWidthPx":
      return updateActiveTab(state, { ...activeTab!, tiles: activeTab!.tiles.map((x) => (x.id === action.id ? { ...x, widthPx: action.widthPx, updatedAt: now } : x)) }, now);
    case "tile/setHeightPx":
      return updateActiveTab(state, { ...activeTab!, tiles: activeTab!.tiles.map((x) => (x.id === action.id ? { ...x, heightPx: action.heightPx, updatedAt: now } : x)) }, now);
    case "tile/rename":
      return updateActiveTab(state, { ...activeTab!, tiles: activeTab!.tiles.map((x) => (x.id === action.id ? { ...x, title: action.title, updatedAt: now } : x)) }, now);
    case "tile/setQuery":
      return updateActiveTab(state, { ...activeTab!, tiles: activeTab!.tiles.map((x) => (x.id === action.id ? { ...x, query: action.query, title: action.title ?? x.title, updatedAt: now } : x)) }, now);
    case "layout/split": {
      if (!activeTab) return state;
      if (activeTab.tiles.length === 0) {
        const tile = createTile(action.newTile, now);
        return updateActiveTab(state, { ...activeTab, tiles: [tile], layout: { type: "leaf", tileId: tile.id } }, now);
      }
      const path = findLeafPath(activeTab.layout, action.targetId);
      if (!path) return state;
      const newTile = createTile(action.newTile, now);
      const split: LayoutNode = { type: "split", dir: action.dir, ratio: 0.5, a: { type: "leaf", tileId: action.targetId }, b: { type: "leaf", tileId: newTile.id } };
      return updateActiveTab(state, { ...activeTab, tiles: [newTile, ...activeTab.tiles], layout: setNodeAtPath(activeTab.layout, path, split) }, now);
    }
    case "layout/setRatio": {
      const node = (function get(root: LayoutNode, path: Array<"a" | "b">): LayoutNode {
        let cur = root;
        for (const s of path) {
          if (cur.type !== "split") return root;
          cur = s === "a" ? cur.a : cur.b;
        }
        return cur;
      })(activeTab!.layout, action.path);
      if (node.type !== "split") return state;
      return updateActiveTab(state, { ...activeTab!, layout: setNodeAtPath(activeTab!.layout, action.path, { ...node, ratio: clampRatio(action.ratio) }) }, now);
    }
    case "workspace/setWidthPx":
      return updateActiveTab(state, { ...activeTab!, widthPx: action.widthPx }, now);
    case "workspace/reset":
      return action.workspace;
    default:
      return state;
  }
}
