type HttpInit = {
  method?: string;
  body?: string;
  contentType?: string;
};

type HttpLikeResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
};

function isDesktopRequestBridgeAvailable() {
  return window.feditileDesktop?.platform === "tauri" && typeof window.feditileDesktop.misskeyHttpRequest === "function";
}

function buildResponse(status: number, statusText: string, body: string): HttpLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async text() {
      return body;
    },
    async json<T>() {
      return JSON.parse(body) as T;
    },
  };
}

export async function misskeyHttpFetch(target: string, init: HttpInit): Promise<HttpLikeResponse> {
  if (isDesktopRequestBridgeAvailable()) {
    const result = await window.feditileDesktop!.misskeyHttpRequest!({
      url: target,
      method: init.method ?? "POST",
      body: init.body,
      contentType: init.contentType ?? "application/json",
    });
    return buildResponse(result.status, result.statusText, result.body);
  }

  const response = await fetch(target, {
    method: init.method ?? "POST",
    headers: { "Content-Type": init.contentType ?? "application/json" },
    body: init.body,
  });
  return buildResponse(response.status, response.statusText, await response.text());
}
