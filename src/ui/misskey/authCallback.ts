import { finishMiAuth } from "./miauth";

function parseHash(hash: string): { path: string; params: URLSearchParams } {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, qs] = h.split("?", 2);
  return { path: path || "", params: new URLSearchParams(qs ?? "") };
}

export async function handleMisskeyAuthCallback(): Promise<{ handled: boolean; ok?: boolean; error?: string }> {
  const { path, params } = parseHash(window.location.hash);
  if (path !== "/auth/misskey" && path !== "auth/misskey") return { handled: false };

  const instanceUrl = params.get("instanceUrl") ?? params.get("instance") ?? "";
  const session = params.get("session") ?? "";
  if (!instanceUrl || !session) return { handled: true, ok: false, error: "Missing instanceUrl/session" };

  try {
    await finishMiAuth({ instanceUrl, session });
    window.location.hash = "";
    return { handled: true, ok: true };
  } catch (e) {
    return { handled: true, ok: false, error: String(e) };
  }
}

