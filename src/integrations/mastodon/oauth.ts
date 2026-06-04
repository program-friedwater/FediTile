const DEFAULT_MASTODON_SCOPES = ["read", "write", "push"] as const;

function normalizeInstanceUrl(raw: string) {
  const value = raw.trim();
  if (!value) throw new Error("Instance URL is empty");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}

function randomString(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[byte % 66]).join("");
}

async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createMastodonPkcePair() {
  const verifier = randomString(64);
  return { verifier, challenge: await sha256Base64Url(verifier) };
}

export async function buildMastodonAuthorizeUrl(args: {
  instanceUrl: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}) {
  const instanceUrl = normalizeInstanceUrl(args.instanceUrl);
  const state = randomString(32);
  const pkce = await createMastodonPkcePair();
  const url = new URL(`${instanceUrl}/oauth/authorize`);
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("scope", (args.scopes ?? [...DEFAULT_MASTODON_SCOPES]).join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { authorizeUrl: url.toString(), state, codeVerifier: pkce.verifier, instanceUrl };
}

export { DEFAULT_MASTODON_SCOPES };
