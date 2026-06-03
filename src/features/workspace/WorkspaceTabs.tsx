import { useState } from "react";
import type { TabId, TabWorkspace } from "../../state/workspace/tileTypes";
import { Button, IconButton } from "../../components/ui/Button";

type Props = {
  tabs: TabWorkspace[];
  activeTabId: TabId;
  onActivate: (id: TabId) => void;
  onAdd: () => void;
  onRename: (id: TabId, title: string) => void;
  onRemove: (id: TabId) => void;
};

export function WorkspaceTabs(props: Props) {
  const [editingId, setEditingId] = useState<TabId | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <>
      <div className="topReveal" aria-hidden="true" />
      <div className="tabBar">
        <div className="tabList">
          {props.tabs.map((tab) => {
            const active = tab.id === props.activeTabId;
            const editing = tab.id === editingId;
            return (
              <div key={tab.id} className={["tabChip", active ? "tabChipActive" : ""].join(" ")}>
                {editing ? (
                  <input
                    className="tabRenameInput"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      props.onRename(tab.id, draft.trim() || tab.title);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        props.onRename(tab.id, draft.trim() || tab.title);
                        setEditingId(null);
                      } else if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <button type="button" className="tabChipBtn" onClick={() => props.onActivate(tab.id)}>
                    {tab.title}
                  </button>
                )}
                <div className="tabChipActions">
                  <IconButton
                    title="Rename tab"
                    onClick={() => {
                      setEditingId(tab.id);
                      setDraft(tab.title);
                    }}
                  >
                    ✎
                  </IconButton>
                  <IconButton title="Close tab" onClick={() => props.onRemove(tab.id)} disabled={props.tabs.length <= 1}>
                    ×
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
        <Button onClick={props.onAdd}>New tab</Button>
      </div>
    </>
  );
}
