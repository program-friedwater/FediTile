import { contextBridge, ipcRenderer } from "electron";

let pendingAuthUrl = null;
let authConfig = { authCallbackBaseUrl: null };
const authListeners = new Set();
const configListeners = new Set();

ipcRenderer.on("feditile:auth-callback", (_event, url) => {
  pendingAuthUrl = url;
  for (const listener of authListeners) listener(url);
});

ipcRenderer.on("feditile:auth-config", (_event, nextConfig) => {
  authConfig = nextConfig ?? { authCallbackBaseUrl: null };
  for (const listener of configListeners) listener(authConfig);
});

contextBridge.exposeInMainWorld("feditileDesktop", {
  platform: "electron",
  getAuthConfig() {
    return authConfig;
  },
  onAuthConfig(listener) {
    configListeners.add(listener);
    listener(authConfig);
    return () => configListeners.delete(listener);
  },
  getPendingAuthCallback() {
    return pendingAuthUrl;
  },
  clearPendingAuthCallback() {
    pendingAuthUrl = null;
  },
  onAuthCallback(listener) {
    authListeners.add(listener);
    if (pendingAuthUrl) listener(pendingAuthUrl);
    return () => authListeners.delete(listener);
  },
});
