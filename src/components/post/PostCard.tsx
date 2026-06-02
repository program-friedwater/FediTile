import type { Post } from "../../domain/types";
import { renderMfm } from "../../mfm/renderMfm";
import { buildEmojiResolver, type MisskeyEmoji } from "../../integrations/misskey/emojis";
import { RepeatIcon, ReplyIcon, SmileIcon } from "../icons/icons";
import { PostPoll } from "./PostPoll";

export type LightboxItem = { url: string; alt?: string };

function renderNameWithEmojis(name: string, emojiResolver: (shortcode: string) => string | null | undefined) {
  const parts: React.ReactNode[] = [];
  const re = /:([0-9A-Za-z_+-]+):/g;
  let last = 0;
  for (;;) {
    const m = re.exec(name);
    if (!m) break;
    if (m.index > last) parts.push(name.slice(last, m.index));
    const sc = m[1] ?? "";
    const url = sc ? emojiResolver(sc) : null;
    if (url) parts.push(<img key={`${m.index}:${sc}`} className="mfmEmoji" src={url} alt={`:${sc}:`} loading="lazy" decoding="async" />);
    else parts.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < name.length) parts.push(name.slice(last));
  return parts;
}

export function PostCard(props: {
  post: Post;
  emojiList: MisskeyEmoji[];
  cwOpen: Record<string, boolean>;
  cwKey: string;
  onToggleCw: (key: string) => void;
  onInspectPost?: (post: Post) => void;
  onInspectAuthor?: (post: Post) => void;
  embedded?: boolean;

  onReply?: (post: Post) => void;
  onRenoteMenu?: (post: Post) => void;
  onReact?: (post: Post) => void;
  onToggleReaction?: (post: Post, reactionKey: string) => void;
  onVotePoll?: (post: Post, choice: number) => void;

  onOpenLightbox?: (items: LightboxItem[], index: number) => void;

  hideActions?: boolean;
}) {
  const p = props.post;
  const hasCw = !!p.cw;
  const open = props.cwOpen[props.cwKey] === true;
  const resolver = buildEmojiResolver({ emojis: p.customEmojis, global: props.emojiList });

  const renderMedia = (post: Post) => {
    if (!post.media || post.media.length === 0) return null;
    const imageItems: LightboxItem[] = post.media
      .filter((m) => m.type === "image" && m.url)
      .map((m) => ({ url: m.url!, alt: m.description ?? "" }));
    return (
      <div className="mediaGrid" onClick={(e) => e.stopPropagation()}>
        {post.media
          .filter((m) => m.url)
          .slice(0, 6)
          .map((m, mi) => {
            if (m.type === "image" && imageItems.length > 0 && props.onOpenLightbox) {
              const idx2 = imageItems.findIndex((x) => x.url === m.url);
              return (
                <button
                  key={mi}
                  type="button"
                  className="mediaItem mediaButton"
                  onClick={() => {
                    const index = idx2 >= 0 ? idx2 : 0;
                    props.onOpenLightbox?.(imageItems, index);
                  }}
                  aria-label="Open image"
                >
                  <img
                    className="mediaThumb"
                    src={m.previewUrl ?? m.url}
                    alt={m.description ?? ""}
                    loading="lazy"
                    decoding="async"
                    style={m.width && m.height ? ({ aspectRatio: `${m.width} / ${m.height}` } as any) : undefined}
                  />
                </button>
              );
            }

            return (
              <a key={mi} href={m.url} target="_blank" rel="noreferrer noopener" className="mediaItem">
                {m.type === "video" ? (
                  <div className="mediaVideo">
                    {m.previewUrl ? (
                      <img
                        className="mediaThumb"
                        src={m.previewUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        style={m.width && m.height ? ({ aspectRatio: `${m.width} / ${m.height}` } as any) : undefined}
                      />
                    ) : null}
                    <div className="mediaBadge">VIDEO</div>
                  </div>
                ) : (
                  <div className="mediaBadge">FILE</div>
                )}
              </a>
            );
          })}
      </div>
    );
  };

  const renderBody = (post: Post) => (
    <>
      {post.replyTo ? (
        <div className="replyBox" aria-label="Replying to">
          <div className="replyHeader">
            <span className="replyToLabel">Replying to</span>
            <span className="replyToHandle">{post.replyTo.author.handle}</span>
          </div>
          <div className="replySnippet">
            {post.replyTo.contentFormat === "mfm"
              ? renderMfm(post.replyTo.content, { emojiResolver: buildEmojiResolver({ emojis: post.replyTo.customEmojis, global: props.emojiList }) })
              : post.replyTo.content}
          </div>
        </div>
      ) : null}

      <div className="listMeta">
        {post.contentFormat === "mfm" ? renderMfm(post.content, { emojiResolver: buildEmojiResolver({ emojis: post.customEmojis, global: props.emojiList }) }) : post.content}
      </div>
      {post.poll ? <PostPoll poll={post.poll} onVote={props.onVotePoll ? (choice) => props.onVotePoll?.(post, choice) : undefined} /> : null}
      {renderMedia(post)}
    </>
  );

  const onInspectPost = () => props.onInspectPost?.(p);

  const content = (
    <div
      className={props.embedded ? "postCardEmbedded" : "listItem"}
      onClick={onInspectPost}
      style={props.onInspectPost ? { cursor: "pointer" } : undefined}
    >
      <div className="listRow">
        {p.author.avatarUrl ? (
          <img
            className="avatar"
            src={p.author.avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onClick={(e) => {
              e.stopPropagation();
              props.onInspectAuthor?.(p);
            }}
            style={props.onInspectAuthor ? { cursor: "pointer" } : undefined}
          />
        ) : (
          <div className="avatar avatarFallback" aria-hidden="true" />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            className="listTitleRow"
            onClick={(e) => {
              if (!props.onInspectAuthor) return;
              e.stopPropagation();
              props.onInspectAuthor(p);
            }}
            style={props.onInspectAuthor ? { cursor: "pointer" } : undefined}
          >
            <span className="listTitle">{renderNameWithEmojis(p.author.displayName ?? p.author.handle, resolver)}</span>
            <span className="listHandleMuted">{p.author.handle}</span>
          </div>

          {hasCw ? (
            <div className="cwLine">
              <span className="cwText">{p.cw}</span>
              <button type="button" className="cwBtn" onClick={() => props.onToggleCw(props.cwKey)}>
                {open ? "Hide" : "View"}
              </button>
            </div>
          ) : null}

          {p.repostOf ? (
            <>
              {(() => {
                const repost = p.repostOf;
                if (!repost) return null;
                return (
                  <>
              {open || !hasCw ? (p.content?.trim() ? renderBody(p) : null) : null}
              <div className="listMeta listRenoteMeta">{p.content?.trim() ? "" : "Renoted"}</div>
              <div className="renoteBox">
                <PostCard
                  post={repost}
                  emojiList={props.emojiList}
                  cwOpen={props.cwOpen}
                  cwKey={`${props.cwKey}:repost`}
                  onToggleCw={props.onToggleCw}
                  onInspectPost={props.onInspectPost}
                  onInspectAuthor={props.onInspectAuthor}
                  onReply={props.onReply}
                  onRenoteMenu={props.onRenoteMenu}
                  onReact={props.onReact}
                  onToggleReaction={props.onToggleReaction}
                  onVotePoll={props.onVotePoll}
                  onOpenLightbox={props.onOpenLightbox}
                  hideActions={true}
                  embedded={true}
                />
              </div>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              {hasCw ? (open ? renderBody(p) : null) : renderBody(p)}
            </>
          )}

          {!props.hideActions ? (
            <>
              <div className="postActions" onClick={(e) => e.stopPropagation()}>
                <button className="postIconBtn" title="Reply" onClick={() => props.onReply?.(p)}>
                  <span className="postIconSvg" aria-hidden="true">
                    <ReplyIcon />
                  </span>
                </button>
                <button className="postIconBtn" title="Renote" onClick={() => props.onRenoteMenu?.(p)}>
                  <span className="postIconSvg" aria-hidden="true">
                    <RepeatIcon />
                  </span>
                </button>
                <button className="postIconBtn" title="React" onClick={() => props.onReact?.(p)}>
                  <span className="postIconSvg" aria-hidden="true">
                    <SmileIcon />
                  </span>
                </button>
              </div>

              {Array.isArray(p.reactions) && p.reactions.length > 0 ? (
                <div className="reactionBar" aria-label="Reactions" onClick={(e) => e.stopPropagation()}>
                  {p.reactions.slice(0, 8).map((r) => (
                    <button
                      type="button"
                      className={["reactionPill", p.myReaction === r.key ? "reactionPillActive" : ""].filter(Boolean).join(" ")}
                      key={r.key}
                      title="Toggle reaction"
                      onClick={() => props.onToggleReaction?.(p, r.key)}
                    >
                      {(() => {
                        const key = r.key;
                        if (key.startsWith(":") && key.endsWith(":")) {
                          const name = key.slice(1, -1);
                          const url = resolver(name);
                          return <>{url ? <img src={url} alt={key} loading="lazy" decoding="async" /> : key}</>;
                        }
                        return <>{key}</>;
                      })()}{" "}
                      {r.count}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return content;
}
