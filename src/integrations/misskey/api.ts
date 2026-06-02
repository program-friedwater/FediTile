import type { AccountId, Author, Cursor, Notification, NotificationType, Post, TimelinePage, TimelineRequest, Uri } from "../../domain/types";
import type { MisskeyAccount } from "../../state/accounts/accountsStore";

export type MisskeyNote = any;

function normalizeEmojiMap(input: unknown): Record<string, string> | undefined {
  if (!input) return undefined;

  if (Array.isArray(input)) {
    const entries = input.flatMap((emoji) => {
      const name = typeof emoji?.name === "string" ? emoji.name : "";
      const url =
        typeof emoji?.url === "string"
          ? emoji.url
          : typeof emoji?.host === "string" && typeof emoji?.name === "string"
            ? `https://${emoji.host}/emoji/${emoji.name}.webp`
            : "";
      return name && url ? [[name, url] as const] : [];
    });
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (typeof input === "object") {
    const source = input as Record<string, unknown>;
    const entries = Object.entries(source).flatMap(([name, value]) => {
      if (typeof value === "string" && value) return [[name, value] as const];
      if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") {
        return [[name, String((value as { url: string }).url)] as const];
      }
      return [];
    });
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  return undefined;
}

function hostFromInstanceUrl(instanceUrl: string): string {
  const raw = String(instanceUrl ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).host;
  } catch {
    // Allow scheme-less input like "misskey.io"
    try {
      return new URL(`https://${raw}`).host;
    } catch {
      return raw.replace(/^https?:\/\//, "").split("/")[0] ?? "";
    }
  }
}

function toCursor(req: TimelineRequest): { sinceId?: string; untilId?: string; limit: number } {
  const limit = typeof req.limit === "number" ? req.limit : 40;
  if (!req.cursor) return { limit };
  switch (req.cursor.type) {
    case "since_id":
      return { limit, sinceId: req.cursor.value };
    case "max_id":
      return { limit, untilId: req.cursor.value };
    default:
      return { limit };
  }
}

function noteUri(account: MisskeyAccount, note: MisskeyNote): Uri | undefined {
  const id = note?.id as string | undefined;
  if (!id) return undefined;
  return (`${account.instanceUrl}/notes/${id}` as Uri);
}

function accountIdFromMisskeyAccount(account: MisskeyAccount): AccountId {
  return account.id as AccountId;
}

function normalizeMisskeyAuthor(account: MisskeyAccount, user: any): Author {
  const instanceHost = hostFromInstanceUrl(account.instanceUrl);
  const username = (user?.username as string | undefined) ?? "unknown";
  const host = (user?.host as string | null | undefined) ?? instanceHost;
  return {
    remoteId: (user?.id as any) ?? undefined,
    handle: host ? `@${username}@${host}` : `@${username}`,
    displayName: user?.name ?? username,
    avatarUrl: user?.avatarUrl ?? undefined,
    url: user?.host ? `${account.instanceUrl}/@${username}@${user.host}` : `${account.instanceUrl}/@${username}`,
  };
}

export function normalizeMisskeyNote(account: MisskeyAccount, note: MisskeyNote): Post {
  const createdAt = (note?.createdAt as string | undefined) ?? new Date().toISOString();
  const author = note?.user ?? {};
  const text = (note?.text as string | null | undefined) ?? "";
  const cw = (note?.cw as string | null | undefined) ?? undefined;
  const renote = note?.renote as MisskeyNote | undefined;
  const renotePost = renote ? normalizeMisskeyNote(account, renote) : undefined;
  const reply = note?.reply as MisskeyNote | undefined;
  const replyPost = reply ? normalizeMisskeyNote(account, reply) : undefined;
  const noteEmojis = normalizeEmojiMap(note?.emojis);
  const userEmojis = normalizeEmojiMap(author?.emojis);
  const emojis =
    noteEmojis || userEmojis
      ? {
          ...(userEmojis ?? {}),
          ...(noteEmojis ?? {}),
        }
      : undefined;
  const files = Array.isArray(note?.files) ? note.files : [];
  const myReaction = (note?.myReaction as string | null | undefined) ?? undefined;
  const poll =
    note?.poll && Array.isArray(note.poll.choices)
      ? {
          multiple: note.poll.multiple === true,
          expiresAt: typeof note.poll.expiresAt === "string" ? note.poll.expiresAt : undefined,
          choices: note.poll.choices.map((choice: any) => ({
            text: String(choice?.text ?? ""),
            votes: Number(choice?.votes) || 0,
            isVoted: choice?.isVoted === true ? true : undefined,
          })),
        }
      : undefined;

  const instanceHost = hostFromInstanceUrl(account.instanceUrl);
  const username = (author?.username as string | undefined) ?? "unknown";
  const host = (author?.host as string | null | undefined) ?? instanceHost;

  return {
    serviceId: "misskey",
    accountId: accountIdFromMisskeyAccount(account),
    uri: noteUri(account, note),
    remoteId: (note?.id as any) ?? undefined,
    createdAt,
    author: normalizeMisskeyAuthor(account, author),
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
    poll,
    tags: Array.isArray(note?.tags) ? note.tags : undefined,
    reactions: note?.reactions
      ? Object.entries(note.reactions).map(([key, count]) => ({ key, count: Number(count) || 0 }))
      : undefined,
    myReaction: myReaction ?? undefined,
    customEmojis: emojis,
    repostOfUri: renotePost?.uri,
    repostOf: renotePost,
    replyToUri: replyPost?.uri,
    replyTo: replyPost,
    url: noteUri(account, note),
  };
}

function normalizeNotificationType(rawType: string | undefined): NotificationType {
  switch (rawType) {
    case "mention":
      return "mention";
    case "reply":
      return "reply";
    case "renote":
    case "quote":
      return "repost";
    case "reaction":
      return "reaction";
    case "follow":
      return "follow";
    case "pollVote":
    case "pollEnded":
      return "poll";
    case "achievementEarned":
      return "system";
    default:
      return "unknown";
  }
}

export function normalizeMisskeyNotification(account: MisskeyAccount, notification: any): Notification {
  return {
    serviceId: "misskey",
    accountId: accountIdFromMisskeyAccount(account),
    uri: undefined,
    remoteId: (notification?.id as any) ?? undefined,
    type: normalizeNotificationType(notification?.type as string | undefined),
    createdAt: (notification?.createdAt as string | undefined) ?? new Date().toISOString(),
    actor: notification?.user ? normalizeMisskeyAuthor(account, notification.user) : undefined,
    post: notification?.note ? normalizeMisskeyNote(account, notification.note) : undefined,
    rawType: notification?.type as string | undefined,
  };
}

async function postJson<T>(account: MisskeyAccount, endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = `${account.instanceUrl}/api/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ i: account.accessToken, ...body }),
  });
  if (!res.ok) {
    let details = "";
    try {
      const text = await res.text();
      details = text ? `: ${text.slice(0, 500)}` : "";
      try {
        const parsed = JSON.parse(text);
        const code = parsed?.error?.code as string | undefined;
        const message = parsed?.error?.message as string | undefined;
        if (code === "PERMISSION_DENIED") {
          throw new Error(
            `Misskey API permission denied for ${endpoint}. Re-connect your account in Settings to grant additional permissions. (${message ?? "PERMISSION_DENIED"})`,
          );
        }
      } catch {
        // ignore JSON parse errors
      }
    } catch {
      // ignore
    }
    throw new Error(`Misskey API failed: ${endpoint} (${res.status} ${res.statusText})${details}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export async function fetchTimeline(account: MisskeyAccount, req: TimelineRequest): Promise<TimelinePage> {
  const { limit, sinceId, untilId } = toCursor(req);
  const body: Record<string, unknown> = { limit };
  if (sinceId) body.sinceId = sinceId;
  if (untilId) body.untilId = untilId;

  let endpoint = "notes/timeline";
  if (req.kind === "local") {
    endpoint = "notes/local-timeline";
    body.withRenotes = false;
  }
  if (req.kind === "federated") endpoint = "notes/global-timeline";
  if (req.kind === "home") endpoint = "notes/timeline";

  const notes = await postJson<MisskeyNote[]>(account, endpoint, body);
  const items = notes.map((n) => normalizeMisskeyNote(account, n));
  const nextCursor: Cursor | undefined = items.length > 0 ? { type: "max_id", value: String(notes[notes.length - 1]?.id) } : undefined;
  return { items, nextCursor };
}

export async function fetchNotifications(
  account: MisskeyAccount,
  args: { limit?: number; cursor?: Cursor },
): Promise<{ items: Notification[]; nextCursor?: Cursor }> {
  const limit = typeof args.limit === "number" ? args.limit : 40;
  const body: Record<string, unknown> = { limit, includeTypes: ["follow", "mention", "reply", "renote", "quote", "reaction", "pollVote", "pollEnded"] };
  if (args.cursor?.type === "since_id") body.sinceId = args.cursor.value;
  if (args.cursor?.type === "max_id") body.untilId = args.cursor.value;
  const itemsRaw = await postJson<any[]>(account, "i/notifications", body);
  const items = itemsRaw.map((item) => normalizeMisskeyNotification(account, item));
  const nextCursor: Cursor | undefined = items.length > 0 ? { type: "max_id", value: String(itemsRaw[itemsRaw.length - 1]?.id) } : undefined;
  return { items, nextCursor };
}

export async function createNote(
  account: MisskeyAccount,
  args: {
    text?: string;
    cw?: string;
    visibility?: "public" | "home" | "followers" | "specified";
    replyId?: string;
    renoteId?: string;
    poll?: {
      choices: string[];
      multiple?: boolean;
      expiresAt?: string;
    };
  },
): Promise<Post> {
  const body: Record<string, unknown> = {};
  if (typeof args.text === "string" && args.text.trim().length > 0) body.text = args.text;
  if (args.cw) body.cw = args.cw;
  if (args.visibility) body.visibility = args.visibility;
  if (args.replyId) body.replyId = args.replyId;
  if (args.renoteId) body.renoteId = args.renoteId;
  if (args.poll && args.poll.choices.length >= 2) {
    body.poll = {
      choices: args.poll.choices,
      multiple: args.poll.multiple === true,
      expiresAt: args.poll.expiresAt,
    };
  }
  const note = await postJson<MisskeyNote>(account, "notes/create", body);
  // Some instances respond with { createdNote: {...} }
  const created = (note as any)?.createdNote ?? note;
  return normalizeMisskeyNote(account, created);
}

export async function reactToNote(account: MisskeyAccount, args: { noteId: string; reaction: string }): Promise<void> {
  await postJson(account, "notes/reactions/create", { noteId: args.noteId, reaction: args.reaction });
}

export async function voteOnPoll(account: MisskeyAccount, args: { noteId: string; choice: number }): Promise<void> {
  await postJson(account, "notes/polls/vote", { noteId: args.noteId, choice: args.choice });
}

export async function unreactToNote(account: MisskeyAccount, args: { noteId: string }): Promise<void> {
  await postJson(account, "notes/reactions/delete", { noteId: args.noteId });
}

export async function showNote(account: MisskeyAccount, args: { noteId: string }): Promise<Post> {
  const note = await postJson<MisskeyNote>(account, "notes/show", { noteId: args.noteId });
  return normalizeMisskeyNote(account, note);
}

export async function fetchReplies(account: MisskeyAccount, args: { noteId: string; limit?: number }): Promise<Post[]> {
  const limit = typeof args.limit === "number" ? args.limit : 30;
  const notes = await postJson<MisskeyNote[]>(account, "notes/replies", { noteId: args.noteId, limit });
  return notes.map((n) => normalizeMisskeyNote(account, n));
}

export async function showUser(
  account: MisskeyAccount,
  args: { userId: string },
): Promise<{ author: Post["author"]; noteCount?: number }> {
  const user = await postJson<any>(account, "users/show", { userId: args.userId });
  const instanceHost = hostFromInstanceUrl(account.instanceUrl);
  const username = (user?.username as string | undefined) ?? "unknown";
  const host = (user?.host as string | null | undefined) ?? instanceHost;
  return {
    author: {
      remoteId: (user?.id as any) ?? undefined,
      handle: host ? `@${username}@${host}` : `@${username}`,
      displayName: user?.name ?? username,
      avatarUrl: user?.avatarUrl ?? undefined,
      url: user?.host ? `${account.instanceUrl}/@${username}@${user.host}` : `${account.instanceUrl}/@${username}`,
    },
    noteCount: typeof user?.notesCount === "number" ? user.notesCount : undefined,
  };
}
