import { useMemo, useState } from "react";
import { loadAccounts } from "../accounts/accountsStore";
import { createNote } from "../misskey/api";
import { Button } from "../components/Button";
import { FieldRow, Input, Label, Select, Textarea } from "../components/Field";
import { Pill } from "../components/Pill";

type Draft = {
  cw: string;
  text: string;
  visibility: "public" | "unlisted" | "followers" | "direct";
};

export function TileCompose(props: { onPosted?: () => void }) {
  const [draft, setDraft] = useState<Draft>({ cw: "", text: "", visibility: "public" });
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const remaining = useMemo(() => {
    // Placeholder: real limits differ per service/connector
    const limit = 500;
    return limit - draft.text.length;
  }, [draft.text.length]);

  return (
    <div className="composeLayout">
      <FieldRow>
        <Label>Content warning (optional)</Label>
        <Input value={draft.cw} onChange={(e) => setDraft((d) => ({ ...d, cw: e.target.value }))} placeholder="CW" />
      </FieldRow>

      <FieldRow tight style={{ minHeight: 0 }}>
        <Label>Post</Label>
        <Textarea
          style={{ resize: "none", height: "100%", fontFamily: "inherit", lineHeight: 1.4 }}
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          placeholder="Write something…"
        />
      </FieldRow>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Pill>Remaining: {remaining}</Pill>
          <Select
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value as Draft["visibility"] }))}
            style={{ width: 160 }}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="followers">Followers</option>
            <option value="direct">Direct</option>
          </Select>
        </div>

        <Button
          disabled={posting || draft.text.trim().length === 0}
          onClick={async () => {
            setStatus(null);
            setPosting(true);
            try {
              const accounts = await loadAccounts();
              const account = accounts.misskey[0];
              if (!account) throw new Error("No Misskey account connected. Connect from Settings first.");

              const vis =
                draft.visibility === "public"
                  ? "public"
                  : draft.visibility === "unlisted"
                    ? "home"
                    : draft.visibility === "followers"
                      ? "followers"
                      : "specified";

              await createNote(account, {
                text: draft.text,
                cw: draft.cw.trim() ? draft.cw.trim() : undefined,
                visibility: vis,
              });
              setDraft((d) => ({ ...d, text: "" }));
              setStatus("Posted.");
              props.onPosted?.();
            } catch (e) {
              setStatus(String(e));
            } finally {
              setPosting(false);
            }
          }}
          title="Post (mock)"
        >
          {posting ? "Posting…" : "Post"}
        </Button>
      </div>

      {status ? (
        <Pill tone={status === "Posted." ? "default" : "danger"}>{status}</Pill>
      ) : null}
    </div>
  );
}
