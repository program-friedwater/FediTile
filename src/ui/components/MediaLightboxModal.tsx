import { useEffect } from "react";

export type LightboxItem = {
  url: string;
  alt?: string;
};

export function MediaLightboxModal(props: {
  isOpen: boolean;
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (!props.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
      if (e.key === "ArrowLeft") props.onPrev();
      if (e.key === "ArrowRight") props.onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.isOpen, props.onClose, props.onPrev, props.onNext]);

  if (!props.isOpen) return null;

  const item = props.items[props.index];
  const atStart = props.index <= 0;
  const atEnd = props.index >= props.items.length - 1;

  return (
    <div
      className="lightboxBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="lightboxStage" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightboxClose" onClick={props.onClose} aria-label="Close">
          ×
        </button>
        {!atStart ? (
          <button type="button" className="lightboxNav lightboxNavLeft" onClick={props.onPrev} aria-label="Previous image">
            ‹
          </button>
        ) : null}
        {!atEnd ? (
          <button type="button" className="lightboxNav lightboxNavRight" onClick={props.onNext} aria-label="Next image">
            ›
          </button>
        ) : null}
        {item ? <img className="lightboxImg" src={item.url} alt={item.alt ?? ""} decoding="async" /> : null}
      </div>
    </div>
  );
}
