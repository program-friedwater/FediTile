import { useMemo, useState } from "react";
import type { TileQuery, TileSize } from "./tileTypes";
import { tileKindLabel } from "./tileTypes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tile: { title: string; query: TileQuery; size: TileSize }) => void;
};

export function AddTileModal(props: Props) {
  const [kind, setKind] = useState<TileQuery["kind"]>("home");
  const [title, setTitle] = useState("");
  const [size, setSize] = useState<TileSize>("m");
  const [tag, setTag] = useState("news");
  const [q, setQ] = useState("feditile");

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

  if (!props.isOpen) return null;

  return (
    <div
      className="modalBackdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="modalHeader">Add a tile</div>
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
              props.onCreate({ title: effectiveTitle, query, size });
              props.onClose();
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
