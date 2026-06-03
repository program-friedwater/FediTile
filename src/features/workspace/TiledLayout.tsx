import type { LayoutNode } from "../../state/workspace/layoutTypes";
import type { Tile, TileId } from "../../state/workspace/tileTypes";
import { TileView } from "./TileView";

type Props = {
  layout: LayoutNode;
  tilesById: Map<TileId, Tile>;
  widthPx?: number;
  activeTileId: TileId | null;
  onActivate: (id: TileId) => void;
  onSplit: (targetId: TileId, dir: "row" | "col") => void;
  onSetSplitRatio: (path: Array<"a" | "b">, ratio: number) => void;
  onSetWidthPx: (widthPx: number) => void;
  onRemove: (id: TileId) => void;
  onRename: (id: TileId, title: string) => void;
  onEdit: (id: TileId) => void;
};

const MIN_TILE_WIDTH = 280;
const SPLIT_GAP = 12;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function TiledLayout(props: Props) {
  function minWidthOf(node: LayoutNode): number {
    if (node.type === "leaf") return MIN_TILE_WIDTH;
    return node.dir === "row" ? minWidthOf(node.a) + SPLIT_GAP + minWidthOf(node.b) : Math.max(minWidthOf(node.a), minWidthOf(node.b));
  }

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

    return (
      <div className={`split ${node.dir === "row" ? "splitRow" : "splitCol"}`} style={node.dir === "row" ? { minWidth: minWidthOf(node) } : undefined}>
        <div className="splitPane" style={{ flex: `${node.ratio} 1 0%` }}>{renderNode(node.a, path.concat("a"))}</div>
        <div
          className={`splitBar ${node.dir === "row" ? "splitBarV" : "splitBarH"}`}
          role="separator"
          aria-orientation={node.dir === "row" ? "vertical" : "horizontal"}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const container = e.currentTarget.parentElement as HTMLElement | null;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const start = node.dir === "row" ? e.clientX : e.clientY;
            const startRatio = node.ratio;
            const size = node.dir === "row" ? rect.width : rect.height;
            const onMove = (ev: PointerEvent) => {
              const pos = node.dir === "row" ? ev.clientX : ev.clientY;
              props.onSetSplitRatio(path, clamp(startRatio + (pos - start) / Math.max(1, size), 0.12, 0.88));
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
        <div className="splitPane" style={{ flex: `${1 - node.ratio} 1 0%` }}>{renderNode(node.b, path.concat("b"))}</div>
      </div>
    );
  }

  const minWidth = minWidthOf(props.layout);
  const width = Math.max(minWidth, props.widthPx ?? minWidth);

  return (
    <div className="tiledRoot" style={{ minWidth, width }}>
      {renderNode(props.layout, [])}
      <div
        className="workspaceEdgeResizer"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize workspace"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startWidth = width;
          const onMove = (ev: PointerEvent) => props.onSetWidthPx(Math.max(minWidth, Math.round(startWidth + (ev.clientX - startX))));
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
    </div>
  );
}
