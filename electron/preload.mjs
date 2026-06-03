import { contextBridge, ipcRenderer } from "electron";

let pendingAuthUrl = null;
const authListeners = new Set();

ipcRenderer.on("feditile:auth-callback", (_event, url) => {
  pendingAuthUrl = url;
  for (const listener of authListeners) listener(url);
});

contextBridge.exposeInMainWorld("feditileDesktop", {
  platform: "electron",
  getAuthConfig() {
    return ipcRenderer.invoke("feditile:get-auth-config");
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
