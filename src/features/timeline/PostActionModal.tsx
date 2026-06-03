import { useEffect, useMemo, useState } from "react";
import type { Post } from "../../domain/types";
import { getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { getDefaultMisskeyAccount, loadAccounts } from "../../state/accounts/accountsStore";
import { createNote } from "../../integrations/misskey/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { EmojiTextarea } from "../../components/ui/EmojiTextarea";
import { FieldRow, Label } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";

type Props = {
  mode: "quote" | "reply" | null;
  post: Post | null;
  onClose: () => void;
};

export function PostActionModal(props: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [emojis, setEmojis] = useState<MisskeyEmoji[]>([]);

  const title = useMemo(() => {
    if (!props.mode) return "";
    return props.mode === "quote" ? "Quote renote" : "Reply";
  }, [props.mode]);

  useEffect(() => {
    if (!props.mode) return;
    setText("");
    setStatus(null);
  }, [props.mode, props.post?.uri]);

  useEffect(() => {
    if (!props.mode) return;
    let canceled = false;
    (async () => {
      try {
        const accounts = await loadAccounts();
        const account = getDefaultMisskeyAccount(accounts);
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
  }, [props.mode]);

  if (!props.mode || !props.post) return null;

  const noteId = (props.post.remoteId as any as string | undefined) ?? undefined;

  const submit = async () => {
    if (posting || !noteId) return;
    setPosting(true);
    setStatus(null);
    try {
      const accounts = await loadAccounts();
      const account = getDefaultMisskeyAccount(accounts);
      if (!account) throw new Error("No Misskey account connected.");
      if (!noteId) throw new Error("Missing note id.");

      if (props.mode === "quote") {
        await createNote(account, { text, renoteId: noteId, visibility: "public" });
      } else {
        await createNote(account, { text, replyId: noteId, visibility: "public" });
      }
      setStatus("Posted.");
      props.onClose();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      title={title}
      onClose={props.onClose}
      footer={
        <>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button
            disabled={posting || !noteId}
            onClick={() => {
              void submit();
            }}
          >
            {posting ? "Posting…" : "Post"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label>Text</Label>
        <EmojiTextarea
          style={{ resize: "none", height: 160, fontFamily: "inherit", lineHeight: 1.4 }}
          value={text}
          onChange={setText}
          emojis={emojis}
          onSubmitShortcut={() => {
            void submit();
          }}
          placeholder={props.mode === "reply" ? "Write a reply…" : "Add a comment…"}
        />
      </FieldRow>
      {status ? <Pill tone={status === "Posted." ? "default" : "danger"}>{status}</Pill> : null}
    </Modal>
  );
}
