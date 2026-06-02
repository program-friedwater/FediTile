import { useEffect, useRef, useState } from "react";
import type { Tile, TileSize } from "../../state/workspace/tileTypes";
import { tileKindLabel } from "../../state/workspace/tileTypes";
import { TileTimeline } from "../timeline/TileTimeline";
import { TileCompose } from "../compose/TileCompose";
import { TileInspect } from "../inspect/TileInspect";
import { TileNotifications } from "../notifications/TileNotifications";
import { IconButton } from "../../components/ui/Button";
import { BellIcon, GlobeIcon, HashIcon, HomeIcon, LocalIcon, PenIcon, SearchIcon, SocialIcon } from "../../components/icons/icons";

type Props = {
  tile: Tile;
  active: boolean;
  onActivate: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onResize: (size: TileSize) => void;
  onSetWidthPx: (widthPx: number) => void;
  onSetHeightPx: (heightPx: number) => void;
  onRemove: () => void;
  onRename: (title: string) => void;
  onEdit?: () => void;
  maxWidthPx: number;
  maxHeightPx: number;
  resizable?: boolean;
  onSplitRow?: () => void;
  onSplitCol?: () => void;
  showLegacyControls?: boolean;
};

function sizeToDefaultWidthPx(size: TileSize, viewportWidth: number): number {
  switch (size) {
    case "s":
      return Math.round(viewportWidth / 4);
    case "m":
      return Math.round(viewportWidth / 2);
    case "l":
      return Math.round(viewportWidth);
    default:
      return Math.round(viewportWidth / 4);
  }
}

export function TileView(props: Props) {
  const resizable = props.resizable ?? true;
  const showLegacyControls = props.showLegacyControls ?? true;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const unclampedWidthPx = props.tile.widthPx ?? sizeToDefaultWidthPx(props.tile.size, viewportWidth);
  const unclampedHeightPx = props.tile.heightPx ?? Math.round(viewportHeight / 2);
  const widthPx = Math.max(280, Math.min(props.maxWidthPx, unclampedWidthPx));
  const heightPx = Math.max(220, Math.min(props.maxHeightPx, unclampedHeightPx));
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(props.tile.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const kindLabel = tileKindLabel(props.tile.query.kind);
  const kindIcon = (() => {
    switch (props.tile.query.kind) {
      case "home":
        return <HomeIcon />;
      case "local":
        return <LocalIcon />;
      case "social":
        return <SocialIcon />;
      case "federated":
        return <GlobeIcon />;
      case "notifications":
        return <BellIcon />;
      case "hashtag":
        return <HashIcon />;
      case "search":
        return <SearchIcon />;
      case "compose":
        return <PenIcon />;
      case "inspect":
        return <SearchIcon />;
      default:
        return null;
    }
  })();

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div
      className="tile"
      data-active={props.active ? "true" : "false"}
      style={{
        width: resizable ? widthPx : "100%",
        height: resizable ? heightPx : "100%",
        minWidth: resizable ? 280 : 0,
        maxWidth: resizable ? Math.max(280, Math.min(viewportWidth, props.maxWidthPx)) : "100%",
        minHeight: resizable ? 220 : 0,
        maxHeight: resizable ? Math.max(220, Math.min(viewportHeight, props.maxHeightPx)) : "100%",
      }}
      onMouseDown={props.onActivate}
    >
      {resizable ? (
        <div
          className="tileResizer tileResizerLeft"
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.onActivate();

            const startX = e.clientX;
            const startWidth = widthPx;
            const min = 280;
            const max = Math.max(min, props.maxWidthPx);

            const target = e.currentTarget as HTMLDivElement;
            target.setPointerCapture(e.pointerId);

            const onMove = (ev: PointerEvent) => {
              const next = Math.max(min, Math.min(max, Math.round(startWidth - (ev.clientX - startX))));
              props.onSetWidthPx(next);
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
      ) : null}
      <div className="tileHeader">
        <div className="tileTypeLabel">
          {kindIcon}
          <span>{kindLabel}</span>
        </div>
        <div className="tileToolbar" ref={menuRef}>
          <IconButton
            title="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            ⋮
          </IconButton>
          {menuOpen ? (
            <div className="tileMenu" role="menu" onMouseDown={(e) => e.stopPropagation()}>
              {props.onSplitCol ? (
                <button
                  className="tileMenuItem"
                  role="menuitem"
                  onClick={() => {
                    props.onSplitCol?.();
                    setMenuOpen(false);
                  }}
                >
                  Split vertically
                </button>
              ) : null}
              {props.onSplitRow ? (
                <button
                  className="tileMenuItem"
                  role="menuitem"
                  onClick={() => {
                    props.onSplitRow?.();
                    setMenuOpen(false);
                  }}
                >
                  Split horizontally
                </button>
              ) : null}
              {props.onEdit ? (
                <button
                  className="tileMenuItem"
                  role="menuitem"
                  onClick={() => {
                    props.onEdit?.();
                    setMenuOpen(false);
                  }}
                >
                  Edit tile…
                </button>
              ) : null}
              {showLegacyControls ? (
                <>
                  <div className="tileMenuSep" role="separator" />
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      props.onMoveLeft();
                      setMenuOpen(false);
                    }}
                  >
                    Move left
                  </button>
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      props.onMoveRight();
                      setMenuOpen(false);
                    }}
                  >
                    Move right
                  </button>
                  <div className="tileMenuSep" role="separator" />
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      props.onResize("s");
                      setMenuOpen(false);
                    }}
                  >
                    Size: Small
                  </button>
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      props.onResize("m");
                      setMenuOpen(false);
                    }}
                  >
                    Size: Medium
                  </button>
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      props.onResize("l");
                      setMenuOpen(false);
                    }}
                  >
                    Size: Large
                  </button>
                </>
              ) : null}
              <div className="tileMenuSep" role="separator" />
              <button
                className="tileMenuItem tileMenuDanger"
                role="menuitem"
                onClick={() => {
                  props.onRemove();
                  setMenuOpen(false);
                }}
              >
                Remove tile
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="tileBody">
        {props.tile.query.kind === "compose" ? (
          <TileCompose />
        ) : props.tile.query.kind === "inspect" ? (
          <TileInspect />
        ) : props.tile.query.kind === "notifications" ? (
          <TileNotifications />
        ) : (
          <TileTimeline query={props.tile.query} />
        )}
      </div>

      {resizable ? (
        <>
          <div
            className="tileResizer tileResizerRight"
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onActivate();

              const startX = e.clientX;
              const startWidth = widthPx;
              const min = 280;
              const max = Math.max(min, props.maxWidthPx);

              const target = e.currentTarget as HTMLDivElement;
              target.setPointerCapture(e.pointerId);

              const onMove = (ev: PointerEvent) => {
                const next = Math.max(min, Math.min(max, Math.round(startWidth + (ev.clientX - startX))));
                props.onSetWidthPx(next);
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

          <div
            className="tileResizer tileResizerBottom"
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onActivate();

              const startY = e.clientY;
              const startHeight = heightPx;
              const min = 220;
              const max = Math.max(min, props.maxHeightPx);

              const target = e.currentTarget as HTMLDivElement;
              target.setPointerCapture(e.pointerId);

              const onMove = (ev: PointerEvent) => {
                const next = Math.max(min, Math.min(max, Math.round(startHeight + (ev.clientY - startY))));
                props.onSetHeightPx(next);
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
        </>
      ) : null}
    </div>
  );
}
