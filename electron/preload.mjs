import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("feditileDesktop", {
  platform: "electron",
  onAuthCallback(listener) {
    const handler = (_event, url) => listener(url);
    ipcRenderer.on("feditile:auth-callback", handler);
    return () => ipcRenderer.removeListener("feditile:auth-callback", handler);
  },
});
