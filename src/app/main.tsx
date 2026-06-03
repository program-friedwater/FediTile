import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { processMisskeyAuthCallbackUrl } from "../integrations/misskey/authCallback";
import "./styles.css";

window.feditileDesktop?.onAuthCallback?.((url) => {
  void processMisskeyAuthCallbackUrl(url);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
