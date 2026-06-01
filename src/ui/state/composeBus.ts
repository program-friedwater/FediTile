import type { Post } from "../../domain/types";

const EVENT = "feditile:compose-intent";

export type ComposeIntent = {
  type: "reply";
  noteId: string;
  authorHandle: string;
  authorName?: string;
  snippet?: string;
};

export function emitComposeIntent(intent: ComposeIntent) {
  try {
    window.dispatchEvent(new CustomEvent<ComposeIntent>(EVENT, { detail: intent }));
  } catch {
    // ignore
  }
}

export function onComposeIntent(cb: (intent: ComposeIntent) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ComposeIntent>).detail);
  window.addEventListener(EVENT, handler as EventListener);
  return () => window.removeEventListener(EVENT, handler as EventListener);
}

export function postToReplyIntent(post: Post): ComposeIntent | null {
  const noteId = (post.remoteId as any as string | undefined) ?? "";
  if (!noteId) return null;
  return {
    type: "reply",
    noteId,
    authorHandle: post.author.handle,
    authorName: post.author.displayName,
    snippet: (post.content ?? "").slice(0, 200),
  };
}

