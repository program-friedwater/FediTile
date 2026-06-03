import { useEffect, useMemo, useState } from "react";
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
  const [activeTileId, setActiveTileId] = useState<TileId | null>(activeTab?.tiles[0]?.id ?? null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTile, setEditTile] = useState<Tile | null>(null);
  const gridSize = useElementSize<HTMLDivElement>();
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveTileId(activeTab?.tiles[0]?.id ?? null);
  }, [activeTab?.id]);

  const tileCount = activeTab?.tiles.length ?? 0;
  const subtitle = useMemo(() => (tileCount === 0 ? "No tiles yet. Add one to get started." : `${tileCount} tile${tileCount === 1 ? "" : "s"} • timeline-first`), [tileCount]);

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
            <button className="btn" onClick={() => setSettingsOpen(true)}>Settings</button>
            <button className="btn btnDanger" onClick={() => dispatch({ type: "workspace/reset", workspace: createDefaultWorkspace() })}>Reset</button>
          </div>
        </div>
        {!activeTab || activeTab.tiles.length === 0 ? (
          <div className="emptyState">Add your first tile.</div>
        ) : (
          <div
            className="grid"
            ref={(el) => {
              gridSize.ref(el);
              setGridEl(el);
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!activeTileId) return;
              if (e.key === "ArrowLeft") dispatch({ type: "tile/move", id: activeTileId, delta: -1 });
              else if (e.key === "ArrowRight") dispatch({ type: "tile/move", id: activeTileId, delta: 1 });
              else if (e.key === "a" && (e.metaKey || e.ctrlKey)) setAddOpen(true);
            }}
            style={{ outline: "none" }}
          >
            <TiledLayout
              layout={activeTab.layout}
              tilesById={new Map(activeTab.tiles.map((t) => [t.id, t]))}
              widthPx={activeTab.widthPx}
              activeTileId={activeTileId}
              onActivate={(id) => setActiveTileId(id)}
              onSplit={(targetId, dir) => dispatch({ type: "layout/split", targetId, dir, newTile: { title: "Split", query: { kind: "local" }, size: "m" } })}
              onSetSplitRatio={(path, ratio) => dispatch({ type: "layout/setRatio", path, ratio })}
              onSetWidthPx={(widthPx) => dispatch({ type: "workspace/setWidthPx", widthPx })}
              onRemove={(id) => dispatch({ type: "tile/remove", id })}
              onRename={(id, title) => dispatch({ type: "tile/rename", id, title })}
              onEdit={(id) => {
                setEditTile(activeTab.tiles.find((x) => x.id === id) ?? null);
                setEditOpen(true);
              }}
            />
          </div>
        )}
      </main>

      <AddTileModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(tile) => {
          if (!activeTab || activeTab.tiles.length === 0) return dispatch({ type: "tile/add", tile });
          const leaves = gridEl?.querySelectorAll<HTMLDivElement>(".tiledLeaf[data-tileid]") ?? [];
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
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
