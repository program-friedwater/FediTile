import { useEffect, useMemo, useState } from "react";
import type { Post } from "../../domain/types";
import { loadAccounts } from "../accounts/accountsStore";
import { createNote } from "../misskey/api";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { FieldRow, Label, Textarea } from "../components/Field";
import { Pill } from "../components/Pill";

type Props = {
  mode: "quote" | "reply" | null;
  post: Post | null;
  onClose: () => void;
};

export function PostActionModal(props: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const title = useMemo(() => {
    if (!props.mode) return "";
    return props.mode === "quote" ? "Quote renote" : "Reply";
  }, [props.mode]);

  useEffect(() => {
    if (!props.mode) return;
    setText("");
    setStatus(null);
  }, [props.mode, props.post?.uri]);

  if (!props.mode || !props.post) return null;

  const noteId = (props.post.remoteId as any as string | undefined) ?? undefined;

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
            onClick={async () => {
              setPosting(true);
              setStatus(null);
              try {
                const accounts = await loadAccounts();
                const account = accounts.misskey[0];
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
            }}
          >
            {posting ? "Posting…" : "Post"}
          </Button>
        </>
      }
    >
      <FieldRow>
        <Label>Text</Label>
        <Textarea
          style={{ resize: "none", height: 160, fontFamily: "inherit", lineHeight: 1.4 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={props.mode === "reply" ? "Write a reply…" : "Add a comment…"}
        />
      </FieldRow>
      {status ? <Pill tone={status === "Posted." ? "default" : "danger"}>{status}</Pill> : null}
    </Modal>
  );
}
