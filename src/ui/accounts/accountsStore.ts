import { idbGet, idbSet } from "../storage/idb";

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

export async function loadAccounts(): Promise<AccountsState> {
  const v = await idbGet<AccountsState>(KEY);
  if (v && v.version === 1 && Array.isArray(v.misskey)) return v;
  return { version: 1, misskey: [] };
}

export async function saveAccounts(next: AccountsState): Promise<void> {
  await idbSet(KEY, next);
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
