import type { ReactNode } from "react";
import React from "react";

type Span =
  | { t: "text"; v: string }
  | { t: "bold"; c: Span[] }
  | { t: "italic"; c: Span[] }
  | { t: "strike"; c: Span[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; label: Span[] }
  | { t: "mention"; handle: string }
  | { t: "hashtag"; tag: string }
  | { t: "url"; href: string }
  | { t: "fn"; name: string; flags: string[]; params: Record<string, string>; c: Span[] }
  | { t: "tag"; name: "small" | "center"; c: Span[] }
  | { t: "emoji"; name: string };

function isSafeCssColor(value: string) {
  if (/^#[0-9a-fA-F]{3}$/.test(value)) return true;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return true;
  if (/^[a-zA-Z]+$/.test(value)) return true;
  return false;
}

function parseFnSpec(spec: string): { name: string; flags: string[]; params: Record<string, string> } {
  const parts = spec.split(".");
  const name = parts[0] ?? "";
  const flags: string[] = [];
  const params: Record<string, string> = {};

  for (const chunk of parts.slice(1)) {
    for (const part of chunk.split(",")) {
      const p = part.trim();
      if (!p) continue;
      const eq = p.indexOf("=");
      if (eq !== -1) {
        const k = p.slice(0, eq).trim();
        const v = p.slice(eq + 1).trim();
        if (k) params[k] = v;
      } else {
        flags.push(p);
      }
    }
  }
  return { name, flags, params };
}

function parseInline(input: string): Span[] {
  const out: Span[] = [];
  let i = 0;

  const pushText = (v: string) => {
    if (!v) return;
    const last = out[out.length - 1];
    if (last?.t === "text") last.v += v;
    else out.push({ t: "text", v });
  };

  const startsWith = (s: string) => input.slice(i, i + s.length) === s;

  while (i < input.length) {
    // Simple tag syntax subset: <small>...</small>, <center>...</center>
    if (input[i] === "<") {
      const tryTag = (name: "small" | "center") => {
        const open = `<${name}>`;
        const close = `</${name}>`;
        if (!startsWith(open)) return null;
        const end = input.indexOf(close, i + open.length);
        if (end === -1) return null;
        const inner = input.slice(i + open.length, end);
        return { end: end + close.length, inner };
      };

      const small = tryTag("small");
      if (small) {
        out.push({ t: "tag", name: "small", c: parseInline(small.inner) });
        i = small.end;
        continue;
      }

      const center = tryTag("center");
      if (center) {
        out.push({ t: "tag", name: "center", c: parseInline(center.inner) });
        i = center.end;
        continue;
      }
    }

    // MFM function syntax: $[name content...]
    if (startsWith("$[")) {
      let j = i + 2;
      let depth = 1;
      while (j < input.length) {
        const ch = input[j];
        if (ch === "[") depth += 1;
        else if (ch === "]") {
          depth -= 1;
          if (depth === 0) break;
        }
        j += 1;
      }
      if (depth === 0) {
        const inner = input.slice(i + 2, j);
        const m = inner.match(/^([^\s]+)\s*([\s\S]*)$/);
        const spec = (m?.[1] ?? "").trim();
        const body = (m?.[2] ?? "").trimStart();
        if (spec.length > 0) {
          const parsed = parseFnSpec(spec);
          out.push({ t: "fn", name: parsed.name, flags: parsed.flags, params: parsed.params, c: body ? parseInline(body) : [] });
        }
        else pushText(input.slice(i, j + 1));
        i = j + 1;
        continue;
      }
    }

    // inline code: `...`
    if (input[i] === "`") {
      const end = input.indexOf("`", i + 1);
      if (end !== -1) {
        out.push({ t: "code", v: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // bold: **...**
    if (startsWith("**")) {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        out.push({ t: "bold", c: parseInline(input.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // strike: ~~...~~
    if (startsWith("~~")) {
      const end = input.indexOf("~~", i + 2);
      if (end !== -1) {
        out.push({ t: "strike", c: parseInline(input.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // italic: *...*
    if (input[i] === "*") {
      const end = input.indexOf("*", i + 1);
      if (end !== -1) {
        out.push({ t: "italic", c: parseInline(input.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    // link: [label](url)
    if (input[i] === "[") {
      const close = input.indexOf("]", i + 1);
      if (close !== -1 && input[close + 1] === "(") {
        const closeParen = input.indexOf(")", close + 2);
        if (closeParen !== -1) {
          const label = input.slice(i + 1, close);
          const href = input.slice(close + 2, closeParen);
          out.push({ t: "link", href, label: parseInline(label) });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // url autolink
    if (startsWith("http://") || startsWith("https://")) {
      const m = input.slice(i).match(/^(https?:\/\/[^\s<>"]+)/);
      if (m) {
        out.push({ t: "url", href: m[1] });
        i += m[1].length;
        continue;
      }
    }

    // mention: @user or @user@host
    if (input[i] === "@") {
      const m = input.slice(i).match(/^@[\w.-]+(@[\w.-]+\.[\w.-]+)?/);
      if (m) {
        out.push({ t: "mention", handle: m[0] });
        i += m[0].length;
        continue;
      }
    }

    // hashtag: #tag
    if (input[i] === "#") {
      const m = input.slice(i).match(/^#[\p{L}\p{N}_]+/u);
      if (m) {
        out.push({ t: "hashtag", tag: m[0] });
        i += m[0].length;
        continue;
      }
    }

    // custom emoji :name:
    if (input[i] === ":") {
      const end = input.indexOf(":", i + 1);
      if (end !== -1) {
        const name = input.slice(i + 1, end);
        if (/^[a-zA-Z0-9_+-]{1,64}$/.test(name)) {
          out.push({ t: "emoji", name });
          i = end + 1;
          continue;
        }
      }
    }

    pushText(input[i]);
    i += 1;
  }

  return out;
}

function renderSpans(
  spans: Span[],
  keyPrefix: string,
  emojiResolver?: (name: string) => string | undefined,
): ReactNode[] {
  return spans.map((s, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (s.t) {
      case "text":
        return <span key={key}>{s.v}</span>;
      case "bold":
        return <strong key={key}>{renderSpans(s.c, key, emojiResolver)}</strong>;
      case "italic":
        return <em key={key}>{renderSpans(s.c, key, emojiResolver)}</em>;
      case "strike":
        return <del key={key}>{renderSpans(s.c, key, emojiResolver)}</del>;
      case "code":
        return (
          <code key={key} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {s.v}
          </code>
        );
      case "link":
        return (
          <a key={key} href={s.href} target="_blank" rel="noreferrer noopener">
            {renderSpans(s.label, key, emojiResolver)}
          </a>
        );
      case "url":
        return (
          <a key={key} href={s.href} target="_blank" rel="noreferrer noopener">
            {s.href}
          </a>
        );
      case "mention":
        return (
          <span key={key} style={{ color: "var(--accent)" }}>
            {s.handle}
          </span>
        );
      case "hashtag":
        return (
          <span key={key} style={{ color: "var(--accent2)" }}>
            {s.tag}
          </span>
        );
      case "fn": {
        const fn = s.name;
        const className = (() => {
          switch (fn) {
            case "spin":
              if (s.flags.includes("x")) return "mfmFnSpinX";
              if (s.flags.includes("y")) return "mfmFnSpinY";
              return "mfmFnSpin";
            case "shake":
              return "mfmFnShake";
            case "jump":
              return "mfmFnJump";
            case "flip":
              return "mfmFnFlip";
            case "tada":
              return "mfmFnTada";
            case "rainbow":
              return "mfmFnRainbow";
            case "bounce":
              return "mfmFnBounce";
            case "twitch":
              return "mfmFnTwitch";
            case "jelly":
              return "mfmFnJelly";
            case "sparkle":
              return "mfmFnSparkle";
            case "blur":
              return "mfmFnBlur";
            case "rotate":
              return "mfmFnRotate";
            case "position":
              return "mfmFnPosition";
            case "scale":
              return "mfmFnScale";
            case "fg":
              return "mfmFnColor";
            case "bg":
              return "mfmFnColor";
            case "font":
              return "mfmFnFont";
            case "x2":
              return "mfmFnX2";
            case "x3":
              return "mfmFnX3";
            case "x4":
              return "mfmFnX4";
            case "small":
              return "mfmFnSmall";
            case "large":
              return "mfmFnLarge";
            default:
              return "mfmFnUnknown";
          }
        })();

        const style = {} as React.CSSProperties & Record<string, string>;

        const speed = s.params["speed"];
        if (speed && /^[0-9.]+m?s$/.test(speed)) {
          style.animationDuration = speed;
        }

        if (fn === "spin") {
          if (s.flags.includes("left")) style.animationDirection = "reverse";
          if (s.flags.includes("alternate")) style.animationDirection = "alternate";
        }

        if (fn === "rotate") {
          const deg = s.params["deg"];
          if (deg && /^-?[0-9.]+$/.test(deg)) {
            style["--mfm-rotate-deg"] = `${deg}deg`;
          }
        }

        if (fn === "scale") {
          const x = s.params["x"];
          const y = s.params["y"];
          const clamp = (v: string | undefined) => {
            if (!v || !/^-?[0-9.]+$/.test(v)) return null;
            const n = Number(v);
            if (!Number.isFinite(n)) return null;
            return Math.max(0.2, Math.min(5, n));
          };
          const sx = clamp(x);
          const sy = clamp(y);
          if (sx != null) style["--mfm-scale-x"] = String(sx);
          if (sy != null) style["--mfm-scale-y"] = String(sy);
        }

        if (fn === "position") {
          const parse = (v: string | undefined) => {
            if (!v || !/^-?[0-9.]+$/.test(v)) return null;
            const n = Number(v);
            if (!Number.isFinite(n)) return null;
            return Math.max(-3, Math.min(3, n));
          };
          const px = parse(s.params["x"]);
          const py = parse(s.params["y"]);
          if (px != null) style["--mfm-pos-x"] = String(px);
          if (py != null) style["--mfm-pos-y"] = String(py);
        }

        if (fn === "fg" || fn === "bg") {
          const raw = s.params["color"] ?? s.flags.find((f) => isSafeCssColor(f)) ?? "";
          const color = raw.startsWith("#") ? raw : raw ? `#${raw}` : "";
          if (color && isSafeCssColor(color)) {
            if (fn === "fg") style.color = color;
            else style.backgroundColor = color;
          }
        }

        if (fn === "font") {
          const fam = s.flags[0] ?? "";
          if (fam === "serif") style.fontFamily = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
          else if (fam === "monospace") style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
          else if (fam === "cursive") style.fontFamily = "cursive";
          else if (fam === "fantasy") style.fontFamily = "fantasy";
          else if (fam === "emoji") style.fontFamily = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'";
        }

        return (
          <span key={key} className={className} style={style}>
            {renderSpans(s.c, key, emojiResolver)}
          </span>
        );
      }
      case "tag": {
        if (s.name === "small") {
          return (
            <span key={key} className="mfmTagSmall">
              {renderSpans(s.c, key, emojiResolver)}
            </span>
          );
        }
        if (s.name === "center") {
          return (
            <span key={key} className="mfmTagCenter">
              {renderSpans(s.c, key, emojiResolver)}
            </span>
          );
        }
        return null;
      }
      case "emoji": {
        const url = emojiResolver?.(s.name);
        if (!url) return <span key={key}>{`:${s.name}:`}</span>;
        return <img key={key} className="mfmEmoji" src={url} alt={`:${s.name}:`} loading="lazy" decoding="async" />;
      }
      default:
        return null;
    }
  });
}

export function renderMfm(input: string, opts?: { emojiResolver?: (name: string) => string | undefined }): ReactNode {
  // Block code: ``` ... ```
  if (input.startsWith("```") && input.endsWith("```") && input.length >= 6) {
    const body = input.slice(3, -3);
    return (
      <pre style={{ margin: 0, padding: 10, overflow: "auto" }}>
        <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{body}</code>
      </pre>
    );
  }

  const lines = input.split("\n");
  return (
    <>
      {lines.map((line, idx) => (
        <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
          {renderSpans(parseInline(line), `l${idx}`, opts?.emojiResolver)}
        </div>
      ))}
    </>
  );
}
