type DesktopPlatform = "tauri";

type AuthConfig = {
  authCallbackBaseUrl: string | null;
  pendingAuthUrl?: string | null;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    feditileDesktop?: {
      platform: DesktopPlatform;
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

const AUTH_CALLBACK_EVENT = "feditile://auth-callback";

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function setupDesktopBridge() {
  if (typeof window === "undefined" || window.feditileDesktop || !isTauriRuntime()) return;

  const [{ invoke }, { listen }] = await Promise.all([
    import("@tauri-apps/api/core"),
    import("@tauri-apps/api/event"),
  ]);

  let pendingAuthUrl: string | null = null;
  const authListeners = new Set<(url: string) => void>();

  const publishAuthCallback = (url: string) => {
    pendingAuthUrl = url;
    for (const listener of authListeners) listener(url);
  };

  window.feditileDesktop = {
    platform: "tauri",
    async getAuthConfig() {
      const config = await invoke<AuthConfig>("get_auth_config");
      if (config.pendingAuthUrl) pendingAuthUrl = config.pendingAuthUrl;
      return { authCallbackBaseUrl: config.authCallbackBaseUrl ?? null };
    },
    getPendingAuthCallback() {
      return pendingAuthUrl;
    },
    clearPendingAuthCallback() {
      pendingAuthUrl = null;
      void invoke("clear_pending_auth_callback");
    },
    onAuthCallback(listener) {
      authListeners.add(listener);
      if (pendingAuthUrl) listener(pendingAuthUrl);
      return () => authListeners.delete(listener);
    },
    async openAuthWindow(url) {
      await invoke("open_auth_window", { url });
    },
    async finishMisskeyMiAuth(args) {
      return invoke("finish_misskey_miauth", args);
    },
  };

  await listen<string>(AUTH_CALLBACK_EVENT, (event) => {
    publishAuthCallback(event.payload);
  });

  try {
    const config = await invoke<AuthConfig>("get_auth_config");
    if (config.pendingAuthUrl) publishAuthCallback(config.pendingAuthUrl);
  } catch {
    // Tauri may still be initializing very early in app startup.
  }
}
