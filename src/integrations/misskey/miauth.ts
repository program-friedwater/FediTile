import { upsertMisskeyAccount, type MisskeyAccount } from "../../state/accounts/accountsStore";
import { pushAuthTrace } from "./authTrace";
import { misskeyHttpFetch } from "./http";

const PENDING_MIAUTH_PREFIX = "feditile:misskey-miauth-request:";
const PENDING_MIAUTH_TTL_MS = 10 * 60 * 1000;

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

function pendingRequestKey(requestId: string) {
  return `${PENDING_MIAUTH_PREFIX}${requestId}`;
}

function cleanupExpiredPendingMiAuthRequests() {
  try {
    const now = Date.now();
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PENDING_MIAUTH_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { createdAt?: number };
      if (typeof parsed.createdAt !== "number" || now - parsed.createdAt > PENDING_MIAUTH_TTL_MS) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

export function storePendingMiAuthRequest(args: { requestId: string; instanceUrl: string; session: string }) {
  cleanupExpiredPendingMiAuthRequests();
  localStorage.setItem(
    pendingRequestKey(args.requestId),
    JSON.stringify({
      instanceUrl: args.instanceUrl,
      session: args.session,
      createdAt: Date.now(),
    }),
  );
}

export function resolvePendingMiAuthRequest(
  requestId: string,
): { instanceUrl: string; session: string } | null {
  cleanupExpiredPendingMiAuthRequests();
  try {
    const raw = localStorage.getItem(pendingRequestKey(requestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { instanceUrl?: string; session?: string };
    if (!parsed.instanceUrl || !parsed.session) return null;
    return { instanceUrl: parsed.instanceUrl, session: parsed.session };
  } catch {
    return null;
  }
}

export function clearPendingMiAuthRequest(requestId: string) {
  try {
    localStorage.removeItem(pendingRequestKey(requestId));
  } catch {
    // ignore
  }
}

export type MiAuthStartArgs = {
  instanceUrl: string;
  appName: string;
  callbackUrl: string;
  permissions: string[];
};

export function startMiAuth(args: MiAuthStartArgs): { instanceUrl: string; session: string; requestId: string; authorizeUrl: string } {
  const instanceUrl = normalizeInstanceUrl(args.instanceUrl);
  const session = randomSession();
  const requestId = randomSession();
  const base = `${instanceUrl}/miauth/${session}`;

  const u = new URL(base);
  u.searchParams.set("name", args.appName);
  u.searchParams.set("callback", args.callbackUrl.replace("{requestId}", encodeURIComponent(requestId)));
  // MiAuth expects a single `permission` query parameter with comma-separated values.
  // Some servers may ignore multiple `permission=` parameters.
  u.searchParams.set("permission", args.permissions.join(","));
  storePendingMiAuthRequest({ requestId, instanceUrl, session });
  pushAuthTrace("start", `${instanceUrl} request=${requestId}`);

  return { instanceUrl, session, requestId, authorizeUrl: u.toString() };
}

export async function finishMiAuth(args: {
  instanceUrl: string;
  session: string;
}): Promise<MisskeyAccount> {
  const instanceUrl = normalizeInstanceUrl(args.instanceUrl);
  pushAuthTrace("finish:start", `${instanceUrl} session=${args.session}`);
  if (window.feditileDesktop?.platform === "tauri" && window.feditileDesktop.finishMisskeyMiAuth) {
    const account = await window.feditileDesktop.finishMisskeyMiAuth({ instanceUrl, session: args.session });
    await upsertMisskeyAccount(account);
    pushAuthTrace("finish:stored", account.id);
    return account;
  }
  const url = `${instanceUrl}/api/miauth/${args.session}/check`;
  const res = await misskeyHttpFetch(url, { body: "{}" });
  pushAuthTrace("finish:check", `status=${res.status}`);
  if (!res.ok) throw new Error(`MiAuth check failed: ${res.status}`);
  const json = (await res.json()) as any;
  const token = json?.token as string | undefined;
  if (!token) throw new Error("MiAuth did not return a token");

  const profileRes = await misskeyHttpFetch(`${instanceUrl}/api/i`, { body: JSON.stringify({ i: token }) });
  pushAuthTrace("finish:profile", `status=${profileRes.status}`);
  if (!profileRes.ok) throw new Error(`Failed to resolve authorized account: ${profileRes.status}`);
  const user = (await profileRes.json()) as any;

  const now = new Date().toISOString();
  const stableUserKey =
    typeof user?.id === "string" && user.id
      ? user.id
      : typeof user?.username === "string" && user.username
        ? `username:${user.username.toLowerCase()}`
        : `token:${token.slice(0, 16)}`;
  const id = `misskey:${instanceUrl}:${stableUserKey}`;
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
  pushAuthTrace("finish:stored", account.id);
  return account;
}
