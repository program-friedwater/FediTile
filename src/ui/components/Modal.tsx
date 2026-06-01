import { useEffect } from "react";

export function Modal(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!props.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.isOpen, props.onClose]);

  if (!props.isOpen) return null;

  return (
    <div
      className="modalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">{props.title}</div>
        <div className="modalBody">{props.children}</div>
        {props.footer ? <div className="modalFooter">{props.footer}</div> : null}
      </div>
    </div>
  );
}

