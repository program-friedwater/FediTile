import { useEffect, useMemo, useState } from "react";
import type { MisskeyEmoji } from "../misskey/emojis";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { FieldRow, Input, Label } from "../components/Field";

type Props = {
  isOpen: boolean;
  emojis: MisskeyEmoji[];
  onPick: (reaction: string) => void;
  onClose: () => void;
};

export function EmojiPickerModal(props: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!props.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  useEffect(() => {
    if (props.isOpen) setQ("");
  }, [props.isOpen]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return props.emojis.slice(0, 240);
    return props.emojis
      .filter((e) => e.name.toLowerCase().includes(qq) || (e.aliases ?? []).some((a) => String(a).toLowerCase().includes(qq)))
      .slice(0, 240);
  }, [props.emojis, q]);

  if (!props.isOpen) return null;

  return (
    <Modal
      isOpen={props.isOpen}
      title="Pick a reaction"
      onClose={props.onClose}
      footer={<Button onClick={props.onClose}>Close</Button>}
    >
      <FieldRow>
        <Label>Search</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="emoji name" autoFocus />
      </FieldRow>
      <div className="emojiGridWrap">
        <div className="emojiGrid">
            <button type="button" className="emojiBtn" onClick={() => props.onPick("👍")} title="👍">
              👍
            </button>
            <button type="button" className="emojiBtn" onClick={() => props.onPick("❤️")} title="❤️">
              ❤️
            </button>
            <button type="button" className="emojiBtn" onClick={() => props.onPick("🎉")} title="🎉">
              🎉
            </button>
            {filtered.map((e) => (
              <button
                type="button"
                className="emojiBtn"
                key={e.name}
                onClick={() => props.onPick(`:${e.name}:`)}
                title={`:${e.name}:`}
              >
                <img className="emojiImg" src={e.url} alt={`:${e.name}:`} loading="lazy" decoding="async" />
              </button>
            ))}
        </div>
      </div>
    </Modal>
  );
}
