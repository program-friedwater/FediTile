export {};

declare global {
  interface Window {
    feditileDesktop?: {
      platform: "electron";
      getAuthConfig?: () => { authCallbackBaseUrl: string | null };
      onAuthConfig?: (listener: (config: { authCallbackBaseUrl: string | null }) => void) => () => void;
      getPendingAuthCallback?: () => string | null;
      clearPendingAuthCallback?: () => void;
      onAuthCallback?: (listener: (url: string) => void) => () => void;
    };
  }
}
