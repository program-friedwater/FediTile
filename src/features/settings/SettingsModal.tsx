import { useEffect, useMemo, useState } from "react";
import { loadAccounts, removeMisskeyAccount, type MisskeyAccount } from "../../state/accounts/accountsStore";
import { startMiAuth } from "../../integrations/misskey/miauth";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FieldRow, Input, Label } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";

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
                    "write:votes",
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
          </Button>
        </div>
        <Pill>
          Requested permissions: read:account, read:notes, read:notifications, write:notes, write:reactions, write:votes, read/write:drive
        </Pill>
        {error ? <Pill tone="danger">{error}</Pill> : null}
      </FieldRow>

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
    </Modal>
  );
}
