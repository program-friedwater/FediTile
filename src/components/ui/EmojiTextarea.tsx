import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import type { MisskeyEmoji } from "../../integrations/misskey/emojis";

type Props = {
  value: string;
  onChange: (value: string) => void;
  emojis: MisskeyEmoji[];
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  onSubmitShortcut?: () => void;
};

function findEmojiQuery(value: string, caret: number) {
  const before = value.slice(0, caret);
  const match = before.match(/(?:^|\s):([0-9A-Za-z_+-]{1,64})$/);
  if (!match || match.index == null) return null;
  const raw = match[1] ?? "";
  const start = before.lastIndexOf(`:${raw}`);
  if (start < 0) return null;
  return { query: raw.toLowerCase(), start, end: caret };
}

export function EmojiTextarea(props: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [caret, setCaret] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeQuery = useMemo(() => findEmojiQuery(props.value, caret), [props.value, caret]);

  const suggestions = useMemo(() => {
    if (!activeQuery?.query) return [];
    return props.emojis
      .filter((emoji) => emoji.name.toLowerCase().includes(activeQuery.query))
      .slice(0, 8);
  }, [activeQuery, props.emojis]);

  const applySuggestion = (name: string) => {
    if (!activeQuery) return;
    const next = `${props.value.slice(0, activeQuery.start)}:${name}:${props.value.slice(activeQuery.end)}`;
    props.onChange(next);
    queueMicrotask(() => {
      const el = ref.current;
      if (!el) return;
      const nextCaret = activeQuery.start + name.length + 2;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
      setSelectedIndex(0);
    });
  };

  return (
    <div className="emojiAutocomplete">
      <textarea
        ref={ref}
        className={["input", props.className ?? ""].join(" ")}
        style={props.style}
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
          setSelectedIndex(0);
        }}
        onClick={(e) => setCaret((e.currentTarget as HTMLTextAreaElement).selectionStart ?? caret)}
        onSelect={(e) => setCaret((e.currentTarget as HTMLTextAreaElement).selectionStart ?? caret)}
        onKeyUp={(e) => setCaret((e.currentTarget as HTMLTextAreaElement).selectionStart ?? caret)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            props.onSubmitShortcut?.();
            return;
          }
          if (suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((n) => (n + 1) % suggestions.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((n) => (n - 1 + suggestions.length) % suggestions.length);
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            applySuggestion(suggestions[selectedIndex]?.name ?? suggestions[0].name);
          }
          if (e.key === "Escape") {
            setCaret(-1);
          }
        }}
        placeholder={props.placeholder}
      />

      {suggestions.length > 0 ? (
        <div className="emojiAutocompleteMenu" role="listbox">
          {suggestions.map((emoji, index) => (
            <button
              key={emoji.name}
              type="button"
              className={["emojiAutocompleteItem", index === selectedIndex ? "emojiAutocompleteItemActive" : ""].join(" ")}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(emoji.name);
              }}
            >
              <img className="emojiImg" src={emoji.url} alt={`:${emoji.name}:`} loading="lazy" decoding="async" />
              <span>{`:${emoji.name}:`}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
