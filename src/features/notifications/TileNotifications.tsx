import { useEffect, useMemo, useRef, useState } from "react";
import type { Notification } from "../../domain/types";
import { PostCard } from "../../components/post/PostCard";
import { Pill } from "../../components/ui/Pill";
import { getDefaultMisskeyAccount, loadAccounts, onAccountsChanged } from "../../state/accounts/accountsStore";
import { emitInspectIntent } from "../../state/events/inspectBus";
import { fetchNotifications } from "../../integrations/misskey/api";
import { getEmojis, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { startNotificationsStream } from "../../integrations/misskey/streaming";
import { VirtualList } from "../timeline/VirtualList";

const PAGE_SIZE = 40;
const ESTIMATED_ITEM_HEIGHT = 116;

function notificationLabel(notification: Notification): string {
  switch (notification.type) {
    case "follow":
      return "followed you";
    case "mention":
      return "mentioned you";
    case "reply":
      return "replied to you";
    case "repost":
      return "renoted your post";
    case "reaction":
      return "reacted to your post";
    case "poll":
      return "updated a poll";
    case "system":
      return "sent a system event";
    default:
      return notification.rawType ? `sent ${notification.rawType}` : "sent a notification";
  }
}

export function TileNotifications(props: { reconnectToken?: number }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsEpoch, setAccountsEpoch] = useState(0);
  const [emojiList, setEmojiList] = useState<MisskeyEmoji[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => onAccountsChanged(() => setAccountsEpoch((n) => n + 1)), []);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    nextCursorRef.current = null;
    streamRef.current?.close();
    streamRef.current = null;

    (async () => {
      try {
        const accounts = await loadAccounts();
        const account = getDefaultMisskeyAccount(accounts);
        if (!account) throw new Error("No Misskey account connected");

        const [page, emojis] = await Promise.all([
          fetchNotifications(account, { limit: PAGE_SIZE }),
          getEmojis(account).catch(() => [] as MisskeyEmoji[]),
        ]);
        if (canceled) return;
        setItems(page.items);
        setEmojiList(emojis);
        nextCursorRef.current = page.nextCursor?.type === "max_id" ? page.nextCursor.value : null;
        setLoading(false);

        streamRef.current = startNotificationsStream(account, (notification) => {
          setItems((prev) => {
            const key = notification.remoteId;
            if (key && prev.some((x) => x.remoteId === key)) return prev;
            return [notification, ...prev].slice(0, 500);
          });
        });
      } catch {
        if (canceled) return;
        setItems([]);
        setEmojiList([]);
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [accountsEpoch, props.reconnectToken]);

  const loadMore = async () => {
    if (loading) return;
    if (!nextCursorRef.current) return;
    setLoading(true);
    try {
      const accounts = await loadAccounts();
      const account = getDefaultMisskeyAccount(accounts);
      if (!account) throw new Error("No Misskey account connected");
      const page = await fetchNotifications(account, {
        limit: PAGE_SIZE,
        cursor: { type: "max_id", value: nextCursorRef.current },
      });
      setItems((prev) => prev.concat(page.items));
      nextCursorRef.current = page.nextCursor?.type === "max_id" ? page.nextCursor.value : null;
    } finally {
      setLoading(false);
    }
  };

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {empty ? <div className="emptyState">No notifications yet.</div> : null}

      <VirtualList
        className="tileScroller"
        items={items}
        itemKey={(item, index) => String(item.remoteId ?? `${item.createdAt}-${index}`)}
        estimateItemHeight={ESTIMATED_ITEM_HEIGHT}
        overscan={6}
        endThresholdPx={700}
        onNearEnd={() => {
          void loadMore();
        }}
        renderItem={(item, index) => (
          <div className="listItem" key={String(item.remoteId ?? `${item.createdAt}-${index}`)}>
            <div className="listRow">
              {item.actor?.avatarUrl ? (
                <img
                  className="avatar"
                  src={item.actor.avatarUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onClick={(e) => {
                    e.stopPropagation();
                    emitInspectIntent({ type: "author", author: item.actor! });
                  }}
                  style={{ cursor: "pointer" }}
                />
              ) : (
                <div className="avatar avatarFallback" aria-hidden="true" />
              )}
              <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                <div className="listTitleRow">
                  <span className="listTitle">{item.actor?.displayName ?? item.actor?.handle ?? "Notification"}</span>
                  {item.actor?.handle ? <span className="listHandleMuted">{item.actor.handle}</span> : null}
                </div>
                <div className="listMeta">{notificationLabel(item)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pill>{new Date(item.createdAt).toLocaleTimeString()}</Pill>
                  {item.rawType ? <Pill>{item.rawType}</Pill> : null}
                </div>
                {item.post ? (
                  <PostCard
                    post={item.post}
                    emojiList={emojiList}
                    cwOpen={{}}
                    cwKey={String(item.post.remoteId ?? item.post.uri ?? item.createdAt)}
                    onToggleCw={() => {}}
                    onInspectPost={(post) => emitInspectIntent({ type: "post", post })}
                    onInspectAuthor={(post) => emitInspectIntent({ type: "author", author: post.author })}
                    hideActions={true}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
