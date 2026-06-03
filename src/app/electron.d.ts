export {};

declare global {
  interface Window {
    feditileDesktop?: {
      platform: "electron";
      getAuthConfig?: () => Promise<{ authCallbackBaseUrl: string | null }> ;
      getPendingAuthCallback?: () => string | null;
      clearPendingAuthCallback?: () => void;
      onAuthCallback?: (listener: (url: string) => void) => () => void;
    };
  }
}
