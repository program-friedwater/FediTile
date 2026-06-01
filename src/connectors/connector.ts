import type {
  AccountId,
  Capabilities,
  Cursor,
  Notification,
  Post,
  ServiceId,
  TimelineKind,
  TimelinePage,
  TimelineRequest,
  Uri,
} from "../domain/types";

export type AuthScheme = "oauth-pkce" | "token" | "none";

export type ConnectorDescriptor = {
  serviceId: ServiceId;
  displayName: string;
  authSchemes: AuthScheme[];
  defaultCapabilities: Capabilities;
  supportedTimelineKinds: TimelineKind[];
};

export type ConnectorContext = {
  accountId: AccountId;
  instanceUrl: string;
  accessToken?: string;
};

export type StreamEvent =
  | { type: "post"; post: Post }
  | { type: "notification"; notification: Notification }
  | { type: "delete"; uri?: Uri; remoteId?: string }
  | { type: "error"; message: string; retryable?: boolean };

export interface Connector {
  descriptor(): ConnectorDescriptor;

  getCapabilities(ctx: ConnectorContext): Promise<Capabilities>;

  authenticateStart(args: {
    instanceUrl: string;
    redirectUrl: string;
    scopes: string[];
  }): Promise<{ authorizeUrl: string; state: string }>;

  authenticateFinish(args: {
    instanceUrl: string;
    redirectUrl: string;
    state: string;
    code: string;
    codeVerifier?: string;
  }): Promise<{ accessToken: string }>;

  getTimeline(ctx: ConnectorContext, req: TimelineRequest): Promise<TimelinePage>;

  getThread(ctx: ConnectorContext, args: { uri?: Uri; remoteId?: string }): Promise<{ root?: Post; items: Post[] }>;

  getNotifications(ctx: ConnectorContext, args: { cursor?: Cursor; limit?: number }): Promise<{
    items: Notification[];
    nextCursor?: Cursor;
  }>;

  postStatus(
    ctx: ConnectorContext,
    args: {
      content: string;
      contentFormat?: "plain" | "markdown";
      cw?: string;
      visibility?: string;
      replyToUri?: Uri;
      mediaIds?: string[];
    },
  ): Promise<Post>;

  react?(ctx: ConnectorContext, args: { postUri?: Uri; reactionKey: string }): Promise<void>;
  unreact?(ctx: ConnectorContext, args: { postUri?: Uri; reactionKey: string }): Promise<void>;
  repost?(ctx: ConnectorContext, args: { postUri?: Uri }): Promise<void>;
  unrepost?(ctx: ConnectorContext, args: { postUri?: Uri }): Promise<void>;
  bookmark?(ctx: ConnectorContext, args: { postUri?: Uri }): Promise<void>;
  unbookmark?(ctx: ConnectorContext, args: { postUri?: Uri }): Promise<void>;

  stream?(
    ctx: ConnectorContext,
    args: { kind: TimelineKind; params?: Record<string, string | number | boolean | undefined> },
    onEvent: (ev: StreamEvent) => void,
  ): Promise<{ close: () => void }>;
}

