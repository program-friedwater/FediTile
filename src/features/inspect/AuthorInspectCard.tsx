import type { ReactNode } from "react";
import { Pill } from "../../components/ui/Pill";
import { PostCard } from "../../components/post/PostCard";
import type { Author, Post } from "../../domain/types";
import { renderMfm } from "../../mfm/renderMfm";
import type { MisskeyEmoji } from "../../integrations/misskey/emojis";
import { buildEmojiResolver } from "../../integrations/misskey/emojis";
import type { MisskeyUserProfile } from "../../integrations/misskey/api";

type Props = {
  author: MisskeyUserProfile["author"];
  profile?: MisskeyUserProfile;
  notes?: Post[];
  loadingMore?: boolean;
  globalEmojis: MisskeyEmoji[];
  onInspectPost?: (post: Post) => void;
  onInspectAuthor?: (author: Author) => void;
};

function renderNameWithEmojis(name: string, emojiResolver: (shortcode: string) => string | null | undefined) {
  const parts: ReactNode[] = [];
  const re = /:([0-9A-Za-z_+-]+):/g;
  let last = 0;
  for (;;) {
    const match = re.exec(name);
    if (!match) break;
    if (match.index > last) parts.push(name.slice(last, match.index));
    const shortcode = match[1] ?? "";
    const url = shortcode ? emojiResolver(shortcode) : null;
    if (url) parts.push(<img key={`${match.index}:${shortcode}`} className="mfmEmoji" src={url} alt={`:${shortcode}:`} loading="lazy" decoding="async" />);
    else parts.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < name.length) parts.push(name.slice(last));
  return parts;
}

export function AuthorInspectCard(props: Props) {
  const profile = props.profile;
  const profileEmojiResolver = buildEmojiResolver({ emojis: profile?.customEmojis, global: props.globalEmojis });
  const displayName = props.author.displayName ?? props.author.handle;

  return (
    <div className="inspectCard">
      <div className="inspectAuthorHeader">
        {props.author.avatarUrl ? <img className="avatar" src={props.author.avatarUrl} alt="" decoding="async" /> : <div className="avatar avatarFallback" />}
        <div className="inspectAuthorBody">
          <div className="inspectNameRow">
            <div className="inspectDisplayName">{renderNameWithEmojis(displayName, profileEmojiResolver)}</div>
            <div className="inspectHandle">{props.author.handle}</div>
          </div>
          <div className="inspectPills">
            {typeof profile?.noteCount === "number" ? <Pill>Notes: {profile.noteCount}</Pill> : null}
            {profile?.isLocal && profile.onlineStatus ? <Pill>Status: {profile.onlineStatus}</Pill> : null}
          </div>
          {props.author.url ? (
            <div className="listMeta">
              <a href={props.author.url} target="_blank" rel="noreferrer noopener">
                Open profile
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {profile?.description ? (
        <div className="inspectReply">
          {renderMfm(profile.description, { emojiResolver: profileEmojiResolver })}
        </div>
      ) : null}

      {profile?.isLocal && profile.badgeRoles && profile.badgeRoles.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div className="inspectSectionTitle">Roles</div>
          <div className="inspectRoleList">
            {profile.badgeRoles.map((role) => (
              <div key={`${role.name}:${role.displayOrder ?? 0}`} className="inspectRoleBadge">
                {role.iconUrl ? <img src={role.iconUrl} alt="" className="inspectRoleIcon" loading="lazy" decoding="async" /> : null}
                <span>{role.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="inspectNotesSection">
        <div className="inspectSectionTitle">Notes</div>
        {props.notes == null ? (
          <div className="emptyState">Loading notes...</div>
        ) : props.notes.length > 0 ? (
          <div className="inspectNotesList">
            {props.notes.map((note) => (
              <PostCard
                key={String(note.remoteId ?? note.uri ?? note.createdAt)}
                post={note}
                emojiList={props.globalEmojis}
                cwOpen={{}}
                cwKey={String(note.remoteId ?? note.uri ?? note.createdAt)}
                onToggleCw={() => {}}
                onInspectPost={props.onInspectPost}
                onInspectAuthor={(post) => props.onInspectAuthor?.(post.author)}
                hideActions={true}
              />
            ))}
            {props.loadingMore ? <div className="inspectNotesStatus">Loading more…</div> : null}
          </div>
        ) : (
          <div className="emptyState">No notes available.</div>
        )}
      </div>
    </div>
  );
}
