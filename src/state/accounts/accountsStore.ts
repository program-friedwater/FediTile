import { idbGet, idbSet } from "../../integrations/storage/idb";

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

const KEY = "accounts.v1";
const ACCOUNTS_CHANGED_EVENT = "feditile:accounts-changed";
const ACCOUNTS_CHANGED_BROADCAST = "feditile-accounts";

export function onAccountsChanged(cb: () => void): () => void {
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === ACCOUNTS_CHANGED_BROADCAST) cb();
  };
  window.addEventListener(ACCOUNTS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(ACCOUNTS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener("storage", storageHandler);
  };
}

function emitAccountsChanged() {
  try {
    window.dispatchEvent(new Event(ACCOUNTS_CHANGED_EVENT));
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(ACCOUNTS_CHANGED_BROADCAST, String(Date.now()));
  } catch {
    // ignore
  }
}

function emptyAccounts(): AccountsState {
  return { version: 1, misskey: [] };
}

function readLocalAccounts(): AccountsState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountsState;
    return parsed && parsed.version === 1 && Array.isArray(parsed.misskey) ? parsed : null;
  } catch {
    return null;
  }
}

function mergeAccounts(a: AccountsState | null | undefined, b: AccountsState | null | undefined): AccountsState {
  const merged = new Map<string, MisskeyAccount>();
  for (const account of [...(a?.misskey ?? []), ...(b?.misskey ?? [])]) merged.set(account.id, account);
  const misskey = [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    version: 1,
    misskey,
    defaultAccountId: a?.defaultAccountId ?? b?.defaultAccountId ?? misskey[0]?.id,
  };
}

export async function loadAccounts(): Promise<AccountsState> {
  const idbAccounts = await idbGet<AccountsState>(KEY);
  const merged = mergeAccounts(
    idbAccounts && idbAccounts.version === 1 && Array.isArray(idbAccounts.misskey) ? idbAccounts : null,
    readLocalAccounts(),
  );
  return merged.misskey.length > 0 ? merged : emptyAccounts();
}

export async function saveAccounts(next: AccountsState): Promise<void> {
  await idbSet(KEY, next);
  localStorage.setItem(KEY, JSON.stringify(next));
  emitAccountsChanged();
}

export async function upsertMisskeyAccount(account: MisskeyAccount): Promise<AccountsState> {
  const cur = await loadAccounts();
  const idx = cur.misskey.findIndex((a) => a.id === account.id);
  const misskey = idx >= 0 ? cur.misskey.map((a) => (a.id === account.id ? account : a)) : [account, ...cur.misskey];
  const next: AccountsState = { ...cur, misskey, defaultAccountId: cur.defaultAccountId ?? account.id };
  await saveAccounts(next);
  return next;
}

export async function removeMisskeyAccount(accountId: string): Promise<AccountsState> {
  const cur = await loadAccounts();
  const misskey = cur.misskey.filter((a) => a.id !== accountId);
  const defaultAccountId =
    cur.defaultAccountId === accountId ? (misskey[0]?.id ? misskey[0].id : undefined) : cur.defaultAccountId;
  const next: AccountsState = { ...cur, misskey, defaultAccountId };
  await saveAccounts(next);
  return next;
}
