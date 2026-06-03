import { idbGet } from "../../integrations/storage/idb";

export type MisskeyAccount = {
  id: string;
  serviceId: "misskey";
  instanceUrl: string;
  accessToken: string;
  username?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type AccountsState = {
  version: 1;
  misskey: MisskeyAccount[];
  defaultAccountId?: string;
};

type LegacyAccountsState = AccountsState;
type AccountsIndex = { version: 2; misskeyIds: string[]; defaultAccountId?: string };

const LEGACY_KEY = "accounts.v1";
const INDEX_KEY = "accounts.v2:index";
const ACCOUNT_KEY_PREFIX = "accounts.v2:misskey:";
const ACCOUNTS_CHANGED_EVENT = "feditile:accounts-changed";
const ACCOUNTS_CHANGED_BROADCAST = "feditile-accounts";

function emptyAccounts(): AccountsState {
  return { version: 1, misskey: [] };
}

function accountKey(id: string) {
  return `${ACCOUNT_KEY_PREFIX}${id}`;
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

function readIndex(): AccountsIndex | null {
  const parsed = readJson<AccountsIndex>(INDEX_KEY);
  return parsed && parsed.version === 2 && Array.isArray(parsed.misskeyIds) ? parsed : null;
}

function writeIndex(index: AccountsIndex) {
  writeJson(INDEX_KEY, index);
}

function emitAccountsChanged() {
  try {
    window.dispatchEvent(new Event(ACCOUNTS_CHANGED_EVENT));
    localStorage.setItem(ACCOUNTS_CHANGED_BROADCAST, String(Date.now()));
  } catch {
    // ignore
  }
}

function normalizeAccounts(accounts: MisskeyAccount[]) {
  const map = new Map<string, MisskeyAccount>();
  for (const account of accounts) map.set(account.id, account);
  return [...map.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function ensureMigration() {
  if (readIndex()) return;
  const legacyLocal = readJson<LegacyAccountsState>(LEGACY_KEY);
  const legacyIdb = await idbGet<LegacyAccountsState>(LEGACY_KEY).catch(() => null);
  const misskey = normalizeAccounts([...(legacyLocal?.misskey ?? []), ...(legacyIdb?.misskey ?? [])]);
  if (misskey.length === 0) {
    writeIndex({ version: 2, misskeyIds: [] });
    return;
  }
  for (const account of misskey) writeJson(accountKey(account.id), account);
  writeIndex({
    version: 2,
    misskeyIds: misskey.map((account) => account.id),
    defaultAccountId: legacyLocal?.defaultAccountId ?? legacyIdb?.defaultAccountId ?? misskey[0]?.id,
  });
}

export function onAccountsChanged(cb: () => void): () => void {
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === ACCOUNTS_CHANGED_BROADCAST || e.key === INDEX_KEY || e.key?.startsWith(ACCOUNT_KEY_PREFIX)) cb();
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
  const misskey = normalizeAccounts(index.misskeyIds.map((id) => readJson<MisskeyAccount>(accountKey(id))).filter(Boolean) as MisskeyAccount[]);
  return { version: 1, misskey, defaultAccountId: index.defaultAccountId ?? misskey[0]?.id };
}

export function getDefaultMisskeyAccount(accounts: AccountsState): MisskeyAccount | undefined {
  return accounts.misskey.find((account) => account.id === accounts.defaultAccountId) ?? accounts.misskey[0];
}

export async function saveAccounts(next: AccountsState): Promise<void> {
  await ensureMigration();
  const misskey = normalizeAccounts(next.misskey);
  const keep = new Set(misskey.map((account) => account.id));
  const prev = readIndex();
  for (const account of misskey) writeJson(accountKey(account.id), account);
  for (const id of prev?.misskeyIds ?? []) if (!keep.has(id)) localStorage.removeItem(accountKey(id));
  writeIndex({ version: 2, misskeyIds: misskey.map((account) => account.id), defaultAccountId: next.defaultAccountId ?? misskey[0]?.id });
  emitAccountsChanged();
}

export async function setDefaultMisskeyAccount(accountId: string): Promise<AccountsState> {
  const current = await loadAccounts();
  if (!current.misskey.some((account) => account.id === accountId)) return current;
  const next = { ...current, defaultAccountId: accountId };
  await saveAccounts(next);
  return next;
}

export async function upsertMisskeyAccount(account: MisskeyAccount): Promise<AccountsState> {
  const current = await loadAccounts();
  const misskey = normalizeAccounts([account, ...current.misskey.filter((item) => item.id !== account.id)]);
  const next = { version: 1 as const, misskey, defaultAccountId: current.defaultAccountId ?? account.id };
  await saveAccounts(next);
  return next;
}

export async function removeMisskeyAccount(accountId: string): Promise<AccountsState> {
  const current = await loadAccounts();
  const misskey = current.misskey.filter((account) => account.id !== accountId);
  const defaultAccountId = current.defaultAccountId === accountId ? misskey[0]?.id : current.defaultAccountId;
  const next = { version: 1 as const, misskey, defaultAccountId };
  await saveAccounts(next);
  return next;
}
