import { upsertMisskeyAccount, type MisskeyAccount } from "../accounts/accountsStore";

function normalizeInstanceUrl(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error("Instance URL is empty");
  const u = new URL(t.includes("://") ? t : `https://${t}`);
  u.hash = "";
  u.search = "";
  // remove trailing slash
  return u.toString().replace(/\/+$/, "");
}

function randomSession(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type MiAuthStartArgs = {
  instanceUrl: string;
  appName: string;
  callbackUrl: string;
  permissions: string[];
};

export function startMiAuth(args: MiAuthStartArgs): { instanceUrl: string; session: string; authorizeUrl: string } {
  const instanceUrl = normalizeInstanceUrl(args.instanceUrl);
  const session = randomSession();
  const base = `${instanceUrl}/miauth/${session}`;

  const u = new URL(base);
  u.searchParams.set("name", args.appName);
  u.searchParams.set("callback", args.callbackUrl.replace("{session}", encodeURIComponent(session)));
  // MiAuth expects a single `permission` query parameter with comma-separated values.
  // Some servers may ignore multiple `permission=` parameters.
  u.searchParams.set("permission", args.permissions.join(","));

  return { instanceUrl, session, authorizeUrl: u.toString() };
}

export async function finishMiAuth(args: {
  instanceUrl: string;
  session: string;
}): Promise<MisskeyAccount> {
  const instanceUrl = normalizeInstanceUrl(args.instanceUrl);
  const url = `${instanceUrl}/api/miauth/${args.session}/check`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`MiAuth check failed: ${res.status}`);
  const json = (await res.json()) as any;
  const token = json?.token as string | undefined;
  const user = json?.user as any;
  if (!token) throw new Error("MiAuth did not return a token");

  const now = new Date().toISOString();
  const id = `misskey:${instanceUrl}:${user?.id ?? token.slice(0, 8)}`;
  const account: MisskeyAccount = {
    id,
    serviceId: "misskey",
    instanceUrl,
    accessToken: token,
    username: user?.username,
    name: user?.name,
    avatarUrl: user?.avatarUrl,
    createdAt: now,
    updatedAt: now,
  };
  await upsertMisskeyAccount(account);
  return account;
}
