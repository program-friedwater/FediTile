export {};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    feditileDesktop?: {
      platform: "tauri";
      getAuthConfig?: () => Promise<{ authCallbackBaseUrl: string | null }>;
      getPendingAuthCallback?: () => string | null;
      clearPendingAuthCallback?: () => void;
      onAuthCallback?: (listener: (url: string) => void) => () => void;
      openAuthWindow?: (url: string) => Promise<void>;
      finishMisskeyMiAuth?: (args: { instanceUrl: string; session: string }) => Promise<{
        id: string;
        serviceId: "misskey";
        instanceUrl: string;
        accessToken: string;
        username?: string;
        name?: string;
        avatarUrl?: string;
        createdAt: string;
        updatedAt: string;
      }>;
    };
  }
}
