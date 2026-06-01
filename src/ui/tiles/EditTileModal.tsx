import { useMemo, useState } from "react";
import type { Tile, TileQuery, TileSize } from "./tileTypes";
import { tileKindLabel } from "./tileTypes";

type Props = {
  isOpen: boolean;
  tile: Tile | null;
  onClose: () => void;
  onSave: (next: { title: string; query: TileQuery; size: TileSize }) => void;
};

export function EditTileModal(props: Props) {
  const tile = props.tile;
  const [kind, setKind] = useState<TileQuery["kind"]>(tile?.query.kind ?? "home");
  const [title, setTitle] = useState(tile?.title ?? "");
  const [size, setSize] = useState<TileSize>(tile?.size ?? "m");
  const [tag, setTag] = useState(tile?.query.kind === "hashtag" ? tile.query.tag : "news");
  const [q, setQ] = useState(tile?.query.kind === "search" ? tile.query.q : "feditile");

  // Re-seed state when opening / tile changes
  useMemo(() => {
    if (!props.isOpen || !tile) return;
    setKind(tile.query.kind);
    setTitle(tile.title);
    setSize(tile.size);
    if (tile.query.kind === "hashtag") setTag(tile.query.tag);
    if (tile.query.kind === "search") setQ(tile.query.q);
  }, [props.isOpen, tile?.id]);

  const query: TileQuery = useMemo(() => {
    switch (kind) {
      case "hashtag":
        return { kind, tag: tag.trim().replace(/^#/, "") || "news" };
      case "search":
        return { kind, q: q.trim() || "feditile" };
      case "compose":
        return { kind };
      case "home":
      case "local":
      case "federated":
      case "notifications":
        return { kind };
      default:
        return { kind: "home" };
    }
  }, [kind, tag, q]);

  const effectiveTitle = title.trim() || tileKindLabel(kind);

  if (!props.isOpen || !tile) return null;

  return (
    <div
      className="modalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit tile"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="modalHeader">Edit tile</div>
        <div className="modalBody">
          <div className="fieldRow">
            <div className="label">Kind</div>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value as TileQuery["kind"])}>
              <option value="home">Home</option>
              <option value="local">Local</option>
              <option value="federated">Federated</option>
              <option value="notifications">Notifications</option>
              <option value="compose">Compose</option>
              <option value="hashtag">Hashtag</option>
              <option value="search">Search</option>
            </select>
          </div>

          {kind === "hashtag" ? (
            <div className="fieldRow">
              <div className="label">Hashtag</div>
              <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="news" />
            </div>
          ) : null}

          {kind === "search" ? (
            <div className="fieldRow">
              <div className="label">Query</div>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="feditile" />
            </div>
          ) : null}

          <div className="fieldRow">
            <div className="label">Title</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={effectiveTitle} />
          </div>

          <div className="fieldRow">
            <div className="label">Size</div>
            <select className="select" value={size} onChange={(e) => setSize(e.target.value as TileSize)}>
              <option value="s">Small</option>
              <option value="m">Medium</option>
              <option value="l">Large</option>
            </select>
          </div>

          <div className="pill">Query preview: {JSON.stringify(query)}</div>
        </div>
        <div className="modalFooter">
          <button className="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={() => {
              props.onSave({ title: effectiveTitle, query, size });
              props.onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

