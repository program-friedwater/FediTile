import { useEffect, useMemo, useState } from "react";
import { WorkspaceProvider, useWorkspace } from "../state/workspace/WorkspaceProvider";
import { AddTileModal } from "../features/workspace/AddTileModal";
import { createDefaultWorkspace } from "../state/workspace/workspaceReducer";
import type { TileId } from "../state/workspace/tileTypes";
import { useElementSize } from "./hooks/useElementSize";
import { TiledLayout } from "../features/workspace/TiledLayout";
import { SettingsModal } from "../features/settings/SettingsModal";
import { handleMisskeyAuthCallback } from "../integrations/misskey/authCallback";
import { EditTileModal } from "../features/workspace/EditTileModal";
import type { Tile } from "../state/workspace/tileTypes";

function WorkspaceScreen() {
  const { workspace, dispatch } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTileId, setActiveTileId] = useState<TileId | null>(workspace.tiles[0]?.id ?? null);
  const gridSize = useElementSize<HTMLDivElement>();
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTile, setEditTile] = useState<Tile | null>(null);

  const tileCount = workspace.tiles.length;
  const subtitle = useMemo(() => {
    if (tileCount === 0) return "No tiles yet. Add one to get started.";
    return `${tileCount} tile${tileCount === 1 ? "" : "s"} • timeline-first`;
  }, [tileCount]);

  return (
    <div className="appShell">
      <main className="workspace" data-modal-open={settingsOpen ? "true" : "false"}>
        <div className="noise" aria-hidden="true" />
        <div className="bottomReveal" aria-hidden="true" />
        <div className="floatingBar" aria-label="Workspace actions">
          <div className="floatingTitle">
            <span className="floatingBrand">FediTile</span>
            <span className="floatingSub">{subtitle}</span>
          </div>
          <div className="floatingActions">
            <button className="btn" onClick={() => setAddOpen(true)}>
              Add tile
            </button>
            <button className="btn" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button
              className="btn btnDanger"
              onClick={() => {
                dispatch({ type: "workspace/reset", workspace: createDefaultWorkspace() });
              }}
              title="Reset workspace (local only)"
            >
              Reset
            </button>
          </div>
        </div>
        {workspace.tiles.length === 0 ? (
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
              if (e.key === "ArrowLeft") {
                dispatch({ type: "tile/move", id: activeTileId, delta: -1 });
                e.preventDefault();
              } else if (e.key === "ArrowRight") {
                dispatch({ type: "tile/move", id: activeTileId, delta: 1 });
                e.preventDefault();
              } else if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
                setAddOpen(true);
                e.preventDefault();
              }
            }}
            style={{ outline: "none" }}
          >
            <TiledLayout
              layout={workspace.layout}
              tilesById={new Map(workspace.tiles.map((t) => [t.id, t]))}
              activeTileId={activeTileId}
              onActivate={(id) => setActiveTileId(id)}
              onSplit={(targetId, dir) => {
                dispatch({
                  type: "layout/split",
                  targetId,
                  dir,
                  newTile: { title: dir === "row" ? "Split" : "Split", query: { kind: "local" }, size: "m" },
                });
              }}
              onSetSplitRatio={(path, ratio) => dispatch({ type: "layout/setRatio", path, ratio })}
              onRemove={(id) => dispatch({ type: "tile/remove", id })}
              onRename={(id, title) => dispatch({ type: "tile/rename", id, title })}
              onEdit={(id) => {
                const t = workspace.tiles.find((x) => x.id === id) ?? null;
                setEditTile(t);
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
          if (workspace.tiles.length === 0) {
            dispatch({ type: "tile/add", tile });
            return;
          }

          const leaves = gridEl?.querySelectorAll<HTMLDivElement>(".tiledLeaf[data-tileid]") ?? [];
          let best: { id: TileId; area: number } | null = null;
          leaves.forEach((el) => {
            const id = el.dataset.tileid as TileId | undefined;
            if (!id) return;
            const r = el.getBoundingClientRect();
            const area = Math.max(0, r.width) * Math.max(0, r.height);
            if (!best || area > best.area) best = { id, area };
          });

          const targetId = (((best as any)?.id ?? (workspace.tiles as any[])?.[0]?.id) as TileId | undefined) ?? undefined;
          if (!targetId) return;
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
  return (
    <WorkspaceProvider>
      <WorkspaceScreen />
    </WorkspaceProvider>
  );
}
