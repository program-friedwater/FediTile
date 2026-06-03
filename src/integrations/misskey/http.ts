export function misskeyHttpFetch(target: string, init: { method?: string; body?: string; contentType?: string }) {
  return fetch(target, {
    method: init.method ?? "POST",
    headers: { "Content-Type": init.contentType ?? "application/json" },
    body: init.body,
  });
}
