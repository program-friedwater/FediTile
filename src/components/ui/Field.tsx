import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Label as ShadcnLabel } from "./label";
import { Input as ShadcnInput } from "./input";
import { Textarea as ShadcnTextarea } from "./textarea";

export function FieldRow(props: { tight?: boolean; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={cn("flex flex-col gap-3", props.tight && "gap-2")} style={props.style}>
      {props.children}
    </div>
  );
}

export function Label(props: { children: ReactNode }) {
  return <ShadcnLabel>{props.children}</ShadcnLabel>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadcnInput {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <ShadcnTextarea {...props} />;
}
