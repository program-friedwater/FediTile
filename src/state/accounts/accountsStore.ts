import { idbGet } from "../../integrations/storage/idb";
import type { AccountsState, MastodonAccount, MisskeyAccount, ServiceAccountBase } from "./accountTypes";

export type { AccountsState, MastodonAccount, MisskeyAccount } from "./accountTypes";

type AccountsIndex = {
  version: 2;
  misskeyIds: string[];
  mastodonIds: string[];
  defaultAccountId?: string;
  defaultMastodonAccountId?: string;
};

const LEGACY_KEY = "accounts.v1";
const INDEX_KEY = "accounts.v2:index";
const KEY_PREFIX = { misskey: "accounts.v2:misskey:", mastodon: "accounts.v2:mastodon:" } as const;
const ACCOUNTS_CHANGED_EVENT = "feditile:accounts-changed";
const ACCOUNTS_CHANGED_BROADCAST = "feditile-accounts";

function emptyAccounts(): AccountsState {
  return { version: 1, misskey: [], mastodon: [] };
}

function accountKey(serviceId: "misskey" | "mastodon", id: string) {
  return `${KEY_PREFIX[serviceId]}${id}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readIndex() {
  const parsed = readJson<Partial<AccountsIndex>>(INDEX_KEY);
  if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.misskeyIds)) return null;
  return { mastodonIds: [], ...parsed } as AccountsIndex;
}

function emitAccountsChanged() {
  window.dispatchEvent(new Event(ACCOUNTS_CHANGED_EVENT));
  localStorage.setItem(ACCOUNTS_CHANGED_BROADCAST, String(Date.now()));
}

function normalizeAccounts<T extends ServiceAccountBase>(accounts: T[]) {
  const map = new Map<string, T>();
  for (const account of accounts) map.set(account.id, account);
  return [...map.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function readAccountsByIds<T extends ServiceAccountBase>(serviceId: "misskey" | "mastodon", ids: string[]) {
  return normalizeAccounts(ids.map((id) => readJson<T>(accountKey(serviceId, id))).filter(Boolean) as T[]);
}

async function ensureMigration() {
  if (readIndex()) return;
  const legacyLocal = readJson<Partial<AccountsState>>(LEGACY_KEY);
  const legacyIdb = await idbGet<Partial<AccountsState>>(LEGACY_KEY).catch(() => null);
  const misskey = normalizeAccounts([...(legacyLocal?.misskey ?? []), ...(legacyIdb?.misskey ?? [])]);
  const mastodon = normalizeAccounts([...(legacyLocal?.mastodon ?? []), ...(legacyIdb?.mastodon ?? [])]);
  for (const account of misskey) writeJson(accountKey("misskey", account.id), account);
  for (const account of mastodon) writeJson(accountKey("mastodon", account.id), account);
  writeJson(INDEX_KEY, {
    version: 2,
    misskeyIds: misskey.map((account) => account.id),
    mastodonIds: mastodon.map((account) => account.id),
    defaultAccountId: legacyLocal?.defaultAccountId ?? legacyIdb?.defaultAccountId ?? misskey[0]?.id,
    defaultMastodonAccountId: legacyLocal?.defaultMastodonAccountId ?? legacyIdb?.defaultMastodonAccountId ?? mastodon[0]?.id,
  } satisfies AccountsIndex);
}

export function onAccountsChanged(cb: () => void): () => void {
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === ACCOUNTS_CHANGED_BROADCAST || e.key === INDEX_KEY || e.key?.startsWith(KEY_PREFIX.misskey) || e.key?.startsWith(KEY_PREFIX.mastodon)) cb();
  };
  window.addEventListener(ACCOUNTS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(ACCOUNTS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener("storage", storageHandler);
  };
}

export async function loadAccounts(): Promise<AccountsState> {
  await ensureMigration();
  const index = readIndex();
  if (!index) return emptyAccounts();
  const misskey = readAccountsByIds<MisskeyAccount>("misskey", index.misskeyIds);
  const mastodon = readAccountsByIds<MastodonAccount>("mastodon", index.mastodonIds);
  return {
    version: 1,
    misskey,
    mastodon,
    defaultAccountId: index.defaultAccountId ?? misskey[0]?.id,
    defaultMastodonAccountId: index.defaultMastodonAccountId ?? mastodon[0]?.id,
  };
}

export function getDefaultMisskeyAccount(accounts: AccountsState) {
  return accounts.misskey.find((account) => account.id === accounts.defaultAccountId) ?? accounts.misskey[0];
}

export function getDefaultMastodonAccount(accounts: AccountsState) {
  return accounts.mastodon.find((account) => account.id === accounts.defaultMastodonAccountId) ?? accounts.mastodon[0];
}

export async function saveAccounts(next: AccountsState): Promise<void> {
  await ensureMigration();
  const misskey = normalizeAccounts(next.misskey);
  const mastodon = normalizeAccounts(next.mastodon);
  const prev = readIndex();
  for (const account of misskey) writeJson(accountKey("misskey", account.id), account);
  for (const account of mastodon) writeJson(accountKey("mastodon", account.id), account);
  for (const id of prev?.misskeyIds ?? []) if (!misskey.some((account) => account.id === id)) localStorage.removeItem(accountKey("misskey", id));
  for (const id of prev?.mastodonIds ?? []) if (!mastodon.some((account) => account.id === id)) localStorage.removeItem(accountKey("mastodon", id));
  writeJson(INDEX_KEY, {
    version: 2,
    misskeyIds: misskey.map((account) => account.id),
    mastodonIds: mastodon.map((account) => account.id),
    defaultAccountId: next.defaultAccountId ?? misskey[0]?.id,
    defaultMastodonAccountId: next.defaultMastodonAccountId ?? mastodon[0]?.id,
  } satisfies AccountsIndex);
  emitAccountsChanged();
}

export async function setDefaultMisskeyAccount(accountId: string) {
  const current = await loadAccounts();
  if (!current.misskey.some((account) => account.id === accountId)) return current;
  const next = { ...current, defaultAccountId: accountId };
  await saveAccounts(next);
  return next;
}

export async function upsertMisskeyAccount(account: MisskeyAccount) {
  const current = await loadAccounts();
  const misskey = normalizeAccounts([account, ...current.misskey.filter((item) => item.id !== account.id)]);
  const next = { ...current, misskey, defaultAccountId: current.defaultAccountId ?? account.id };
  await saveAccounts(next);
  return next;
}

export async function removeMisskeyAccount(accountId: string) {
  const current = await loadAccounts();
  const misskey = current.misskey.filter((account) => account.id !== accountId);
  const next = { ...current, misskey, defaultAccountId: current.defaultAccountId === accountId ? misskey[0]?.id : current.defaultAccountId };
  await saveAccounts(next);
  return next;
}

export async function upsertMastodonAccount(account: MastodonAccount) {
  const current = await loadAccounts();
  const mastodon = normalizeAccounts([account, ...current.mastodon.filter((item) => item.id !== account.id)]);
  const next = { ...current, mastodon, defaultMastodonAccountId: current.defaultMastodonAccountId ?? account.id };
  await saveAccounts(next);
  return next;
}
