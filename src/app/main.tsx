import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { processMisskeyAuthCallbackUrl } from "../integrations/misskey/authCallback";
import { setupDesktopBridge } from "./desktop";
import "./styles.css";

const consumeAuthCallback = (url: string) => {
  void processMisskeyAuthCallbackUrl(url).finally(() => {
    window.feditileDesktop?.clearPendingAuthCallback?.();
  });
};

void setupDesktopBridge().finally(() => {
  const pendingAuthUrl = window.feditileDesktop?.getPendingAuthCallback?.();
  if (pendingAuthUrl) consumeAuthCallback(pendingAuthUrl);
  window.feditileDesktop?.onAuthCallback?.((url) => {
    consumeAuthCallback(url);
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
