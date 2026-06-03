import { useEffect, useMemo, useState } from "react";
import { loadAccounts, onAccountsChanged, removeMisskeyAccount, setDefaultMisskeyAccount, upsertMisskeyAccount, type MisskeyAccount } from "../../state/accounts/accountsStore";
import { clearAuthTrace, readAuthTrace } from "../../integrations/misskey/authTrace";
import { startMiAuth } from "../../integrations/misskey/miauth";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FieldRow, Input, Label, Select } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const AUTH_RESULT_PREFIX = "feditile:misskey-auth-result:";

function isElectronRuntime() {
  return window.feditileDesktop?.platform === "electron" || navigator.userAgent.includes("Electron");
}

export function SettingsModal(props: Props) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [misskeyAccounts, setMisskeyAccounts] = useState<MisskeyAccount[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [traceLines, setTraceLines] = useState<string[]>([]);
  const [desktopCallbackBaseUrl, setDesktopCallbackBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!props.isOpen || !isElectronRuntime()) return;
    let cancelled = false;

    const loadAuthConfig = () => {
      window.feditileDesktop?.getAuthConfig?.()
        .then((config) => {
          if (!cancelled) setDesktopCallbackBaseUrl(config.authCallbackBaseUrl);
        })
        .catch(() => {
          if (!cancelled) setDesktopCallbackBaseUrl(null);
        });
    };

    loadAuthConfig();
    const timer = window.setInterval(loadAuthConfig, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [props.isOpen]);

  const callbackUrl = useMemo(() => {
    const current = new URL(window.location.href);
    if (isElectronRuntime() && (current.protocol === "http:" || current.protocol === "https:")) {
      return new URL("/auth/misskey", current.origin).toString();
    }
    if (isElectronRuntime()) return desktopCallbackBaseUrl ?? "";
    if (current.protocol === "http:" || current.protocol === "https:") {
      return new URL("/auth/misskey", current.origin).toString();
    }
    current.hash = "#/auth/misskey";
    current.search = "";
    return current.toString();
  }, [desktopCallbackBaseUrl]);

  useEffect(() => {
    if (!props.isOpen) return;
    setError(null);
    setDebugLines([]);
    const refresh = () =>
      loadAccounts()
        .then((a) => {
          setMisskeyAccounts(a.misskey);
          setDefaultAccountId(a.defaultAccountId ?? "");
          setDebugLines((prev) => [`loadAccounts -> ${a.misskey.length} account(s)`, ...prev].slice(0, 12));
          setTraceLines(readAuthTrace().map((entry) => `${entry.step}${entry.detail ? ` -> ${entry.detail}` : ""}`));
        })
        .catch((e) => setError(`Failed to load accounts: ${String(e)}`));
    refresh();
    return onAccountsChanged(refresh);
  }, [props.isOpen]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "feditile:misskey-auth-complete" || !event.data.account) return;
      setDebugLines((prev) => [`message -> ${event.data.account.id}`, ...prev].slice(0, 12));
      await upsertMisskeyAccount(event.data.account as MisskeyAccount);
      const next = await loadAccounts();
      setMisskeyAccounts(next.misskey);
      setDefaultAccountId(next.defaultAccountId ?? "");
      setDebugLines((prev) => [`post-upsert -> ${next.misskey.length} account(s)`, ...prev].slice(0, 12));
      setTraceLines(readAuthTrace().map((entry) => `${entry.step}${entry.detail ? ` -> ${entry.detail}` : ""}`));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!props.isOpen) return;

    const consumeAuthResults = async () => {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(AUTH_RESULT_PREFIX));
      if (keys.length === 0) return;
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as { ok?: boolean; error?: string; account?: MisskeyAccount };
          const account = parsed.account;
          if (account) {
            setDebugLines((prev) => [`storage-result -> ${account.id}`, ...prev].slice(0, 12));
            await upsertMisskeyAccount(account);
            setError(null);
          } else if (parsed.error) {
            setDebugLines((prev) => [`storage-error -> ${parsed.error}`, ...prev].slice(0, 12));
          }
        } catch (e) {
          setDebugLines((prev) => [`storage-parse-error -> ${String(e)}`, ...prev].slice(0, 12));
        } finally {
          localStorage.removeItem(key);
        }
      }
      const next = await loadAccounts();
      setMisskeyAccounts(next.misskey);
      setDefaultAccountId(next.defaultAccountId ?? "");
      setDebugLines((prev) => [`storage-consume -> ${next.misskey.length} account(s)`, ...prev].slice(0, 12));
      setTraceLines(readAuthTrace().map((entry) => `${entry.step}${entry.detail ? ` -> ${entry.detail}` : ""}`));
    };

    consumeAuthResults();
    const timer = window.setInterval(consumeAuthResults, 800);
    return () => window.clearInterval(timer);
  }, [props.isOpen]);

  const storageKeys = useMemo(() => {
    if (!props.isOpen) return [];
    return Object.keys(localStorage)
      .filter((key) => key.startsWith("accounts.") || key.startsWith("feditile-accounts") || key.startsWith(AUTH_RESULT_PREFIX))
      .sort();
  }, [props.isOpen, misskeyAccounts.length, debugLines.length]);

  if (!props.isOpen) return null;

  return (
    <Modal
      isOpen={props.isOpen}
      title="Settings"
      onClose={props.onClose}
      footer={<Button onClick={props.onClose}>Close</Button>}
    >
      <FieldRow>
        <Label>Accounts (planned)</Label>
        <Pill>Misskey: auth-first (MiAuth/OAuth). Manual token entry will be added later as an advanced/legacy option.</Pill>
      </FieldRow>

      <FieldRow>
        <Label>Misskey sign-in (MiAuth)</Label>
        <Input value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)} placeholder="https://misskey.io" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Pill>{misskeyAccounts.length} account(s)</Pill>
          <Button
            disabled={isElectronRuntime() && !callbackUrl}
            onClick={() => {
              setError(null);
              try {
                if (isElectronRuntime() && !callbackUrl) {
                  throw new Error("Desktop auth receiver is still starting. Please wait a moment and try again.");
                }
                const { authorizeUrl } = startMiAuth({
                  instanceUrl,
                  appName: "FediTile",
                  callbackUrl: `${callbackUrl}?instanceUrl=${encodeURIComponent(instanceUrl)}&session={session}`,
                  permissions: [
                    "read:account",
                    "read:notes",
                    "read:notifications",
                    "write:notes",
                    "write:reactions",
                    "write:votes",
                    "read:drive",
                    "write:drive",
                  ],
                });
                window.open(authorizeUrl, `feditile-misskey-auth-${Date.now()}`, "popup,width=520,height=780");
                setDebugLines((prev) => [`start -> ${instanceUrl}`, ...prev].slice(0, 12));
                setTraceLines(readAuthTrace().map((entry) => `${entry.step}${entry.detail ? ` -> ${entry.detail}` : ""}`));
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Connect / Reconnect
          </Button>
        </div>
        <Pill>
          Requested permissions: read:account, read:notes, read:notifications, write:notes, write:reactions, write:votes, read/write:drive
        </Pill>
        <Pill>Callback: {callbackUrl}</Pill>
        {isElectronRuntime() ? <Pill>Desktop auth receiver: {callbackUrl || "starting..."}</Pill> : null}
        {error ? <Pill tone="danger">{error}</Pill> : null}
      </FieldRow>

      {misskeyAccounts.length > 0 ? (
        <FieldRow>
          <Label>Default Misskey account</Label>
          <Select
            value={defaultAccountId}
            onChange={async (e) => {
              const next = await setDefaultMisskeyAccount(e.target.value);
              setMisskeyAccounts(next.misskey);
              setDefaultAccountId(next.defaultAccountId ?? "");
            }}
          >
            {misskeyAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {(account.name || (account.username ? `@${account.username}` : account.id))} · {account.instanceUrl}
              </option>
            ))}
          </Select>
        </FieldRow>
      ) : null}

      {misskeyAccounts.length > 0 ? (
        <FieldRow>
          <Label>Connected Misskey accounts</Label>
          <div className="list">
            {misskeyAccounts.map((a) => (
              <div className="listItem" key={a.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="listTitle">
                      {a.name ? a.name : a.username ? `@${a.username}` : "Account"}{" "}
                      <span style={{ opacity: 0.6, fontWeight: 700 }}>•</span>{" "}
                      <span style={{ opacity: 0.8, fontWeight: 700 }}>{a.instanceUrl}</span>
                    </div>
                    <div className="listMeta" style={{ marginTop: 2 }}>
                      {a.username ? `@${a.username}` : a.id}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      await removeMisskeyAccount(a.id);
                      const next = await loadAccounts();
                      setMisskeyAccounts(next.misskey);
                      setDefaultAccountId(next.defaultAccountId ?? "");
                    }}
                    title="Disconnect (local only)"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </FieldRow>
      ) : null}

      <FieldRow>
        <Label>UI</Label>
        <Pill>More options will be added (accounts, connectors, filters).</Pill>
      </FieldRow>

      <FieldRow>
        <Label>MFM</Label>
        <Pill>Currently supports a safe subset of MFM functions.</Pill>
      </FieldRow>

      <FieldRow>
        <Label>Storage</Label>
        <Pill>Workspace is stored in localStorage.</Pill>
      </FieldRow>

      <FieldRow>
        <Label>Auth debug</Label>
        <div className="list">
          <div className="listItem">
            <div className="listMeta">Keys: {storageKeys.length > 0 ? storageKeys.join(", ") : "(none)"}</div>
            <div className="listMeta" style={{ marginTop: 6 }}>
              Events:
              {debugLines.length > 0 ? ` ${debugLines.join(" | ")}` : " (none)"}
            </div>
            <div className="listMeta" style={{ marginTop: 6 }}>
              Trace:
              {traceLines.length > 0 ? ` ${traceLines.join(" | ")}` : " (none)"}
            </div>
            <div style={{ marginTop: 8 }}>
              <Button
                onClick={() => {
                  clearAuthTrace();
                  setTraceLines([]);
                  setDebugLines([]);
                }}
              >
                Clear auth debug
              </Button>
            </div>
          </div>
        </div>
      </FieldRow>
    </Modal>
  );
}
