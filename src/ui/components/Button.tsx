import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "danger"; children: ReactNode },
) {
  const { variant = "default", className, ...rest } = props;
  const cls = ["btn", variant === "danger" ? "btnDanger" : "", className ?? ""].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest} />;
}

export function IconButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "danger"; children: ReactNode },
) {
  const { variant = "default", className, ...rest } = props;
  const cls = ["iconBtn", variant === "danger" ? "iconBtnDanger" : "", className ?? ""].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest} />;
}

