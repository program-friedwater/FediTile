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
  pollEnabled: boolean;
  pollChoices: string[];
  pollMultiple: boolean;
  pollExpiresHours: string;
};

export function TileCompose(props: { onPosted?: () => void }) {
  const [draft, setDraft] = useState<Draft>({
    cw: "",
    text: "",
    visibility: "public",
    pollEnabled: false,
    pollChoices: ["", ""],
    pollMultiple: false,
    pollExpiresHours: "",
  });
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

  const pollChoices = useMemo(() => draft.pollChoices.map((choice) => choice.trim()).filter(Boolean), [draft.pollChoices]);
  const canSubmit = draft.text.trim().length > 0 || (draft.pollEnabled && pollChoices.length >= 2);

  const submit = async () => {
    if (posting || !canSubmit) return;
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
        poll:
          draft.pollEnabled && pollChoices.length >= 2
            ? {
                choices: pollChoices,
                multiple: draft.pollMultiple,
                expiresAt:
                  draft.pollExpiresHours.trim() && Number(draft.pollExpiresHours) > 0
                    ? new Date(Date.now() + Number(draft.pollExpiresHours) * 60 * 60 * 1000).toISOString()
                    : undefined,
              }
            : undefined,
      });
      setDraft((d) => ({
        ...d,
        text: "",
        replyId: undefined,
        pollEnabled: false,
        pollChoices: ["", ""],
        pollMultiple: false,
        pollExpiresHours: "",
      }));
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

      <FieldRow tight>
        <Label>Post</Label>
        <EmojiTextarea
          style={{ resize: "vertical", minHeight: 220, fontFamily: "inherit", lineHeight: 1.4 }}
          value={draft.text}
          onChange={(value) => setDraft((d) => ({ ...d, text: value }))}
          emojis={emojis}
          onSubmitShortcut={() => {
            void submit();
          }}
          placeholder="Write something…"
        />
      </FieldRow>

      <div className="composePollToggleRow">
        <Button
          onClick={() =>
            setDraft((d) => ({
              ...d,
              pollEnabled: !d.pollEnabled,
              pollChoices: d.pollEnabled ? ["", ""] : d.pollChoices,
            }))
          }
        >
          {draft.pollEnabled ? "Remove poll" : "Add poll"}
        </Button>
      </div>

      {draft.pollEnabled ? (
        <div className="pollEditor">
          {draft.pollChoices.map((choice, index) => (
            <FieldRow key={index}>
              <Label>{`Choice ${index + 1}`}</Label>
              <Input
                value={choice}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    pollChoices: d.pollChoices.map((item, i) => (i === index ? e.target.value : item)),
                  }))
                }
                placeholder={`Choice ${index + 1}`}
              />
            </FieldRow>
          ))}

          <div className="pollEditorActions">
            <Button
              disabled={draft.pollChoices.length >= 10}
              onClick={() => setDraft((d) => ({ ...d, pollChoices: d.pollChoices.concat("") }))}
            >
              Add choice
            </Button>
            <Button
              disabled={draft.pollChoices.length <= 2}
              onClick={() => setDraft((d) => ({ ...d, pollChoices: d.pollChoices.slice(0, -1) }))}
            >
              Remove choice
            </Button>
          </div>

          <div className="pollEditorOptions">
            <label className="pollCheckbox">
              <input
                type="checkbox"
                checked={draft.pollMultiple}
                onChange={(e) => setDraft((d) => ({ ...d, pollMultiple: e.target.checked }))}
              />
              <span>Allow multiple choices</span>
            </label>
            <FieldRow>
              <Label>Ends after hours</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={draft.pollExpiresHours}
                onChange={(e) => setDraft((d) => ({ ...d, pollExpiresHours: e.target.value }))}
                placeholder="Optional"
              />
            </FieldRow>
          </div>
        </div>
      ) : null}

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
          disabled={posting || !canSubmit}
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
