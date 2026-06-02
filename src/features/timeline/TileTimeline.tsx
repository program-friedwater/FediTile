import { useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "../../domain/types";
import type { TileQuery } from "../../state/workspace/tileTypes";
import { getMockTimelinePage } from "./mockData";
import { VirtualList } from "./VirtualList";
import { loadAccounts, onAccountsChanged } from "../../state/accounts/accountsStore";
import { fetchTimeline } from "../../integrations/misskey/api";
import { startTimelineStream } from "../../integrations/misskey/streaming";
import { reactToNote, createNote, showNote, unreactToNote, voteOnPoll } from "../../integrations/misskey/api";
import { PostActionModal } from "./PostActionModal";
import { EmojiPickerModal } from "./EmojiPickerModal";
import { getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { MediaLightboxModal, type LightboxItem } from "../../components/post/MediaLightboxModal";
import { Modal } from "../../components/ui/Modal";
import { emitComposeIntent, postToReplyIntent } from "../../state/events/composeBus";
import { loadWorkspace } from "../../state/workspace/workspaceStore";
import { emitInspectIntent } from "../../state/events/inspectBus";
import { PostCard } from "../../components/post/PostCard";
import { replacePostInList } from "../../components/post/postTree";

type Props = {
  query: TileQuery;
};

const PAGE_SIZE = 40;
const ESTIMATED_ITEM_HEIGHT = 90;

export function TileTimeline(props: Props) {
  const queryKey = useMemo(() => JSON.stringify(props.query), [props.query]);
  const [items, setItems] = useState<Post[]>(() => getMockTimelinePage(props.query, 0, PAGE_SIZE));
  const [loaded, setLoaded] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"mock" | "misskey">("mock");
  const [accountsEpoch, setAccountsEpoch] = useState(0);
  const nextCursorRef = useRef<string | null>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const [renoteMenuPost, setRenoteMenuPost] = useState<Post | null>(null);
  const [modal, setModal] = useState<{ mode: "quote" | "reply" | null; post: Post | null }>({ mode: null, post: null });
  const [emojiOpenFor, setEmojiOpenFor] = useState<Post | null>(null);
  const [emojiList, setEmojiList] = useState<MisskeyEmoji[]>([]);
  const [cwOpen, setCwOpen] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [prependCompensation, setPrependCompensation] = useState({ key: 0, px: 0 });
  const [isNearTop, setIsNearTop] = useState(true);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const itemsRef = useRef(items);
  const isNearTopRef = useRef(isNearTop);
  const pendingPostsRef = useRef(pendingPosts);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    isNearTopRef.current = isNearTop;
  }, [isNearTop]);

  useEffect(() => {
    pendingPostsRef.current = pendingPosts;
  }, [pendingPosts]);

  const prependPost = (post: Post) => {
    const key = post.uri ?? post.remoteId;
    let inserted = false;
    setItems((prev) => {
      if (key && prev.some((x) => (x.uri ?? x.remoteId) === key)) return prev;
      inserted = true;
      return [post, ...prev].slice(0, 500);
    });
    if (inserted) {
      setPrependCompensation((state) => ({ key: state.key + 1, px: ESTIMATED_ITEM_HEIGHT }));
    }
  };

  const queuePendingPost = (post: Post) => {
    const key = post.uri ?? post.remoteId;
    setPendingPosts((prev) => {
      if (key && prev.some((x) => (x.uri ?? x.remoteId) === key)) return prev;
      if (key && itemsRef.current.some((x) => (x.uri ?? x.remoteId) === key)) return prev;
      return [post, ...prev].slice(0, 100);
    });
  };

  const flushPendingPosts = () => {
    if (pendingPostsRef.current.length === 0) return;
    const posts = pendingPostsRef.current.slice().reverse();
    setPendingPosts([]);
    let insertedCount = 0;
    setItems((prev) => {
      let next = prev;
      for (const post of posts) {
        const key = post.uri ?? post.remoteId;
        if (key && next.some((x) => (x.uri ?? x.remoteId) === key)) continue;
        next = [post, ...next].slice(0, 500);
        insertedCount += 1;
      }
      return next;
    });
    if (insertedCount > 0) {
      setPrependCompensation((state) => ({
        key: state.key + 1,
        px: insertedCount * ESTIMATED_ITEM_HEIGHT,
      }));
    }
  };

  useEffect(() => {
    return onAccountsChanged(() => setAccountsEpoch((n) => n + 1));
  }, []);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setMode("mock");
    nextCursorRef.current = null;
    streamRef.current?.close();
    streamRef.current = null;

    (async () => {
      // Only timeline kinds for now
      const kind = props.query.kind;
      const isTimeline = kind === "home" || kind === "local" || kind === "federated";
      if (!isTimeline) {
        setItems(getMockTimelinePage(props.query, 0, PAGE_SIZE));
        setLoaded(PAGE_SIZE);
        setLoading(false);
        return;
      }

      try {
        const acc = await loadAccounts();
        const account = acc.misskey[0];
        if (!account) throw new Error("No Misskey account connected");

        const [page, emojis] = await Promise.all([
          fetchTimeline(account, { kind, limit: PAGE_SIZE }),
          getEmojis(account).catch(() => [] as MisskeyEmoji[]),
        ]);
        if (canceled) return;
        setMode("misskey");
        setItems(page.items);
        setEmojiList(emojis);
        setLoaded(page.items.length);
        nextCursorRef.current = page.nextCursor?.type === "max_id" ? page.nextCursor.value : null;
        setLoading(false);

        streamRef.current = startTimelineStream(
          account,
          kind,
          (p) => {
            if (isNearTopRef.current) prependPost(p);
            else queuePendingPost(p);
          },
          () => {
            // ignore for now; polling fallback can be added later
          },
        );
      } catch {
        if (canceled) return;
        setMode("mock");
        setItems(getMockTimelinePage(props.query, 0, PAGE_SIZE));
        setEmojiList([]);
        setLoaded(PAGE_SIZE);
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [queryKey, props.query, accountsEpoch]);

  const loadMore = () => {
    if (loading) return;
    setLoading(true);
    if (mode === "misskey") {
      (async () => {
        try {
          const kind = props.query.kind;
          if (!(kind === "home" || kind === "local" || kind === "federated")) return;
          const acc = await loadAccounts();
          const account = acc.misskey[0];
          if (!account) throw new Error("No Misskey account connected");
          const untilId = nextCursorRef.current;
          const page = await fetchTimeline(account, {
            kind,
            limit: PAGE_SIZE,
            cursor: untilId ? { type: "max_id", value: untilId } : undefined,
          });
          setItems((prev) => prev.concat(page.items));
          setLoaded((n) => n + page.items.length);
          nextCursorRef.current = page.nextCursor?.type === "max_id" ? page.nextCursor.value : null;
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // mock: async-ish to avoid re-entrancy from scroll events
      queueMicrotask(() => {
        setItems((prev) => prev.concat(getMockTimelinePage(props.query, loaded, PAGE_SIZE)));
        setLoaded((n) => n + PAGE_SIZE);
        setLoading(false);
      });
    }
  };

  return (
    <>
      <VirtualList
        className="tileScroller"
        items={items}
        itemKey={(p, idx) => String(p.uri ?? (p.remoteId as any as string) ?? `${p.createdAt}-${idx}`)}
        estimateItemHeight={ESTIMATED_ITEM_HEIGHT}
        overscan={8}
        endThresholdPx={900}
        prependCompensationKey={prependCompensation.key}
        prependCompensationPx={prependCompensation.px}
        onTopLockChange={setIsNearTop}
        onNearEnd={loadMore}
        renderItem={(p, idx) => (
          <PostCard
            post={p}
            emojiList={emojiList}
            cwOpen={cwOpen}
            cwKey={(p.uri ?? (p.remoteId as any as string) ?? `${p.createdAt}-${idx}`) as string}
            onToggleCw={(key) => setCwOpen((m) => ({ ...m, [key]: !(m[key] === true) }))}
            onInspectPost={(post) => emitInspectIntent({ type: "post", post })}
            onInspectAuthor={(post) => emitInspectIntent({ type: "author", author: post.author })}
            onOpenLightbox={(items, index) => setLightbox({ items, index })}
            onReply={async (post) => {
              try {
                const ws = loadWorkspace();
                const hasCompose = !!ws?.tiles?.some((t) => t.query?.kind === "compose");
                if (hasCompose) {
                  const intent = postToReplyIntent(post);
                  if (intent) emitComposeIntent(intent);
                  return;
                }
              } catch {
                // ignore
              }
              setModal({ mode: "reply", post });
            }}
            onRenoteMenu={(post) => setRenoteMenuPost(post)}
            onReact={async (post) => {
              if (mode !== "misskey") return;
              try {
                const accounts = await loadAccounts();
                const account = accounts.misskey[0];
                if (!account) throw new Error("No Misskey account connected");
                const emojis = await getEmojis(account);
                setEmojiList(emojis);
              } catch {
                setEmojiList([]);
              } finally {
                setEmojiOpenFor(post);
              }
            }}
            onToggleReaction={async (post, reactionKey) => {
              if (mode !== "misskey") return;
              const noteId = (post.remoteId as any as string | undefined) ?? "";
              if (!noteId) return;
              const accounts = await loadAccounts();
              const account = accounts.misskey[0];
              if (!account) return;
              // Ensure we have myReaction/reactions for older notes.
              let current = post;
              if (!current.myReaction || !Array.isArray(current.reactions)) {
                try {
                  const fresh = await showNote(account, { noteId });
                  setItems((prev) => prev.map((x) => ((x.remoteId as any) === noteId ? { ...x, ...fresh } : x)));
                  current = fresh;
                } catch {
                  // ignore
                }
              }
              const already = current.myReaction === reactionKey;
              try {
                setItems((prev) =>
                  prev.map((x) => {
                    if ((x.remoteId as any) !== noteId) return x;
                    const reactions = (x.reactions ?? []).map((rr) =>
                      rr.key === reactionKey ? { ...rr, count: Math.max(0, rr.count + (already ? -1 : 1)) } : rr,
                    );
                    return { ...x, reactions, myReaction: already ? undefined : reactionKey };
                  }),
                );
                if (already) await unreactToNote(account, { noteId });
                else await reactToNote(account, { noteId, reaction: reactionKey });
              } catch {
                try {
                  const fresh = await showNote(account, { noteId });
                  setItems((prev) => prev.map((x) => ((x.remoteId as any) === noteId ? fresh : x)));
                } catch {
                  // ignore
                }
              }
            }}
            onVotePoll={async (post, choice) => {
              if (mode !== "misskey") return;
              const noteId = (post.remoteId as any as string | undefined) ?? "";
              if (!noteId) return;
              try {
                const accounts = await loadAccounts();
                const account = accounts.misskey[0];
                if (!account) throw new Error("No Misskey account connected");
                await voteOnPoll(account, { noteId, choice });
                const fresh = await showNote(account, { noteId });
                setItems((prev) => replacePostInList(prev, noteId, fresh));
              } catch (e) {
                setErrorText(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        )}
      />

      {pendingPosts.length > 0 && !isNearTop ? (
        <button
          type="button"
          className="timelinePendingBtn"
          onClick={() => {
            setIsNearTop(true);
            flushPendingPosts();
          }}
        >
          {pendingPosts.length} new post{pendingPosts.length === 1 ? "" : "s"}
        </button>
      ) : null}

      <PostActionModal mode={modal.mode} post={modal.post} onClose={() => setModal({ mode: null, post: null })} />

      <Modal isOpen={!!renoteMenuPost} title="Renote" onClose={() => setRenoteMenuPost(null)}>
        <div style={{ display: "grid", gap: 10 }}>
          <button
            className="btn"
            onClick={async () => {
              const p = renoteMenuPost;
              setRenoteMenuPost(null);
              if (!p || mode !== "misskey") return;
              const noteId = ((p.repostOf?.remoteId ?? p.remoteId) as any as string | undefined) ?? "";
              if (!noteId) return;
              const accounts = await loadAccounts();
              const account = accounts.misskey[0];
              if (!account) return;
              try {
                const created = await createNote(account, { renoteId: noteId, visibility: "public" });
                prependPost(created);
              } catch (e) {
                setErrorText(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Renote
          </button>
          <button
            className="btn"
            onClick={() => {
              const p = renoteMenuPost;
              setRenoteMenuPost(null);
              if (!p) return;
              setModal({ mode: "quote", post: p });
            }}
          >
            Quote…
          </button>
        </div>
      </Modal>

      <EmojiPickerModal
        isOpen={!!emojiOpenFor}
        emojis={emojiList}
        onClose={() => setEmojiOpenFor(null)}
        onPick={async (reaction) => {
          const p = emojiOpenFor;
          setEmojiOpenFor(null);
          if (!p || mode !== "misskey") return;
          const noteId = (p.remoteId as any as string | undefined) ?? "";
          if (!noteId) return;
          const accounts = await loadAccounts();
          const account = accounts.misskey[0];
          if (!account) return;
          // optimistic update
          setItems((prev) =>
            prev.map((x) => {
              if ((x.remoteId as any) !== noteId) return x;
              const reactions = x.reactions ? x.reactions.slice() : [];
              const idx = reactions.findIndex((r) => r.key === reaction);
              if (idx >= 0) reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
              else reactions.unshift({ key: reaction, count: 1 });
              return { ...x, reactions, myReaction: reaction };
            }),
          );
          try {
            await reactToNote(account, { noteId, reaction });
            // refresh to reflect server truth (and other reactions)
            const fresh = await showNote(account, { noteId });
            setItems((prev) => prev.map((x) => ((x.remoteId as any) === noteId ? { ...x, ...fresh } : x)));
          } catch {
            // revert by refetch
            try {
              const fresh = await showNote(account, { noteId });
              setItems((prev) => prev.map((x) => ((x.remoteId as any) === noteId ? fresh : x)));
            } catch {
              // ignore
            }
          }
        }}
      />

      <MediaLightboxModal
        isOpen={!!lightbox}
        items={lightbox?.items ?? []}
        index={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
        onPrev={() => {
          setLightbox((prev) => {
            if (!prev) return prev;
            return { ...prev, index: Math.max(0, prev.index - 1) };
          });
        }}
        onNext={() => {
          setLightbox((prev) => {
            if (!prev) return prev;
            return { ...prev, index: Math.min(prev.items.length - 1, prev.index + 1) };
          });
        }}
      />

      <Modal isOpen={!!errorText} title="Error" onClose={() => setErrorText(null)}>
        <div style={{ whiteSpace: "pre-wrap" }}>{errorText}</div>
      </Modal>
    </>
  );
}

// (legacy export removed)
