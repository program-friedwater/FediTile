import type { ReactNode } from "react";

export function Pill(props: { children: ReactNode; tone?: "default" | "danger" }) {
  return <div className="pill" style={props.tone === "danger" ? { color: "var(--danger)" } : undefined}>{props.children}</div>;
}

