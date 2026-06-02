import type { Post } from "../../domain/types";

function sameId(post: Post, noteId: string) {
  return String(post.remoteId ?? "") === noteId;
}

export function replacePostInTree(post: Post, noteId: string, nextPost: Post): Post {
  if (sameId(post, noteId)) return nextPost;

  const repostOf = post.repostOf ? replacePostInTree(post.repostOf, noteId, nextPost) : post.repostOf;
  const replyTo = post.replyTo ? replacePostInTree(post.replyTo, noteId, nextPost) : post.replyTo;
  if (repostOf === post.repostOf && replyTo === post.replyTo) return post;
  return { ...post, repostOf, replyTo };
}

export function replacePostInList(posts: Post[], noteId: string, nextPost: Post) {
  return posts.map((post) => replacePostInTree(post, noteId, nextPost));
}
