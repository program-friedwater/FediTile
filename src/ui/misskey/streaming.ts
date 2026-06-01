import type { Post } from "../../domain/types";
import type { MisskeyAccount } from "../accounts/accountsStore";

type ConnectBody = { channel: string; id: string; params?: Record<string, unknown> };

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function normalizeNote(account: MisskeyAccount, note: any): Post {
  const createdAt = (note?.createdAt as string | undefined) ?? new Date().toISOString();
  const author = note?.user ?? {};
  const text = (note?.text as string | null | undefined) ?? "";
  const cw = (note?.cw as string | null | undefined) ?? undefined;
  const renote = note?.renote as any | undefined;
  const id = note?.id as string | undefined;
  const uri = id ? (`${account.instanceUrl}/notes/${id}` as any) : undefined;
  const renotePost = renote ? normalizeNote(account, renote) : undefined;
  const emojis = (note?.emojis as Record<string, string> | undefined) ?? undefined;
  const files = Array.isArray(note?.files) ? note.files : [];
  const myReaction = (note?.myReaction as string | null | undefined) ?? undefined;
  return {
    serviceId: "misskey",
    uri,
    remoteId: (id as any) ?? undefined,
    createdAt,
    author: {
      handle: author?.username ? `@${author.username}` : "unknown",
      displayName: author?.name ?? author?.username ?? "unknown",
      avatarUrl: author?.avatarUrl ?? undefined,
    },
    contentFormat: "mfm",
    content: text || (renotePost ? "" : ""),
    cw,
    media:
      files.length > 0
        ? files.map((f: any) => ({
            type:
              f?.type?.startsWith("image/") ? "image" : f?.type?.startsWith("video/") ? "video" : f?.type?.startsWith("audio/") ? "audio" : "unknown",
            url: String(f?.url ?? ""),
            previewUrl: f?.thumbnailUrl ? String(f.thumbnailUrl) : undefined,
            description: f?.comment ? String(f.comment) : undefined,
            width: typeof f?.properties?.width === "number" ? f.properties.width : undefined,
            height: typeof f?.properties?.height === "number" ? f.properties.height : undefined,
          }))
        : undefined,
    tags: Array.isArray(note?.tags) ? note.tags : undefined,
    reactions: note?.reactions
      ? Object.entries(note.reactions).map(([key, count]) => ({ key, count: Number(count) || 0 }))
      : undefined,
    myReaction: myReaction ?? undefined,
    customEmojis: emojis,
    repostOfUri: renotePost?.uri,
    repostOf: renotePost,
    url: uri,
  };
}

export function startTimelineStream(
  account: MisskeyAccount,
  kind: "home" | "local" | "federated",
  onNote: (p: Post) => void,
  onError?: (err: string) => void,
): { close: () => void } {
  const u = new URL(`${account.instanceUrl.replace(/^http/, "ws")}/streaming`);
  u.searchParams.set("i", account.accessToken);

  const ws = new WebSocket(u.toString());
  const subId = `sub_${randomId()}`;

  const channel =
    kind === "home" ? "homeTimeline" : kind === "local" ? "localTimeline" : kind === "federated" ? "globalTimeline" : "homeTimeline";

  ws.onopen = () => {
    const msg = { type: "connect", body: { channel, id: subId, params: {} } satisfies ConnectBody };
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg?.type === "channel" && msg?.body?.id === subId) {
        if (msg?.body?.type === "note" && msg?.body?.body) {
          onNote(normalizeNote(account, msg.body.body));
        }
      } else if (msg?.type === "disconnect") {
        onError?.("stream disconnected");
      }
    } catch (e) {
      onError?.(String(e));
    }
  };

  ws.onerror = () => onError?.("stream error");
  ws.onclose = () => onError?.("stream closed");

  return {
    close: () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}
