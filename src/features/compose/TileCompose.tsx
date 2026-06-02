import { useEffect, useMemo, useRef, useState } from "react";
import { loadAccounts } from "../../state/accounts/accountsStore";
import { createNote } from "../../integrations/misskey/api";
import { getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { Button } from "../../components/ui/Button";
import { EmojiTextarea } from "../../components/ui/EmojiTextarea";
import { FieldRow, Input, Label, Select } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { onComposeIntent, type ComposeIntent } from "../../state/events/composeBus";

type Draft = {
  cw: string;
  text: string;
  visibility: "public" | "unlisted" | "followers" | "direct";
  replyId?: string;
};

export function TileCompose(props: { onPosted?: () => void }) {
  const [draft, setDraft] = useState<Draft>({ cw: "", text: "", visibility: "public" });
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ComposeIntent | null>(null);
  const [emojis, setEmojis] = useState<MisskeyEmoji[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return onComposeIntent((intent) => {
      if (intent.type !== "reply") return;
      setReplyingTo(intent);
      setDraft((d) => ({ ...d, replyId: intent.noteId }));
      queueMicrotask(() => {
        const el = rootRef.current?.querySelector("textarea");
        (el as HTMLTextAreaElement | null)?.focus();
      });
    });
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const accounts = await loadAccounts();
        const account = accounts.misskey[0];
        if (!account) return;
        const next = await getEmojis(account);
        if (!canceled) setEmojis(next);
      } catch {
        if (!canceled) setEmojis([]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const remaining = useMemo(() => {
    // Placeholder: real limits differ per service/connector
    const limit = 500;
    return limit - draft.text.length;
  }, [draft.text.length]);

  const submit = async () => {
    if (posting || draft.text.trim().length === 0) return;
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
        replyId: draft.replyId,
      });
      setDraft((d) => ({ ...d, text: "", replyId: undefined }));
      setReplyingTo(null);
      setStatus("Posted.");
      props.onPosted?.();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="composeLayout" ref={rootRef}>
      <FieldRow>
        <Label>Content warning (optional)</Label>
        <Input value={draft.cw} onChange={(e) => setDraft((d) => ({ ...d, cw: e.target.value }))} placeholder="CW" />
      </FieldRow>

      <FieldRow tight style={{ minHeight: 0 }}>
        <Label>Post</Label>
        <EmojiTextarea
          style={{ resize: "none", height: "100%", fontFamily: "inherit", lineHeight: 1.4 }}
          value={draft.text}
          onChange={(value) => setDraft((d) => ({ ...d, text: value }))}
          emojis={emojis}
          onSubmitShortcut={() => {
            void submit();
          }}
          placeholder="Write something…"
        />
      </FieldRow>

      {replyingTo ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Pill>Replying to {replyingTo.authorHandle}</Pill>
          <Button
            onClick={() => {
              setReplyingTo(null);
              setDraft((d) => ({ ...d, replyId: undefined }));
            }}
            title="Clear reply target"
          >
            Clear
          </Button>
        </div>
      ) : null}

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
          onClick={() => {
            void submit();
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
