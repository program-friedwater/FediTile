import type { TileId, Workspace } from "./tileTypes";

export type LayoutNode =
  | { type: "leaf"; tileId: TileId }
  | { type: "split"; dir: "row" | "col"; ratio: number; a: LayoutNode; b: LayoutNode };

export function removeTileFromLayout(root: LayoutNode, tileId: TileId): { next: LayoutNode | null; removed: boolean } {
  if (root.type === "leaf") {
    if (root.tileId === tileId) return { next: null, removed: true };
    return { next: root, removed: false };
  }

  const ra = removeTileFromLayout(root.a, tileId);
  const rb = removeTileFromLayout(root.b, tileId);
  const removed = ra.removed || rb.removed;
  if (!removed) return { next: root, removed: false };

  const a = ra.next;
  const b = rb.next;
  if (!a && !b) return { next: null, removed: true };
  if (!a) return { next: b, removed: true };
  if (!b) return { next: a, removed: true };
  return { next: { ...root, a, b }, removed: true };
}

export function pruneMissingTiles(root: LayoutNode, existing: ReadonlySet<TileId>): LayoutNode | null {
  if (root.type === "leaf") return existing.has(root.tileId) ? root : null;
  const a = pruneMissingTiles(root.a, existing);
  const b = pruneMissingTiles(root.b, existing);
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return { ...root, a, b };
}

export function findLeafPath(root: LayoutNode, tileId: TileId): Array<"a" | "b"> | null {
  function walk(node: LayoutNode, path: Array<"a" | "b">): Array<"a" | "b"> | null {
    if (node.type === "leaf") return node.tileId === tileId ? path : null;
    return walk(node.a, path.concat("a")) ?? walk(node.b, path.concat("b"));
  }
  return walk(root, []);
}

export function getNodeAtPath(root: LayoutNode, path: Array<"a" | "b">): LayoutNode {
  let node: LayoutNode = root;
  for (const step of path) {
    if (node.type !== "split") throw new Error("Invalid path");
    node = step === "a" ? node.a : node.b;
  }
  return node;
}

export function setNodeAtPath(root: LayoutNode, path: Array<"a" | "b">, next: LayoutNode): LayoutNode {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (root.type !== "split") throw new Error("Invalid path");
  if (head === "a") return { ...root, a: setNodeAtPath(root.a, rest, next) };
  return { ...root, b: setNodeAtPath(root.b, rest, next) };
}

export function clampRatio(r: number) {
  return Math.max(0.12, Math.min(0.88, r));
}

export function workspaceHasTile(ws: Workspace, tileId: TileId): boolean {
  return ws.tabs.some((tab) => tab.tiles.some((t) => t.id === tileId));
}
