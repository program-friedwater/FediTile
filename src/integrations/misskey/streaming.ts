import type { Notification, Post } from "../../domain/types";
import type { MisskeyAccount } from "../../state/accounts/accountsStore";
import { normalizeMisskeyNote, normalizeMisskeyNotification } from "./api";

type ConnectBody = { channel: string; id: string; params?: Record<string, unknown> };
type StreamOptions = { heartbeatMs?: number; reconnectMs?: number; maxReconnectMs?: number };

const DEFAULT_HEARTBEAT_MS = 15_000;
const DEFAULT_RECONNECT_MS = 1_500;
const DEFAULT_MAX_RECONNECT_MS = 15_000;
const HEARTBEAT_PAYLOAD = "h";

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function createStream(
  account: MisskeyAccount,
  channel: string,
  onChannelBody: (body: any) => void,
  onError?: (err: string) => void,
  options?: StreamOptions,
) {
  const heartbeatMs = options?.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const reconnectMs = options?.reconnectMs ?? DEFAULT_RECONNECT_MS;
  const maxReconnectMs = options?.maxReconnectMs ?? DEFAULT_MAX_RECONNECT_MS;
  const u = new URL(`${account.instanceUrl.replace(/^http/, "ws")}/streaming`);
  u.searchParams.set("i", account.accessToken);

  let ws: WebSocket | null = null;
  let heartbeatTimer: number | null = null;
  let reconnectTimer: number | null = null;
  let stopped = false;
  let reconnectAttempt = 0;
  const subId = `sub_${randomId()}`;

  const clearHeartbeat = () => {
    if (heartbeatTimer == null) return;
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };

  const clearReconnect = () => {
    if (reconnectTimer == null) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer != null) return;
    const delay = Math.min(maxReconnectMs, reconnectMs * Math.max(1, 2 ** reconnectAttempt));
    reconnectAttempt += 1;
    onError?.(`stream reconnecting in ${Math.round(delay / 1000)}s`);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    if (heartbeatMs <= 0) return;
    heartbeatTimer = window.setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(HEARTBEAT_PAYLOAD);
      } catch {
        // ignore
      }
    }, heartbeatMs);
  };

  const connect = () => {
    if (stopped) return;
    clearHeartbeat();
    clearReconnect();
    ws = new WebSocket(u.toString());

    ws.onopen = () => {
      reconnectAttempt = 0;
      startHeartbeat();
      ws?.send(JSON.stringify({ type: "connect", body: { channel, id: subId, params: {} } satisfies ConnectBody }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg?.type === "channel" && msg?.body?.id === subId && msg?.body?.body) onChannelBody(msg.body);
        else if (msg?.type === "disconnect") scheduleReconnect();
      } catch (e) {
        onError?.(String(e));
      }
    };

    ws.onerror = () => onError?.("stream error");
    ws.onclose = () => {
      clearHeartbeat();
      onError?.("stream closed");
      scheduleReconnect();
    };
  };

  connect();

  return {
    close: () => {
      stopped = true;
      clearHeartbeat();
      clearReconnect();
      try {
        ws?.close();
      } catch {
        // ignore
      }
    },
  };
}

export function startTimelineStream(
  account: MisskeyAccount,
  kind: "home" | "local" | "social" | "federated",
  onNote: (p: Post) => void,
  onError?: (err: string) => void,
  options?: StreamOptions,
): { close: () => void } {
  const channel =
    kind === "home"
      ? "homeTimeline"
      : kind === "local"
        ? "localTimeline"
        : kind === "social"
          ? "hybridTimeline"
          : "globalTimeline";
  return createStream(
    account,
    channel,
    (body) => {
      if (body?.type === "note" && body?.body) onNote(normalizeMisskeyNote(account, body.body));
    },
    onError,
    options,
  );
}

export function startNotificationsStream(
  account: MisskeyAccount,
  onNotification: (notification: Notification) => void,
  onError?: (err: string) => void,
  options?: StreamOptions,
): { close: () => void } {
  return createStream(
    account,
    "main",
    (body) => {
      if (body?.type === "notification" && body?.body) onNotification(normalizeMisskeyNotification(account, body.body));
    },
    onError,
    options,
  );
}
