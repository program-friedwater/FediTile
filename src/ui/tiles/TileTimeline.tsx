import { useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "../../domain/types";
import type { TileQuery } from "./tileTypes";
import { getMockTimelinePage } from "./mockData";
import { VirtualList } from "./VirtualList";
import { renderMfm } from "../mfm/renderMfm";
import { loadAccounts } from "../accounts/accountsStore";
import { fetchTimeline } from "../misskey/api";
import { startTimelineStream } from "../misskey/streaming";
import { reactToNote, createNote, showNote, unreactToNote } from "../misskey/api";
import { PostActionModal } from "./PostActionModal";
import { EmojiPickerModal } from "./EmojiPickerModal";
import { buildEmojiResolver, getEmojis, type MisskeyEmoji } from "../misskey/emojis";
import { ReplyIcon, RepeatIcon, SmileIcon } from "../icons";
import { MediaLightboxModal, type LightboxItem } from "../components/MediaLightboxModal";

type Props = {
  query: TileQuery;
};

const PAGE_SIZE = 40;

export function TileTimeline(props: Props) {
  const queryKey = useMemo(() => JSON.stringify(props.query), [props.query]);
  const [items, setItems] = useState<Post[]>(() => getMockTimelinePage(props.query, 0, PAGE_SIZE));
  const [loaded, setLoaded] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"mock" | "misskey">("mock");
  const nextCursorRef = useRef<string | null>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "quote" | "reply" | null; post: Post | null }>({ mode: null, post: null });
  const [emojiOpenFor, setEmojiOpenFor] = useState<Post | null>(null);
  const [emojiList, setEmojiList] = useState<MisskeyEmoji[]>([]);
  const [cwOpen, setCwOpen] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);

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

        const page = await fetchTimeline(account, { kind, limit: PAGE_SIZE });
        if (canceled) return;
        setMode("misskey");
        setItems(page.items);
        setLoaded(page.items.length);
        nextCursorRef.current = page.nextCursor?.type === "max_id" ? page.nextCursor.value : null;
        setLoading(false);

        streamRef.current = startTimelineStream(
          account,
          kind,
          (p) => {
            setItems((prev) => {
              const key = p.uri ?? p.remoteId;
              if (!key) return [p, ...prev];
              if (prev.some((x) => (x.uri ?? x.remoteId) === key)) return prev;
              return [p, ...prev].slice(0, 500);
            });
          },
          () => {
            // ignore for now; polling fallback can be added later
          },
        );
      } catch {
        if (canceled) return;
        setMode("mock");
        setItems(getMockTimelinePage(props.query, 0, PAGE_SIZE));
        setLoaded(PAGE_SIZE);
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [queryKey, props.query]);

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
        estimateItemHeight={90}
        overscan={8}
        endThresholdPx={900}
        onNearEnd={loadMore}
        renderItem={(p, idx) => (
          <div className="listItem" key={`${p.createdAt}-${idx}`}>
            <div className="listRow">
            {p.author.avatarUrl ? (
              <img className="avatar" src={p.author.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <div className="avatar avatarFallback" aria-hidden="true" />
            )}
            <div style={{ minWidth: 0 }}>
              <div className="listTitleRow">
                <span className="listTitle">{p.author.displayName ?? p.author.handle}</span>
                <span className="listHandleMuted">{p.author.handle}</span>
              </div>
              {(() => {
                const key = (p.uri ?? (p.remoteId as any as string) ?? `${p.createdAt}-${idx}`) as string;
                const open = cwOpen[key] === true;
                const hasCw = !!p.cw;
                const toggle = () => setCwOpen((m) => ({ ...m, [key]: !open }));

                const renderMedia = (post: Post) => {
                  if (!post.media || post.media.length === 0) return null;
                  const imageItems: LightboxItem[] = post.media
                    .filter((m) => m.type === "image" && m.url)
                    .map((m) => ({ url: m.url!, alt: m.description ?? "" }));
                  return (
                    <div className="mediaGrid">
                      {post.media
                        .filter((m) => m.url)
                        .slice(0, 6)
                        .map((m, mi) => {
                          if (m.type === "image" && imageItems.length > 0) {
                            const idx2 = imageItems.findIndex((x) => x.url === m.url);
                            return (
                              <button
                                key={mi}
                                type="button"
                                className="mediaItem mediaButton"
                                onClick={() => {
                                  const index = idx2 >= 0 ? idx2 : 0;
                                  setLightbox({ items: imageItems, index });
                                }}
                                aria-label="Open image"
                              >
                                <img
                                  className="mediaThumb"
                                  src={m.previewUrl ?? m.url}
                                  alt={m.description ?? ""}
                                  loading="lazy"
                                  decoding="async"
                                  style={m.width && m.height ? ({ aspectRatio: `${m.width} / ${m.height}` } as any) : undefined}
                                />
                              </button>
                            );
                          }

                          return (
                            <a key={mi} href={m.url} target="_blank" rel="noreferrer noopener" className="mediaItem">
                              {m.type === "video" ? (
                                <div className="mediaVideo">
                                  {m.previewUrl ? (
                                    <img
                                      className="mediaThumb"
                                      src={m.previewUrl}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      style={m.width && m.height ? ({ aspectRatio: `${m.width} / ${m.height}` } as any) : undefined}
                                    />
                                  ) : null}
                                  <div className="mediaBadge">VIDEO</div>
                                </div>
                              ) : (
                                <div className="mediaBadge">FILE</div>
                              )}
                            </a>
                          );
                        })}
                    </div>
                  );
                };

                const renderBody = (post: Post) => (
                  <>
                    <div className="listMeta">
                      {post.contentFormat === "mfm"
                        ? renderMfm(post.content, { emojiResolver: buildEmojiResolver({ emojis: post.customEmojis, global: emojiList }) })
                        : post.content}
                    </div>
                    {renderMedia(post)}
                  </>
                );

                if (p.repostOf) {
                  return (
                    <>
                      {hasCw ? (
                        <div className="cwLine">
                          <span className="cwText">{p.cw}</span>
                          <button type="button" className="cwBtn" onClick={toggle}>
                            {open ? "Hide" : "View"}
                          </button>
                        </div>
                      ) : null}
                      {open || !hasCw ? (p.content?.trim() ? renderBody(p) : null) : null}

                      <div className="listMeta listRenoteMeta">{p.content?.trim() ? "" : "Renoted"}</div>
                      <div className="renoteBox">
                        <div className="listRow">
                          {p.repostOf.author.avatarUrl ? (
                            <img className="avatar" src={p.repostOf.author.avatarUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <div className="avatar avatarFallback" aria-hidden="true" />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="listTitleRow">
                              <span className="listTitle">{p.repostOf.author.displayName ?? p.repostOf.author.handle}</span>
                              <span className="listHandleMuted">{p.repostOf.author.handle}</span>
                            </div>
                            {p.repostOf.cw ? (
                              <div className="cwLine">
                                <span className="cwText">{p.repostOf.cw}</span>
                                <button
                                  type="button"
                                  className="cwBtn"
                                  onClick={() => {
                                    const k2 = `${key}:repost`;
                                    const open2 = cwOpen[k2] === true;
                                    setCwOpen((m) => ({ ...m, [k2]: !open2 }));
                                  }}
                                >
                                  {cwOpen[`${key}:repost`] ? "Hide" : "View"}
                                </button>
                              </div>
                            ) : null}
                            {(p.repostOf.cw ? cwOpen[`${key}:repost`] : true) ? renderBody(p.repostOf) : null}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                }

                if (hasCw) {
                  return (
                    <>
                      <div className="cwLine">
                        <span className="cwText">{p.cw}</span>
                        <button type="button" className="cwBtn" onClick={toggle}>
                          {open ? "Hide" : "View"}
                        </button>
                      </div>
                      {open ? renderBody(p) : null}
                    </>
                  );
                }

                return renderBody(p);
              })()}

              <div className="postActions">
                <button
                  className="postIconBtn"
                  title="Reply"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModal({ mode: "reply", post: p });
                  }}
                >
                  <span className="postIconSvg" aria-hidden="true">
                    <ReplyIcon />
                  </span>
                </button>

                <button
                  className="postIconBtn"
                  title="Renote"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuFor((p.remoteId as any as string) ?? null);
                  }}
                >
                  <span className="postIconSvg" aria-hidden="true">
                    <RepeatIcon />
                  </span>
                </button>

                <button
                  className="postIconBtn"
                  title="React"
                  onClick={async (e) => {
                    e.stopPropagation();
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
                      setEmojiOpenFor(p);
                    }
                  }}
                >
                  <span className="postIconSvg" aria-hidden="true">
                    <SmileIcon />
                  </span>
                </button>
              </div>

              {Array.isArray(p.reactions) && p.reactions.length > 0 ? (
                <div className="reactionBar" aria-label="Reactions">
                  {p.reactions.slice(0, 8).map((r) => (
                    <button
                      type="button"
                      className={["reactionPill", p.myReaction === r.key ? "reactionPillActive" : ""].filter(Boolean).join(" ")}
                      key={r.key}
                      title="Toggle reaction"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (mode !== "misskey") return;
                        const noteId = (p.remoteId as any as string | undefined) ?? "";
                        if (!noteId) return;
                        const accounts = await loadAccounts();
                        const account = accounts.misskey[0];
                        if (!account) return;

                        // Ensure we have myReaction/reactions for older notes.
                        let current = p;
                        if (!current.myReaction || !Array.isArray(current.reactions)) {
                          try {
                            const fresh = await showNote(account, { noteId });
                            setItems((prev) => prev.map((x) => ((x.remoteId as any) === noteId ? { ...x, ...fresh } : x)));
                            current = fresh;
                          } catch {
                            // ignore
                          }
                        }

                        const already = current.myReaction === r.key;
                        try {
                          // optimistic UI
                          setItems((prev) =>
                            prev.map((x) => {
                              if ((x.remoteId as any) !== noteId) return x;
                              const reactions = (x.reactions ?? []).map((rr) =>
                                rr.key === r.key ? { ...rr, count: Math.max(0, rr.count + (already ? -1 : 1)) } : rr,
                              );
                              const myReaction = already ? undefined : r.key;
                              return { ...x, reactions, myReaction };
                            }),
                          );

                          if (already) await unreactToNote(account, { noteId });
                          else await reactToNote(account, { noteId, reaction: r.key });
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
                    >
                      {(() => {
                        const resolver = buildEmojiResolver({ emojis: p.customEmojis, global: emojiList });
                        const key = r.key;
                        if (key.startsWith(":") && key.endsWith(":")) {
                          const name = key.slice(1, -1);
                          const url = resolver(name);
                          return (
                            <>
                              {url ? <img src={url} alt={key} loading="lazy" decoding="async" /> : key}
                            </>
                          );
                        }
                        return (
                          <>
                            {key}
                          </>
                        );
                      })()}{" "}
                      {r.count}
                    </button>
                  ))}
                </div>
              ) : null}

              {actionMenuFor && actionMenuFor === (p.remoteId as any as string | null) ? (
                <div className="tileMenu" role="menu" style={{ position: "relative", marginTop: 8, right: "auto" as any }}>
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={async () => {
                      setActionMenuFor(null);
                      if (mode !== "misskey") return;
                      const noteId = (p.remoteId as any as string | undefined) ?? "";
                      if (!noteId) return;
                      const accounts = await loadAccounts();
                      const account = accounts.misskey[0];
                      if (!account) return;
                      await createNote(account, { text: "", renoteId: noteId, visibility: "public" });
                    }}
                  >
                    Renote
                  </button>
                  <button
                    className="tileMenuItem"
                    role="menuitem"
                    onClick={() => {
                      setActionMenuFor(null);
                      setModal({ mode: "quote", post: p });
                    }}
                  >
                    Quote…
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    />

      <PostActionModal mode={modal.mode} post={modal.post} onClose={() => setModal({ mode: null, post: null })} />

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
    </>
  );
}

// (legacy export removed)
