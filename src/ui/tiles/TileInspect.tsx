import { useEffect, useMemo, useState } from "react";
import type { Author, Post } from "../../domain/types";
import { onInspectIntent, type InspectIntent } from "../state/inspectBus";
import { Pill } from "../components/Pill";
import { renderMfm } from "../mfm/renderMfm";
import { buildEmojiResolver, type MisskeyEmoji } from "../misskey/emojis";
import { getEmojis } from "../misskey/emojis";
import { loadAccounts } from "../accounts/accountsStore";
import { showNote, showUser } from "../misskey/api";

type ViewState =
  | { kind: "empty" }
  | { kind: "post"; post: Post; loadedAt: string }
  | { kind: "author"; author: Author; loadedAt: string; noteCount?: number };

function nowIso() {
  return new Date().toISOString();
}

export function TileInspect() {
  const [state, setState] = useState<ViewState>({ kind: "empty" });
  const [globalEmojis, setGlobalEmojis] = useState<MisskeyEmoji[]>([]);

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
        setState({ kind: "post", post: intent.post, loadedAt: nowIso() });
        try {
          const accounts = await loadAccounts();
          const account = accounts.misskey[0];
          if (!account) return;
          const id = (intent.post.remoteId as any as string | undefined) ?? "";
          if (!id) return;
          const fresh = await showNote(account, { noteId: id });
          setState({ kind: "post", post: fresh, loadedAt: nowIso() });
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
          <div className="listTitleRow">
            <span className="listTitle">{state.post.author.displayName ?? state.post.author.handle}</span>
            <span className="listHandleMuted">{state.post.author.handle}</span>
          </div>
          <div className="listMeta">{new Date(state.post.createdAt).toLocaleString()}</div>
          {state.post.cw ? (
            <div className="cwLine">
              <span className="cwText">{state.post.cw}</span>
            </div>
          ) : null}
          <div className="listMeta">
            {state.post.contentFormat === "mfm" ? renderMfm(state.post.content, { emojiResolver: resolver }) : state.post.content}
          </div>
          {state.post.url ? (
            <div className="listMeta">
              <a href={state.post.url} target="_blank" rel="noreferrer noopener">
                Open in browser
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
