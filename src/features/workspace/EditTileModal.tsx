import { useMemo, useState } from "react";
import type { Tile, TileQuery, TileSize } from "../../state/workspace/tileTypes";
import { tileKindLabel } from "../../state/workspace/tileTypes";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FieldRow, Input, Label, Select } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";

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
      case "inspect":
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
    <Modal
      isOpen={props.isOpen}
      title="Edit tile"
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button
            onClick={() => {
              props.onSave({ title: effectiveTitle, query, size });
              props.onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label>Kind</Label>
        <Select value={kind} onChange={(e) => setKind(e.target.value as TileQuery["kind"])}>
              <option value="home">Home</option>
              <option value="local">Local</option>
              <option value="federated">Federated</option>
              <option value="notifications">Notifications</option>
              <option value="compose">Compose</option>
              <option value="inspect">Inspect</option>
              <option value="hashtag">Hashtag</option>
              <option value="search">Search</option>
        </Select>
      </FieldRow>

      {kind === "hashtag" ? (
        <FieldRow>
          <Label>Hashtag</Label>
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="news" />
        </FieldRow>
      ) : null}

      {kind === "search" ? (
        <FieldRow>
          <Label>Query</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="feditile" />
        </FieldRow>
      ) : null}

      <FieldRow>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={effectiveTitle} />
      </FieldRow>

      <FieldRow>
        <Label>Size</Label>
        <Select value={size} onChange={(e) => setSize(e.target.value as TileSize)}>
          <option value="s">Small</option>
          <option value="m">Medium</option>
          <option value="l">Large</option>
        </Select>
      </FieldRow>

      <Pill>Query preview: {JSON.stringify(query)}</Pill>
    </Modal>
  );
}
