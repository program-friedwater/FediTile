import type { Post } from "../../domain/types";
import type { TileQuery } from "../../state/workspace/tileTypes";

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number) {
  let x = seed || 123456789;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

export function getMockTimeline(query: TileQuery): Post[] {
  return getMockTimelinePage(query, 0, 12);
}

export function getMockTimelinePage(query: TileQuery, offset: number, limit: number): Post[] {
  const seed = hashString(JSON.stringify(query));
  const rand = seededRand(seed);
  const now = Date.now();
  const label = query.kind === "search" ? query.q : query.kind;
  const authors = ["alice@example.com", "bob@example.com", "carol@example.com", "dave@example.com"];

  const items: Post[] = [];
  for (let i = offset; i < offset + limit; i++) {
    const author = authors[Math.floor(rand() * authors.length)];
    const createdAt = new Date(now - (i * 60 + Math.floor(rand() * 20)) * 1000).toISOString();
    items.push({
      serviceId: "mock",
      createdAt,
      author: { handle: author, displayName: author.split("@")[0] },
      contentFormat: i % 7 === 0 ? "mfm" : "plain",
      content:
        i % 7 === 0
          ? `(${label}) **bold** *italic* ~~strike~~ \`code\`
$[spin spinning] $[spin.x,left axis-x] $[spin.y,alternate axis-y]
$[shake shaky] $[jump jump] $[bounce bounce] $[twitch twitch]
$[jelly jelly] $[tada tada] $[rainbow rainbow] $[sparkle sparkle]
$[rotate.deg=12 rotate] $[position.x=0.8,y=0.2 pos] $[scale.x=1.6,y=0.9 scale]
$[x2 big] $[x3 bigger] $[x4 biggest]
$[font.serif serif] $[font.monospace mono]
$[fg.color=38bdf8 cyan] $[bg.color=111827 bg]
custom emoji: :party_parrot:
<small>small text</small>
<center>centered line</center>`
          : `(${label}) Example item ${i + 1}. This is placeholder data until connectors are implemented.`,
      tags: query.kind === "trending" ? ["trending"] : undefined,
      customEmojis: {
        party_parrot:
          "https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f389.svg",
      },
    });
  }
  return items;
}
