export {};

declare global {
  interface Window {
    feditileDesktop?: {
      platform: "electron";
      getPendingAuthCallback?: () => string | null;
      clearPendingAuthCallback?: () => void;
      onAuthCallback?: (listener: (url: string) => void) => () => void;
    };
  }
}
