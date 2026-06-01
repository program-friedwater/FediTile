import { useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "../../domain/types";
import type { TileQuery } from "./tileTypes";
import { getMockTimelinePage } from "./mockData";
import { VirtualList } from "./VirtualList";
import { renderMfm } from "../mfm/renderMfm";
import { loadAccounts } from "../accounts/accountsStore";
import { fetchTimeline } from "../misskey/api";
import { startTimelineStream } from "../misskey/streaming";

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

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setMode("mock");
    nextCursorRef.current = null;
    streamRef.current?.close();
    streamRef.current = null;

    (async () => {
      // Only timeline kinds for now
      const isTimeline = props.query.kind === "home" || props.query.kind === "local" || props.query.kind === "federated";
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

        const page = await fetchTimeline(account, { kind: props.query.kind, limit: PAGE_SIZE });
        if (canceled) return;
        setMode("misskey");
        setItems(page.items);
        setLoaded(page.items.length);
        nextCursorRef.current = page.nextCursor?.type === "until_id" ? page.nextCursor.value : null;
        setLoading(false);

        streamRef.current = startTimelineStream(
          account,
          props.query.kind,
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
          const acc = await loadAccounts();
          const account = acc.misskey[0];
          if (!account) throw new Error("No Misskey account connected");
          const untilId = nextCursorRef.current;
          const page = await fetchTimeline(account, {
            kind: props.query.kind as any,
            limit: PAGE_SIZE,
            cursor: untilId ? { type: "until_id", value: untilId } : undefined,
          });
          setItems((prev) => prev.concat(page.items));
          setLoaded((n) => n + page.items.length);
          nextCursorRef.current = page.nextCursor?.type === "until_id" ? page.nextCursor.value : null;
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
    <VirtualList
      className="tileScroller"
      items={items}
      estimateItemHeight={78}
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
              <div className="listTitle">{p.author.displayName ?? p.author.handle}</div>
              {p.repostOf ? (
                <>
                  <div className="listMeta listRenoteMeta">Renoted</div>
                  <div className="renoteBox">
                    <div className="listRow">
                      {p.repostOf.author.avatarUrl ? (
                        <img
                          className="avatar"
                          src={p.repostOf.author.avatarUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="avatar avatarFallback" aria-hidden="true" />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="listTitle">{p.repostOf.author.displayName ?? p.repostOf.author.handle}</div>
                        <div className="listMeta">
                          {p.repostOf.contentFormat === "mfm" ? renderMfm(p.repostOf.content) : p.repostOf.content}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="listMeta">{p.contentFormat === "mfm" ? renderMfm(p.content) : p.content}</div>
              )}
            </div>
          </div>
        </div>
      )}
    />
  );
}
