import type { Post } from "../../domain/types";
import type { MisskeyAccount } from "../accounts/accountsStore";
import { normalizeMisskeyNote } from "./api";

type ConnectBody = { channel: string; id: string; params?: Record<string, unknown> };

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function startTimelineStream(
  account: MisskeyAccount,
  kind: "home" | "local" | "federated",
  onNote: (p: Post) => void,
  onError?: (err: string) => void,
): { close: () => void } {
  const u = new URL(`${account.instanceUrl.replace(/^http/, "ws")}/streaming`);
  u.searchParams.set("i", account.accessToken);

  const ws = new WebSocket(u.toString());
  const subId = `sub_${randomId()}`;

  const channel =
    kind === "home" ? "homeTimeline" : kind === "local" ? "localTimeline" : kind === "federated" ? "globalTimeline" : "homeTimeline";

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
  ws.onclose = () => onError?.("stream closed");

  return {
    close: () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    },
  };
}
