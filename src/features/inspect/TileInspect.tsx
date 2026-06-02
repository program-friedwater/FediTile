import { useEffect, useMemo, useState } from "react";
import type { Author, Post } from "../../domain/types";
import { onInspectIntent, type InspectIntent } from "../../state/events/inspectBus";
import { Pill } from "../../components/ui/Pill";
import { renderMfm } from "../../mfm/renderMfm";
import { buildEmojiResolver, getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { loadAccounts } from "../../state/accounts/accountsStore";
import { createNote, fetchReplies, reactToNote, showNote, showUser, unreactToNote, voteOnPoll } from "../../integrations/misskey/api";
import { EmojiPickerModal } from "../timeline/EmojiPickerModal";
import { PostActionModal } from "../timeline/PostActionModal";
import { RepeatIcon, ReplyIcon, SmileIcon } from "../../components/icons/icons";
import { PostCard } from "../../components/post/PostCard";
import { replacePostInTree } from "../../components/post/postTree";

type ViewState =
  | { kind: "empty" }
  | { kind: "post"; post: Post; replies: Post[]; loadedAt: string }
  | { kind: "author"; author: Author; loadedAt: string; noteCount?: number };

function nowIso() {
  return new Date().toISOString();
}

export function TileInspect() {
  const [state, setState] = useState<ViewState>({ kind: "empty" });
  const [globalEmojis, setGlobalEmojis] = useState<MisskeyEmoji[]>([]);
  const [emojiOpenFor, setEmojiOpenFor] = useState<Post | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "quote" | "reply" | null; post: Post | null }>({ mode: null, post: null });
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const accounts = await loadAccounts();
        const account = accounts.misskey[0];
        if (!account) return;
        const emojis = await getEmojis(account);
        if (canceled) return;
        setGlobalEmojis(emojis);
      } catch {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    return onInspectIntent(async (intent) => {
      if (intent.type === "post") {
        setState({ kind: "post", post: intent.post, replies: [], loadedAt: nowIso() });
        try {
          const accounts = await loadAccounts();
          const account = accounts.misskey[0];
          if (!account) return;
          const id = (intent.post.remoteId as any as string | undefined) ?? "";
          if (!id) return;
          const fresh = await showNote(account, { noteId: id });
          const replies = await fetchReplies(account, { noteId: id, limit: 40 });
          setState({ kind: "post", post: fresh, replies, loadedAt: nowIso() });
        } catch {
          // ignore
        }
        return;
      }

      if (intent.type === "author") {
        setState({ kind: "author", author: intent.author, loadedAt: nowIso() });
        try {
          const accounts = await loadAccounts();
          const account = accounts.misskey[0];
          if (!account) return;
          const remoteId = (intent.author.remoteId as any as string | undefined) ?? "";
          if (!remoteId) return;
          const info = await showUser(account, { userId: remoteId });
          setState({ kind: "author", author: info.author, loadedAt: nowIso(), noteCount: info.noteCount });
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const title = state.kind === "empty" ? "Click a post or user" : state.kind === "post" ? "Post" : "User";

  const resolver = useMemo(() => {
    const emojis = state.kind === "post" ? state.post.customEmojis : undefined;
    return buildEmojiResolver({ emojis, global: globalEmojis });
  }, [state, globalEmojis]);

  return (
    <div style={{ padding: 10, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {"loadedAt" in state ? <Pill>{new Date(state.loadedAt).toLocaleTimeString()}</Pill> : <Pill>Inspect</Pill>}
      </div>

      {state.kind === "empty" ? <div className="emptyState">Click a post or user to inspect.</div> : null}

      {state.kind === "author" ? (
        <div className="inspectCard">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {state.author.avatarUrl ? <img className="avatar" src={state.author.avatarUrl} alt="" decoding="async" /> : <div className="avatar avatarFallback" />}
            <div style={{ minWidth: 0 }}>
              <div className="listTitleRow">
                <span className="listTitle">{state.author.displayName ?? state.author.handle}</span>
                <span className="listHandleMuted">{state.author.handle}</span>
              </div>
              {typeof state.noteCount === "number" ? <div className="listMeta">Notes: {state.noteCount}</div> : null}
              {state.author.url ? (
                <div className="listMeta">
                  <a href={state.author.url} target="_blank" rel="noreferrer noopener">
                    Open profile
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "post" ? (
        <div className="inspectCard">
          <PostCard
            post={state.post}
            emojiList={globalEmojis}
            cwOpen={{}}
            cwKey={String(state.post.remoteId ?? state.post.uri ?? "inspect")}
            onToggleCw={() => {}}
            onReply={(p) => setModal({ mode: "reply", post: p })}
            onRenoteMenu={(p) => setActionMenuFor((p.remoteId as any as string) ?? null)}
            onReact={async (p) => setEmojiOpenFor(p)}
            onToggleReaction={async (post, reactionKey) => {
              const noteId = (post.remoteId as any as string | undefined) ?? "";
              if (!noteId) return;
              const accounts = await loadAccounts();
              const account = accounts.misskey[0];
              if (!account) return;
              const already = post.myReaction === reactionKey;
              try {
                if (already) await unreactToNote(account, { noteId });
                else await reactToNote(account, { noteId, reaction: reactionKey });
                const fresh = await showNote(account, { noteId });
                setState((prev) => (prev.kind === "post" ? { ...prev, post: fresh, loadedAt: nowIso() } : prev));
              } catch (e) {
                setErrorText(e instanceof Error ? e.message : String(e));
              }
            }}
            onVotePoll={async (post, choice) => {
              const noteId = (post.remoteId as any as string | undefined) ?? "";
              if (!noteId) return;
              try {
                const accounts = await loadAccounts();
                const account = accounts.misskey[0];
                if (!account) throw new Error("No Misskey account connected");
                await voteOnPoll(account, { noteId, choice });
                const fresh = await showNote(account, { noteId });
                setState((prev) => (prev.kind === "post" ? { ...prev, post: replacePostInTree(prev.post, noteId, fresh), loadedAt: nowIso() } : prev));
              } catch (e) {
                setErrorText(e instanceof Error ? e.message : String(e));
              }
            }}
            hideActions={false}
          />

          {actionMenuFor && actionMenuFor === ((state.post.remoteId as any as string | null) ?? null) ? (
            <div className="tileMenu tileMenuInline" role="menu">
              <button
                className="tileMenuItem"
                role="menuitem"
                onClick={async () => {
                  setActionMenuFor(null);
                  const noteId = ((state.post.repostOf?.remoteId ?? state.post.remoteId) as any as string | undefined) ?? "";
                  if (!noteId) return;
                  const accounts = await loadAccounts();
                  const account = accounts.misskey[0];
                  if (!account) return;
                  try {
                    await createNote(account, { renoteId: noteId, visibility: "public" });
                  } catch (e) {
                    setErrorText(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                Renote
              </button>
              <button
                className="tileMenuItem"
                role="menuitem"
                onClick={() => {
                  setActionMenuFor(null);
                  setModal({ mode: "quote", post: state.post });
                }}
              >
                Quote…
              </button>
            </div>
          ) : null}

          {state.replies.length > 0 ? (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ fontWeight: 900 }}>Replies</div>
              {state.replies.slice(0, 40).map((rp) => (
                <PostCard
                  key={String(rp.remoteId ?? rp.uri ?? rp.createdAt)}
                  post={rp}
                  emojiList={globalEmojis}
                  cwOpen={{}}
                  cwKey={String(rp.remoteId ?? rp.uri ?? rp.createdAt)}
                  onToggleCw={() => {}}
                  hideActions={true}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <EmojiPickerModal
        isOpen={!!emojiOpenFor}
        emojis={globalEmojis}
        onClose={() => setEmojiOpenFor(null)}
        onPick={async (reaction) => {
          const p = emojiOpenFor;
          setEmojiOpenFor(null);
          if (!p) return;
          const noteId = (p.remoteId as any as string | undefined) ?? "";
          if (!noteId) return;
          const accounts = await loadAccounts();
          const account = accounts.misskey[0];
          if (!account) return;
          try {
            await reactToNote(account, { noteId, reaction });
            const fresh = await showNote(account, { noteId });
            setState((prev) => (prev.kind === "post" ? { ...prev, post: fresh, loadedAt: nowIso() } : prev));
          } catch (e) {
            setErrorText(e instanceof Error ? e.message : String(e));
          }
        }}
      />

      <PostActionModal mode={modal.mode} post={modal.post} onClose={() => setModal({ mode: null, post: null })} />

      {errorText ? (
        <div className="cwLine" style={{ marginTop: 10 }}>
          <span className="cwText" style={{ whiteSpace: "pre-wrap" }}>
            {errorText}
          </span>
          <button type="button" className="cwBtn" onClick={() => setErrorText(null)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
