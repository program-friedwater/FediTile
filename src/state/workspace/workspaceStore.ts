import type { LayoutNode } from "./layoutTypes";
import type { TabId, TabWorkspace, Tile, Workspace } from "./tileTypes";
import { buildRowLayout } from "./workspaceReducer";

const STORAGE_KEY = "feditile.workspace.v2";

type WorkspaceV2 = {
  version: 2;
  layout: LayoutNode;
  tiles: Tile[];
  widthPx?: number;
  updatedAt: string;
};

function newTabId(): TabId {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return (`tab_${hex}` as TabId);
}

function migrateV2ToV3(old: WorkspaceV2): Workspace {
  const tab: TabWorkspace = {
    id: newTabId(),
    title: "Tab 1",
    layout: old.layout,
    tiles: old.tiles,
    widthPx: old.widthPx,
    updatedAt: old.updatedAt ?? new Date().toISOString(),
  };
  return {
    version: 3,
    activeTabId: tab.id,
    tabs: [tab],
    updatedAt: old.updatedAt ?? new Date().toISOString(),
  };
}

export function loadWorkspace(): Workspace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace | WorkspaceV2;
      if (!parsed) return null;
      if ((parsed as Workspace).version === 3 && Array.isArray((parsed as Workspace).tabs)) return parsed as Workspace;
      if ((parsed as WorkspaceV2).version === 2 && Array.isArray((parsed as WorkspaceV2).tiles) && (parsed as WorkspaceV2).layout) {
        const migrated = migrateV2ToV3(parsed as WorkspaceV2);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return null;
    }

    const rawV1 = localStorage.getItem("feditile.workspace.v1");
    if (!rawV1) return null;
    const parsedV1 = JSON.parse(rawV1) as any;
    if (!parsedV1 || parsedV1.version !== 1 || !Array.isArray(parsedV1.tiles)) return null;
    const old: WorkspaceV2 = {
      version: 2,
      tiles: parsedV1.tiles as Tile[],
      layout: buildRowLayout((parsedV1.tiles as Tile[]).map((t) => t.id)),
      updatedAt: parsedV1.updatedAt ?? new Date().toISOString(),
    };
    const migrated = migrateV2ToV3(old);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function saveWorkspace(ws: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
}
