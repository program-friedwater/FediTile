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
    };
  }
}
