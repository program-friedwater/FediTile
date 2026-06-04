import { useEffect, useMemo, useRef, useState } from "react";
import type { Tile, TileId } from "../state/workspace/tileTypes";
import { WorkspaceProvider, useWorkspace } from "../state/workspace/WorkspaceProvider";
import { createDefaultWorkspace } from "../state/workspace/workspaceReducer";
import { handleMisskeyAuthCallback } from "../integrations/misskey/authCallback";
import { useElementSize } from "./hooks/useElementSize";
import { TiledLayout } from "../features/workspace/TiledLayout";
import { AddTileModal } from "../features/workspace/AddTileModal";
import { EditTileModal } from "../features/workspace/EditTileModal";
import { WorkspaceTabs } from "../features/workspace/WorkspaceTabs";
import { SettingsModal } from "../features/settings/SettingsModal";

function WorkspaceScreen() {
  const { workspace, dispatch } = useWorkspace();
  const activeTab = workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? workspace.tabs[0] ?? null;
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTileIds, setActiveTileIds] = useState<Record<string, TileId | null>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editTile, setEditTile] = useState<Tile | null>(null);
  const [reconnectToken, setReconnectToken] = useState(0);
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridSize = useElementSize<HTMLDivElement>();

  useEffect(() => {
    setActiveTileIds((prev) => {
      const next = { ...prev };
      for (const tab of workspace.tabs) {
        if (!(tab.id in next)) next[tab.id] = tab.tiles[0]?.id ?? null;
        else if (next[tab.id] && !tab.tiles.some((tile) => tile.id === next[tab.id])) next[tab.id] = tab.tiles[0]?.id ?? null;
      }
      return next;
    });
  }, [workspace.tabs]);

  const tileCount = activeTab?.tiles.length ?? 0;
  const subtitle = useMemo(() => (tileCount === 0 ? "No tiles yet. Add one to get started." : `${tileCount} tile${tileCount === 1 ? "" : "s"} • timeline-first`), [tileCount]);
  const activeTabIndex = activeTab ? workspace.tabs.findIndex((tab) => tab.id === activeTab.id) : -1;
  const activeTileId = activeTab ? (activeTileIds[activeTab.id] ?? activeTab.tiles[0]?.id ?? null) : null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        !!target?.closest("[contenteditable='true']");
      if (typing) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (activeTabIndex < 0) return;
      const nextIndex = e.key === "ArrowLeft" ? Math.max(0, activeTabIndex - 1) : Math.min(workspace.tabs.length - 1, activeTabIndex + 1);
      const nextTab = workspace.tabs[nextIndex];
      if (!nextTab) return;
      dispatch({ type: "tab/activate", id: nextTab.id });
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTabIndex, dispatch, workspace.tabs]);

  return (
    <div className="appShell">
      <main className="workspace" data-modal-open={settingsOpen ? "true" : "false"}>
        <div className="noise" aria-hidden="true" />
        <WorkspaceTabs
          tabs={workspace.tabs}
          activeTabId={workspace.activeTabId}
          onActivate={(id) => dispatch({ type: "tab/activate", id })}
          onAdd={() => dispatch({ type: "tab/add" })}
          onRename={(id, title) => dispatch({ type: "tab/rename", id, title })}
          onRemove={(id) => dispatch({ type: "tab/remove", id })}
        />
        <div className="bottomReveal" aria-hidden="true" />
        <div className="floatingBar" aria-label="Workspace actions">
          <div className="floatingTitle">
            <span className="floatingBrand">FediTile</span>
            <span className="floatingSub">{subtitle}</span>
          </div>
          <div className="floatingActions">
            <button className="btn" onClick={() => setAddOpen(true)}>Add tile</button>
            <button className="btn" onClick={() => setReconnectToken((n) => n + 1)}>Reconnect</button>
            <button className="btn" onClick={() => setSettingsOpen(true)}>Settings</button>
          </div>
        </div>
        {!activeTab || activeTab.tiles.length === 0 ? (
          <div className="emptyState">Add your first tile.</div>
        ) : (
          workspace.tabs.map((tab) => (
            <div
              key={tab.id}
              className="grid"
              data-active={tab.id === workspace.activeTabId ? "true" : "false"}
              ref={(el) => {
                if (tab.id === workspace.activeTabId) gridSize.ref(el);
                gridRefs.current[tab.id] = el;
              }}
              tabIndex={tab.id === workspace.activeTabId ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "a" && (e.metaKey || e.ctrlKey)) setAddOpen(true);
              }}
              style={{ outline: "none", display: tab.id === workspace.activeTabId ? undefined : "none" }}
            >
              <TiledLayout
                layout={tab.layout}
                tilesById={new Map(tab.tiles.map((t) => [t.id, t]))}
                activeTileId={activeTileIds[tab.id] ?? tab.tiles[0]?.id ?? null}
                reconnectToken={reconnectToken}
                onActivate={(id) => setActiveTileIds((prev) => ({ ...prev, [tab.id]: id }))}
                onSwap={(id, targetId) => dispatch({ type: "tile/swap", id, targetId })}
                onSplit={(targetId, dir) => dispatch({ type: "layout/split", targetId, dir, newTile: { title: "Split", query: { kind: "local" }, size: "m" } })}
                onSetSplitRatio={(path, ratio) => dispatch({ type: "layout/setRatio", path, ratio })}
                onRemove={(id) => dispatch({ type: "tile/remove", id })}
                onRename={(id, title) => dispatch({ type: "tile/rename", id, title })}
                onEdit={(id) => {
                  setEditTile(tab.tiles.find((x) => x.id === id) ?? null);
                  setEditOpen(true);
                }}
              />
            </div>
          ))
        )}
      </main>

      <AddTileModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(tile) => {
          if (!activeTab || activeTab.tiles.length === 0) return dispatch({ type: "tile/add", tile });
          const leaves = gridRefs.current[activeTab.id]?.querySelectorAll<HTMLDivElement>(".tiledLeaf[data-tileid]") ?? [];
          let best: { id: TileId; area: number } | null = null;
          leaves.forEach((el) => {
            const id = el.dataset.tileid as TileId | undefined;
            if (!id) return;
            const r = el.getBoundingClientRect();
            const area = Math.max(0, r.width) * Math.max(0, r.height);
            if (!best || area > best.area) best = { id, area };
          });
          const targetId = (best as { id: TileId; area: number } | null)?.id ?? activeTab.tiles[0].id;
          dispatch({ type: "layout/split", targetId, dir: "row", newTile: tile });
        }}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetWorkspace={() => dispatch({ type: "workspace/reset", workspace: createDefaultWorkspace() })}
      />
      <EditTileModal
        isOpen={editOpen}
        tile={editTile}
        onClose={() => setEditOpen(false)}
        onSave={(next) => {
          if (!editTile) return;
          dispatch({ type: "tile/setQuery", id: editTile.id, query: next.query, title: next.title });
          dispatch({ type: "tile/resize", id: editTile.id, size: next.size });
        }}
      />
    </div>
  );
}

export function App() {
  useEffect(() => {
    handleMisskeyAuthCallback();
  }, []);
  return <WorkspaceProvider><WorkspaceScreen /></WorkspaceProvider>;
}
