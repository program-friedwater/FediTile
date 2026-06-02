import { useMemo, useState } from "react";
import type { TileQuery, TileSize } from "../../state/workspace/tileTypes";
import { tileKindLabel } from "../../state/workspace/tileTypes";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FieldRow, Input, Label, Select } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";

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

  if (!props.isOpen) return null;

  return (
    <Modal
      isOpen={props.isOpen}
      title="Add a tile"
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button
            onClick={() => {
              props.onCreate({ title: effectiveTitle, query, size });
              props.onClose();
            }}
          >
            Add
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
