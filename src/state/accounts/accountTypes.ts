export type ServiceAccountBase = {
  id: string;
  serviceId: "misskey" | "mastodon";
  instanceUrl: string;
  accessToken: string;
  username?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type MisskeyAccount = ServiceAccountBase & {
  serviceId: "misskey";
};

export type MastodonAccount = ServiceAccountBase & {
  serviceId: "mastodon";
  accountUrl?: string;
};

export type AccountsState = {
  version: 1;
  misskey: MisskeyAccount[];
  mastodon: MastodonAccount[];
  defaultAccountId?: string;
  defaultMastodonAccountId?: string;
};
