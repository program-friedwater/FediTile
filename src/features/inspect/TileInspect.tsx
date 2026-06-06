import { useEffect, useState } from "react";
import type { Author, Cursor, Post } from "../../domain/types";
import { emitInspectIntent, onInspectIntent } from "../../state/events/inspectBus";
import { Pill } from "../../components/ui/Pill";
import { getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { getDefaultMisskeyAccount, loadAccounts } from "../../state/accounts/accountsStore";
import { createNote, fetchReplies, fetchUserNotes, reactToNote, showNote, showUser, unreactToNote, voteOnPoll, type MisskeyUserProfile } from "../../integrations/misskey/api";
import { EmojiPickerModal } from "../timeline/EmojiPickerModal";
import { PostActionModal } from "../timeline/PostActionModal";
import { PostCard } from "../../components/post/PostCard";
import { replacePostInTree } from "../../components/post/postTree";
import { AuthorInspectCard } from "./AuthorInspectCard";

type ViewState =
  | { kind: "empty" }
  | { kind: "post"; post: Post; replies: Post[]; loadedAt: string }
  | {
      kind: "author";
      author: Author;
      loadedAt: string;
      profile?: MisskeyUserProfile;
      notes?: Post[];
      nextCursor?: Cursor;
      loadingMore?: boolean;
    };

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
        const account = getDefaultMisskeyAccount(accounts);
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
          const account = getDefaultMisskeyAccount(accounts);
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
          const account = getDefaultMisskeyAccount(accounts);
          if (!account) return;
          const remoteId = (intent.author.remoteId as any as string | undefined) ?? "";
          if (!remoteId) return;
          const [profile, notesPage] = await Promise.all([
            showUser(account, { userId: remoteId }),
            fetchUserNotes(account, { userId: remoteId, limit: 20 }).catch(() => ({ items: [] as Post[], nextCursor: undefined })),
          ]);
          setState({
            kind: "author",
            author: profile.author,
            loadedAt: nowIso(),
            profile,
            notes: notesPage.items,
            nextCursor: notesPage.nextCursor,
            loadingMore: false,
          });
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const loadMoreAuthorNotes = async () => {
    if (state.kind !== "author" || state.loadingMore || !state.nextCursor) return;
    const remoteId = (state.author.remoteId as any as string | undefined) ?? "";
    if (!remoteId) return;
    setState((prev) => (prev.kind === "author" ? { ...prev, loadingMore: true } : prev));
    try {
      const accounts = await loadAccounts();
      const account = getDefaultMisskeyAccount(accounts);
      if (!account) return;
      const page = await fetchUserNotes(account, { userId: remoteId, limit: 20, cursor: state.nextCursor });
      setState((prev) => {
        if (prev.kind !== "author") return prev;
        const merged = [...(prev.notes ?? [])];
        for (const note of page.items) {
          const key = String(note.remoteId ?? note.uri ?? note.createdAt);
          if (merged.some((item) => String(item.remoteId ?? item.uri ?? item.createdAt) === key)) continue;
          merged.push(note);
        }
        return {
          ...prev,
          notes: merged,
          nextCursor: page.nextCursor,
          loadingMore: false,
          loadedAt: nowIso(),
        };
      });
    } catch {
      setState((prev) => (prev.kind === "author" ? { ...prev, loadingMore: false } : prev));
    }
  };

  const title = state.kind === "empty" ? "Click a post or user" : state.kind === "post" ? "Post" : "User";

  return (
    <div style={{ padding: 10, display: "grid", gap: 10, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {"loadedAt" in state ? <Pill>{new Date(state.loadedAt).toLocaleTimeString()}</Pill> : <Pill>Inspect</Pill>}
      </div>

      {state.kind === "empty" ? <div className="emptyState">Click a post or user to inspect.</div> : null}

      {state.kind === "author" ? (
        <AuthorInspectCard
          author={state.author}
          profile={state.profile}
          notes={state.notes}
          loadingMore={state.loadingMore === true}
          hasMore={!!state.nextCursor}
          onNearEnd={loadMoreAuthorNotes}
          globalEmojis={globalEmojis}
          onInspectPost={(post) => emitInspectIntent({ type: "post", post })}
          onInspectAuthor={(author) => emitInspectIntent({ type: "author", author })}
        />
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
              const account = getDefaultMisskeyAccount(accounts);
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
                const account = getDefaultMisskeyAccount(accounts);
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
                  const account = getDefaultMisskeyAccount(accounts);
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
          const account = getDefaultMisskeyAccount(accounts);
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
