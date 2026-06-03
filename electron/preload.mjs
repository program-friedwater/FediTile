import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("feditileDesktop", {
  platform: "electron",
});
