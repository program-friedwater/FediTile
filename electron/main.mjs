import { app, BrowserWindow, shell } from "electron";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererUrl = process.env.VITE_DEV_SERVER_URL;
const distPath = path.resolve(__dirname, "../dist/index.html");
const preloadPath = path.resolve(__dirname, "./preload.mjs");

let mainWindow = null;
let pendingAuthUrl = null;
let authServer = null;
let authCallbackBaseUrl = null;

function sendAuthUrl(url) {
  if (mainWindow?.webContents.isLoading()) {
    pendingAuthUrl = url;
    return;
  }
  mainWindow?.webContents.send("feditile:auth-callback", url);
}


function sendAuthConfig() {
  if (!mainWindow) return;
  mainWindow.webContents.send("feditile:auth-config", { authCallbackBaseUrl });
}

function startAuthServer() {
  return new Promise((resolve, reject) => {
    authServer = http.createServer((req, res) => {
      const origin = `http://${req.headers.host ?? "127.0.0.1"}`;
      const url = new URL(req.url ?? "/", origin);
      if (url.pathname !== "/auth/misskey") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      sendAuthUrl(url.toString());
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><body style="background:#0d1117;color:#e6edf3;font-family:system-ui;padding:24px"><h1>FediTile</h1><p>Authentication received. You can return to the app.</p></body></html>`);
    });
    authServer.once("error", reject);
    authServer.listen(0, () => {
      const address = authServer?.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve auth callback server address"));
        return;
      }
      authCallbackBaseUrl = `http://localhost:${address.port}/auth/misskey`;
      resolve(authCallbackBaseUrl);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#0d1117",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    sendAuthConfig();
    if (pendingAuthUrl) {
      sendAuthUrl(pendingAuthUrl);
      pendingAuthUrl = null;
    }
  });

  if (rendererUrl) mainWindow.loadURL(rendererUrl);
  else mainWindow.loadFile(distPath);
}

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(async () => {
  await startAuthServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  authServer?.close();
  authServer = null;
  if (process.platform !== "darwin") app.quit();
});
