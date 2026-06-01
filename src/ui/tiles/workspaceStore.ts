import type { Workspace } from "./tileTypes";
import { buildRowLayout } from "./workspaceReducer";

const STORAGE_KEY = "feditile.workspace.v2";

export function loadWorkspace(): Workspace | null {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Workspace;
      if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.tiles) || !parsed.layout) return null;
      return parsed;
    }

    // migration from v1
    const rawV1 = localStorage.getItem("feditile.workspace.v1");
    if (!rawV1) return null;
    const parsedV1 = JSON.parse(rawV1) as any;
    if (!parsedV1 || parsedV1.version !== 1 || !Array.isArray(parsedV1.tiles)) return null;
    const tiles = parsedV1.tiles as Workspace["tiles"];
    const layout = buildRowLayout(tiles.map((t) => t.id));
    const migrated: Workspace = {
      version: 2,
      tiles,
      layout,
      updatedAt: parsedV1.updatedAt ?? new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function saveWorkspace(ws: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
}
