import React, { createContext, useEffect, useMemo, useReducer } from "react";
import type { Workspace } from "./tileTypes";
import { loadWorkspace, saveWorkspace } from "./workspaceStore";
import { createDefaultWorkspace, workspaceReducer } from "./workspaceReducer";

type WorkspaceContextValue = {
  workspace: Workspace;
  dispatch: React.Dispatch<import("./workspaceReducer").WorkspaceAction>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceProvider is missing");
  return ctx;
}

export function WorkspaceProvider(props: { children: React.ReactNode }) {
  const initial = useMemo(() => loadWorkspace() ?? createDefaultWorkspace(), []);
  const [workspace, dispatch] = useReducer(workspaceReducer, initial);

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  const value = useMemo(() => ({ workspace, dispatch }), [workspace]);

  return <WorkspaceContext.Provider value={value}>{props.children}</WorkspaceContext.Provider>;
}

