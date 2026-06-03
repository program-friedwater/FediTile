import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererUrl = process.env.VITE_DEV_SERVER_URL;
const distPath = path.resolve(__dirname, "../dist/index.html");
const preloadPath = path.resolve(__dirname, "./preload.mjs");

let mainWindow = null;
let pendingAuthUrl = null;

function sendAuthUrl(url) {
  if (mainWindow?.webContents.isLoading()) {
    pendingAuthUrl = url;
    return;
  }
  mainWindow?.webContents.send("feditile:auth-callback", url);
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
    if (pendingAuthUrl) {
      sendAuthUrl(pendingAuthUrl);
      pendingAuthUrl = null;
    }
  });

  if (rendererUrl) mainWindow.loadURL(rendererUrl);
  else mainWindow.loadFile(distPath);
}

function extractProtocolUrl(argv) {
  return argv.find((value) => value.startsWith("feditile://")) ?? null;
}

if (!app.requestSingleInstanceLock()) app.quit();

app.on("second-instance", (_event, argv) => {
  const url = extractProtocolUrl(argv);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  if (url) sendAuthUrl(url);
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  sendAuthUrl(url);
});

app.whenReady().then(() => {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("feditile", process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient("feditile");
  }
  createWindow();

  const initialUrl = extractProtocolUrl(process.argv);
  if (initialUrl) pendingAuthUrl = initialUrl;

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
