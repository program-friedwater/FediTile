import { finishMiAuth } from "./miauth";
import { pushAuthTrace } from "./authTrace";

const AUTH_COMPLETE_EVENT = "feditile:misskey-auth-complete";
const AUTH_RESULT_PREFIX = "feditile:misskey-auth-result:";

function parseHash(hash: string): { path: string; params: URLSearchParams } {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, qs] = h.split("?", 2);
  return { path: path || "", params: new URLSearchParams(qs ?? "") };
}

async function processCallbackUrl(
  urlString: string,
  opts?: { finalizeBrowserCallback?: boolean },
): Promise<{ handled: boolean; ok?: boolean; error?: string }> {
  const url = new URL(urlString);
  const hash = parseHash(url.hash);
  const path = url.pathname === "/auth/misskey" ? "/auth/misskey" : hash.path;
  if (path !== "/auth/misskey" && path !== "auth/misskey") return { handled: false };
  pushAuthTrace("callback:hit", `${url.pathname}${url.search}${url.hash}`);

  const params = new URLSearchParams(url.search);
  hash.params.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  const instanceUrl = params.get("instanceUrl") ?? params.get("instance") ?? "";
  const session = params.get("session") ?? "";
  if (!instanceUrl || !session) return { handled: true, ok: false, error: "Missing instanceUrl/session" };

  try {
    pushAuthTrace("callback:params", `instance=${instanceUrl} session=${session}`);
    const account = await finishMiAuth({ instanceUrl, session });
    try {
      localStorage.setItem(`${AUTH_RESULT_PREFIX}${session}`, JSON.stringify({ ok: true, account, at: Date.now() }));
    } catch {
      // ignore
    }
    try {
      window.opener?.postMessage({ type: AUTH_COMPLETE_EVENT, account }, window.location.origin);
    } catch {
      // ignore
    }
    if (opts?.finalizeBrowserCallback) {
      if (url.pathname === "/auth/misskey" && (url.protocol === "http:" || url.protocol === "https:")) {
        window.location.replace(new URL("/", window.location.origin).toString());
      } else {
        window.location.hash = "";
      }
      try {
        window.close();
      } catch {
        // ignore
      }
    }
    pushAuthTrace("callback:done", account.id);
    return { handled: true, ok: true };
  } catch (e) {
    pushAuthTrace("callback:error", String(e));
    try {
      localStorage.setItem(`${AUTH_RESULT_PREFIX}${session}`, JSON.stringify({ ok: false, error: String(e), at: Date.now() }));
    } catch {
      // ignore
    }
    return { handled: true, ok: false, error: String(e) };
  }
}

export async function processMisskeyAuthCallbackUrl(urlString: string) {
  return processCallbackUrl(urlString, { finalizeBrowserCallback: false });
}

export async function handleMisskeyAuthCallback(): Promise<{ handled: boolean; ok?: boolean; error?: string }> {
  return processCallbackUrl(window.location.href, { finalizeBrowserCallback: true });
}
