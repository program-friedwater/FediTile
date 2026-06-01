import { useMemo, useState } from "react";
import { loadAccounts } from "../accounts/accountsStore";
import { createNote } from "../misskey/api";

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
    <div style={{ height: "100%", display: "grid", gap: 10, gridTemplateRows: "auto 1fr auto" }}>
      <div className="fieldRow">
        <div className="label">Content warning (optional)</div>
        <input
          className="input"
          value={draft.cw}
          onChange={(e) => setDraft((d) => ({ ...d, cw: e.target.value }))}
          placeholder="CW"
        />
      </div>

      <div className="fieldRow" style={{ minHeight: 0 }}>
        <div className="label">Post</div>
        <textarea
          className="input"
          style={{ resize: "none", height: "100%", fontFamily: "inherit", lineHeight: 1.4 }}
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          placeholder="Write something…"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="pill">Remaining: {remaining}</span>
          <select
            className="select"
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value as Draft["visibility"] }))}
            style={{ width: 160 }}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="followers">Followers</option>
            <option value="direct">Direct</option>
          </select>
        </div>

        <button
          className="btn"
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
        </button>
      </div>

      {status ? (
        <div className="pill" style={{ color: status === "Posted." ? "var(--muted)" : "var(--danger)" }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}
