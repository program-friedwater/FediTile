import type { LayoutNode } from "../../state/workspace/layoutTypes";
import type { Tile, TileId } from "../../state/workspace/tileTypes";
import { TileView } from "./TileView";

type Props = {
  layout: LayoutNode;
  tilesById: Map<TileId, Tile>;
  activeTileId: TileId | null;
  onActivate: (id: TileId) => void;
  onSplit: (targetId: TileId, dir: "row" | "col") => void;
  onSetSplitRatio: (path: Array<"a" | "b">, ratio: number) => void;
  onRemove: (id: TileId) => void;
  onRename: (id: TileId, title: string) => void;
  onEdit: (id: TileId) => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function TiledLayout(props: Props) {
  function renderNode(node: LayoutNode, path: Array<"a" | "b">): React.ReactNode {
    if (node.type === "leaf") {
      const tile = props.tilesById.get(node.tileId);
      if (!tile) return null;
      return (
        <div className="tiledLeaf" data-tileid={tile.id}>
          <TileView
            tile={tile}
            active={tile.id === props.activeTileId}
            onActivate={() => props.onActivate(tile.id)}
            onMoveLeft={() => {}}
            onMoveRight={() => {}}
            onResize={() => {}}
            onSetWidthPx={() => {}}
            onSetHeightPx={() => {}}
            onRemove={() => props.onRemove(tile.id)}
            onRename={(title) => props.onRename(tile.id, title)}
            maxWidthPx={Number.MAX_SAFE_INTEGER}
            maxHeightPx={Number.MAX_SAFE_INTEGER}
            resizable={false}
            showLegacyControls={false}
            onSplitRow={() => props.onSplit(tile.id, "row")}
            onSplitCol={() => props.onSplit(tile.id, "col")}
            onEdit={() => props.onEdit(tile.id)}
          />
        </div>
      );
    }

    const dirClass = node.dir === "row" ? "splitRow" : "splitCol";
    const aStyle = { flex: `${node.ratio} 1 0%` } as const;
    const bStyle = { flex: `${1 - node.ratio} 1 0%` } as const;

    return (
      <div className={`split ${dirClass}`}>
        <div className="splitPane" style={aStyle}>
          {renderNode(node.a, path.concat("a"))}
        </div>
        <div
          className={`splitBar ${node.dir === "row" ? "splitBarV" : "splitBarH"}`}
          role="separator"
          aria-orientation={node.dir === "row" ? "vertical" : "horizontal"}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = (e.currentTarget.parentElement as HTMLElement) ?? null;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const start = node.dir === "row" ? e.clientX : e.clientY;
            const startRatio = node.ratio;
            const size = node.dir === "row" ? rect.width : rect.height;

            const onMove = (ev: PointerEvent) => {
              const pos = node.dir === "row" ? ev.clientX : ev.clientY;
              const delta = (pos - start) / Math.max(1, size);
              props.onSetSplitRatio(path, clamp(startRatio + delta, 0.12, 0.88));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              window.removeEventListener("pointercancel", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp, { once: true });
            window.addEventListener("pointercancel", onUp, { once: true });
          }}
        />
        <div className="splitPane" style={bStyle}>
          {renderNode(node.b, path.concat("b"))}
        </div>
      </div>
    );
  }

  return <div className="tiledRoot">{renderNode(props.layout, [])}</div>;
}
