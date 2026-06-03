export function useMisskeyLocalProxy() {
  return typeof window !== "undefined" && window.location.hostname === "localhost";
}

export function misskeyHttpFetch(target: string, init: { method?: string; body?: string; contentType?: string }) {
  if (useMisskeyLocalProxy()) {
    return fetch(`/__feditile/proxy?target=${encodeURIComponent(target)}`, {
      method: init.method ?? "POST",
      headers: { "Content-Type": init.contentType ?? "application/json" },
      body: init.body,
    });
  }
  return fetch(target, {
    method: init.method ?? "POST",
    headers: init.contentType ? { "Content-Type": init.contentType } : undefined,
    body: init.body,
  });
}
