import type { MisskeyAccount } from "../../state/accounts/accountsStore";
import { idbGet, idbSet } from "../storage/idb";
import { misskeyHttpFetch } from "./http";

export type MisskeyEmoji = {
  name: string;
  url: string;
  aliases?: string[];
  category?: string;
};

type Cache = {
  version: 1;
  fetchedAt: string;
  emojis: MisskeyEmoji[];
};

function cacheKey(instanceUrl: string) {
  return `misskey.emojis.v1:${instanceUrl}`;
}

export async function fetchMisskeyEmojis(account: MisskeyAccount): Promise<MisskeyEmoji[]> {
  const url = `${account.instanceUrl}/api/emojis`;
  const res = await misskeyHttpFetch(url, { body: "{}" });
  if (!res.ok) throw new Error(`Failed to fetch emojis (${res.status})`);
  const json = await res.json<any>();
  const list = Array.isArray(json?.emojis) ? json.emojis : Array.isArray(json) ? json : [];
  return list
    .map((e: any) => ({ name: String(e.name), url: String(e.url), aliases: e.aliases, category: e.category }))
    .filter((e: MisskeyEmoji) => e.name && e.url);
}

export async function loadEmojiCache(instanceUrl: string): Promise<Cache | undefined> {
  return idbGet<Cache>(cacheKey(instanceUrl));
}

export async function getEmojis(account: MisskeyAccount): Promise<MisskeyEmoji[]> {
  const cached = await loadEmojiCache(account.instanceUrl);
  if (cached?.version === 1 && Array.isArray(cached.emojis) && cached.emojis.length > 0) return cached.emojis;
  const emojis = await fetchMisskeyEmojis(account);
  await idbSet(cacheKey(account.instanceUrl), { version: 1, fetchedAt: new Date().toISOString(), emojis } satisfies Cache);
  return emojis;
}

export function normalizeEmojiKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const unwrapped = trimmed.startsWith(":") && trimmed.endsWith(":") ? trimmed.slice(1, -1) : trimmed;
  return unwrapped;
}

export function buildEmojiResolver(args: { emojis?: Record<string, string>; global?: MisskeyEmoji[] }) {
  const local = args.emojis ?? {};
  const globalMap = new Map<string, string>();
  for (const e of args.global ?? []) {
    const normalized = normalizeEmojiKey(e.name);
    if (!normalized) continue;
    globalMap.set(normalized, e.url);
    if (normalized.includes("@")) globalMap.set(normalized.split("@")[0] ?? normalized, e.url);
  }

  const localMap = new Map<string, string>();
  for (const [key, url] of Object.entries(local)) {
    const normalized = normalizeEmojiKey(key);
    if (!normalized) continue;
    localMap.set(normalized, url);
    if (normalized.includes("@")) localMap.set(normalized.split("@")[0] ?? normalized, url);
  }

  return (name: string): string | undefined => {
    const normalized = normalizeEmojiKey(name);
    if (!normalized) return undefined;
    return localMap.get(normalized) ?? globalMap.get(normalized) ?? localMap.get(normalized.split("@")[0] ?? normalized) ?? globalMap.get(normalized.split("@")[0] ?? normalized);
  };
}
