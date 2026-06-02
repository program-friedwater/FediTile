export type ServiceId =
  | "mastodon"
  | "misskey"
  | "lemmy"
  | "peertube"
  | "pixelfed"
  | (string & {});

export type AccountId = string & { readonly __brand: "AccountId" };

export type Uri = string & { readonly __brand: "Uri" };
export type RemoteId = string & { readonly __brand: "RemoteId" };

export type TimelineKind =
  | "home"
  | "local"
  | "federated"
  | "list"
  | "hashtag"
  | "search"
  | "notifications"
  | "profile"
  | "thread";

export type ContentFormat = "html" | "markdown" | "mfm" | "plain";

export type Visibility = "public" | "unlisted" | "followers" | "direct" | "unknown";

export type CapabilityKey =
  | "streaming"
  | "reactions"
  | "customEmojis"
  | "lists"
  | "bookmarks"
  | "filters"
  | "polls"
  | "edit"
  | "quote"
  | "communities";

export type Capabilities = Readonly<Record<CapabilityKey, boolean>>;

export type Author = {
  uri?: Uri;
  remoteId?: RemoteId;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  url?: string;
};

export type MediaAttachment = {
  uri?: Uri;
  remoteId?: RemoteId;
  type: "image" | "video" | "audio" | "gifv" | "unknown";
  url: string;
  previewUrl?: string;
  description?: string;
  width?: number;
  height?: number;
};

export type PollChoice = {
  text: string;
  votes: number;
  isVoted?: boolean;
};

export type Poll = {
  multiple: boolean;
  expiresAt?: string;
  choices: PollChoice[];
};

export type Post = {
  uri?: Uri;
  remoteId?: RemoteId;
  serviceId: ServiceId;
  accountId?: AccountId;

  author: Author;
  createdAt: string; // ISO8601

  content: string;
  contentFormat: ContentFormat;
  contentText?: string;

  cw?: string;
  language?: string;
  visibility?: Visibility;

  media?: MediaAttachment[];
  poll?: Poll;
  tags?: string[];

  replyToUri?: Uri;
  replyTo?: Post;
  repostOfUri?: Uri;
  repostOf?: Post;

  counts?: {
    replies?: number;
    reposts?: number;
    likes?: number;
  };

  reactions?: Array<{ key: string; count: number; reacted?: boolean }>;
  myReaction?: string;
  customEmojis?: Record<string, string>;

  url?: string;
};

export type NotificationType =
  | "mention"
  | "reply"
  | "repost"
  | "reaction"
  | "follow"
  | "poll"
  | "system"
  | "unknown";

export type Notification = {
  uri?: Uri;
  remoteId?: RemoteId;
  serviceId: ServiceId;
  accountId: AccountId;

  type: NotificationType;
  createdAt: string; // ISO8601

  actor?: Author;
  post?: Post;
  rawType?: string;
};

export type Cursor =
  | { type: "since_id"; value: string }
  | { type: "max_id"; value: string }
  | { type: "min_id"; value: string }
  | { type: "page"; value: number }
  | { type: "opaque"; value: string };

export type TimelineRequest = {
  kind: TimelineKind;
  accountId?: AccountId;
  cursor?: Cursor;
  limit?: number;
  params?: Record<string, string | number | boolean | undefined>;
};

export type TimelinePage = {
  items: Post[];
  nextCursor?: Cursor;
};
