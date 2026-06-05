import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Pill(props: { children: ReactNode; tone?: "default" | "danger" }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/70 px-3 py-2 text-sm text-muted-foreground",
        props.tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {props.children}
    </div>
  );
}
