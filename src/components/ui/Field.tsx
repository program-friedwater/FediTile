import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function FieldRow(props: { tight?: boolean; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={["fieldRow", props.tight ? "fieldRowTight" : ""].filter(Boolean).join(" ")} style={props.style}>
      {props.children}
    </div>
  );
}

export function Label(props: { children: ReactNode }) {
  return <div className="label">{props.children}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={["input", props.className ?? ""].join(" ")} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={["select", props.className ?? ""].join(" ")} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={["input", props.className ?? ""].join(" ")} {...props} />;
}

