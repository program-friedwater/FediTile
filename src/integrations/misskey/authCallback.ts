import { finishMiAuth } from "./miauth";

const AUTH_COMPLETE_EVENT = "feditile:misskey-auth-complete";

function parseHash(hash: string): { path: string; params: URLSearchParams } {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, qs] = h.split("?", 2);
  return { path: path || "", params: new URLSearchParams(qs ?? "") };
}

export async function handleMisskeyAuthCallback(): Promise<{ handled: boolean; ok?: boolean; error?: string }> {
  const url = new URL(window.location.href);
  const hash = parseHash(window.location.hash);
  const path = url.pathname === "/auth/misskey" ? "/auth/misskey" : hash.path;
  if (path !== "/auth/misskey" && path !== "auth/misskey") return { handled: false };

  const params = new URLSearchParams(url.search);
  hash.params.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  const instanceUrl = params.get("instanceUrl") ?? params.get("instance") ?? "";
  const session = params.get("session") ?? "";
  if (!instanceUrl || !session) return { handled: true, ok: false, error: "Missing instanceUrl/session" };

  try {
    const account = await finishMiAuth({ instanceUrl, session });
    try {
      window.opener?.postMessage({ type: AUTH_COMPLETE_EVENT, account }, window.location.origin);
    } catch {
      // ignore
    }
    if (url.pathname === "/auth/misskey") window.location.replace(new URL("/", window.location.origin).toString());
    else window.location.hash = "";
    try {
      window.close();
    } catch {
      // ignore
    }
    return { handled: true, ok: true };
  } catch (e) {
    return { handled: true, ok: false, error: String(e) };
  }
}
