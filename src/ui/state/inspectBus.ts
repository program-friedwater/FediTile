import type { Author, Post } from "../../domain/types";

const EVENT = "feditile:inspect-intent";

export type InspectIntent =
  | { type: "post"; post: Post }
  | { type: "author"; author: Author; serviceId?: string; accountInstanceUrl?: string };

export function emitInspectIntent(intent: InspectIntent) {
  try {
    window.dispatchEvent(new CustomEvent<InspectIntent>(EVENT, { detail: intent }));
  } catch {
    // ignore
  }
}

export function onInspectIntent(cb: (intent: InspectIntent) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<InspectIntent>).detail);
  window.addEventListener(EVENT, handler as EventListener);
  return () => window.removeEventListener(EVENT, handler as EventListener);
}

