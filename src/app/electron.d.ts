export {};

declare global {
  interface Window {
    feditileDesktop?: {
      platform: "electron";
      onAuthCallback?: (listener: (url: string) => void) => () => void;
    };
  }
}
