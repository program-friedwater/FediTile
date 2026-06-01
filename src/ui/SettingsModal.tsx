import { useEffect, useMemo, useState } from "react";
import { loadAccounts, removeMisskeyAccount, type MisskeyAccount } from "./accounts/accountsStore";
import { startMiAuth } from "./misskey/miauth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsModal(props: Props) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [misskeyAccounts, setMisskeyAccounts] = useState<MisskeyAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    // Works both on dev server and file:// preview.
    const u = new URL(window.location.href);
    u.hash = `#/auth/misskey`;
    u.search = "";
    return u.toString();
  }, []);

  useEffect(() => {
    if (!props.isOpen) return;
    setError(null);
    loadAccounts()
      .then((a) => setMisskeyAccounts(a.misskey))
      .catch((e) => setError(`Failed to load accounts: ${String(e)}`));
  }, [props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  if (!props.isOpen) return null;

  return (
    <div
      className="modalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal">
        <div className="modalHeader">Settings</div>
        <div className="modalBody">
          <div className="fieldRow">
            <div className="label">Accounts (planned)</div>
            <div className="pill">
              Misskey: auth-first (MiAuth/OAuth). Manual token entry will be added later as an advanced/legacy option.
            </div>
          </div>

          <div className="fieldRow">
            <div className="label">Misskey sign-in (MiAuth)</div>
            <input
              className="input"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="https://misskey.io"
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span className="pill">{misskeyAccounts.length} account(s)</span>
              <button
                className="btn"
                onClick={() => {
                  setError(null);
                  try {
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
                        "read:drive",
                        "write:drive",
                      ],
                    });
                    window.open(authorizeUrl, "feditile-misskey-auth", "popup,width=520,height=780");
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                Connect / Reconnect
              </button>
            </div>
            <div className="pill">
              Requested permissions: read:account, read:notes, read:notifications, write:notes, write:reactions, read/write:drive
            </div>
            {error ? <div className="pill" style={{ color: "var(--danger)" }}>{error}</div> : null}
          </div>

          {misskeyAccounts.length > 0 ? (
            <div className="fieldRow">
              <div className="label">Connected Misskey accounts</div>
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
                      <button
                        className="btn btnDanger"
                        onClick={async () => {
                          await removeMisskeyAccount(a.id);
                          const next = await loadAccounts();
                          setMisskeyAccounts(next.misskey);
                        }}
                        title="Disconnect (local only)"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="fieldRow">
            <div className="label">UI</div>
            <div className="pill">More options will be added (accounts, connectors, filters).</div>
          </div>

          <div className="fieldRow">
            <div className="label">MFM</div>
            <div className="pill">Currently supports a safe subset of MFM functions.</div>
          </div>

          <div className="fieldRow">
            <div className="label">Storage</div>
            <div className="pill">Workspace is stored in localStorage.</div>
          </div>
        </div>
        <div className="modalFooter">
          <button className="btn" onClick={props.onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
