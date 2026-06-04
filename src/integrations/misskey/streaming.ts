import type { Notification, Post } from "../../domain/types";
import type { MisskeyAccount } from "../../state/accounts/accountsStore";
import { normalizeMisskeyNote, normalizeMisskeyNotification } from "./api";

type ConnectBody = { channel: string; id: string; params?: Record<string, unknown> };
type StreamOptions = { heartbeatMs?: number };

const DEFAULT_HEARTBEAT_MS = 15_000;
const HEARTBEAT_PAYLOAD = "h";

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function startHeartbeat(ws: WebSocket, heartbeatMs: number) {
  if (heartbeatMs <= 0) return () => {};
  const timer = window.setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(HEARTBEAT_PAYLOAD);
    } catch {
      // ignore
    }
  }, heartbeatMs);
  return () => window.clearInterval(timer);
}

export function startTimelineStream(
  account: MisskeyAccount,
  kind: "home" | "local" | "social" | "federated",
  onNote: (p: Post) => void,
  onError?: (err: string) => void,
  options?: StreamOptions,
): { close: () => void } {
  const u = new URL(`${account.instanceUrl.replace(/^http/, "ws")}/streaming`);
  u.searchParams.set("i", account.accessToken);

  const ws = new WebSocket(u.toString());
  const subId = `sub_${randomId()}`;
  const stopHeartbeat = startHeartbeat(ws, options?.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);

  const channel =
    kind === "home"
      ? "homeTimeline"
      : kind === "local"
        ? "localTimeline"
        : kind === "social"
          ? "hybridTimeline"
          : kind === "federated"
            ? "globalTimeline"
            : "homeTimeline";

  ws.onopen = () => {
    const msg = { type: "connect", body: { channel, id: subId, params: {} } satisfies ConnectBody };
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg?.type === "channel" && msg?.body?.id === subId) {
        if (msg?.body?.type === "note" && msg?.body?.body) {
          onNote(normalizeMisskeyNote(account, msg.body.body));
        }
      } else if (msg?.type === "disconnect") {
        onError?.("stream disconnected");
      }
    } catch (e) {
      onError?.(String(e));
    }
  };

  ws.onerror = () => onError?.("stream error");
  ws.onclose = () => {
    stopHeartbeat();
    onError?.("stream closed");
  };

  return {
    close: () => {
      stopHeartbeat();
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}

export function startNotificationsStream(
  account: MisskeyAccount,
  onNotification: (notification: Notification) => void,
  onError?: (err: string) => void,
  options?: StreamOptions,
): { close: () => void } {
  const u = new URL(`${account.instanceUrl.replace(/^http/, "ws")}/streaming`);
  u.searchParams.set("i", account.accessToken);

  const ws = new WebSocket(u.toString());
  const subId = `sub_${randomId()}`;
  const stopHeartbeat = startHeartbeat(ws, options?.heartbeatMs ?? DEFAULT_HEARTBEAT_MS);

  ws.onopen = () => {
    const msg = { type: "connect", body: { channel: "main", id: subId, params: {} } satisfies ConnectBody };
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg?.type === "channel" && msg?.body?.id === subId) {
        if (msg?.body?.type === "notification" && msg?.body?.body) {
          onNotification(normalizeMisskeyNotification(account, msg.body.body));
        }
      } else if (msg?.type === "disconnect") {
        onError?.("stream disconnected");
      }
    } catch (e) {
      onError?.(String(e));
    }
  };

  ws.onerror = () => onError?.("stream error");
  ws.onclose = () => {
    stopHeartbeat();
    onError?.("stream closed");
  };

  return {
    close: () => {
      stopHeartbeat();
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}
