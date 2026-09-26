import React, { useEffect, useRef, useState } from "react";

export const INSTALL = "claude mcp add thumb -- uvx thumb-mcp";
export const REPO = "https://github.com/ishan-crd/thumb-mcp";

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

export function useCopy(text: string, onCopy?: () => void) {
  const [copied, setCopied] = useState(false);
  const t = useRef<number>();
  useEffect(() => () => clearTimeout(t.current), []);
  const copy = async () => {
    if (!(await copyText(text))) return;
    setCopied(true); onCopy?.();
    clearTimeout(t.current);
    t.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return [copied, copy] as const;
}

export const CopyIcon: React.FC<{ done: boolean }> = ({ done }) => done ? (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
) : (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="5" y="5" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 3.2A1.7 1.7 0 0 0 9 2.5H4.2c-1 0-1.7.8-1.7 1.7V9c0 .6.3 1.2.8 1.5" stroke="currentColor" strokeWidth="1.5" /></svg>
);

/** the film's dark command pill: `$ claude mcp add thumb -- uvx thumb-mcp▌` + copy */
export const Command: React.FC<{ text?: string; size?: "lg" | "md"; onCopy?: () => void }> = ({ text = INSTALL, size = "lg", onCopy }) => {
  const [copied, copy] = useCopy(text, onCopy);
  return (
    <button className={`cmd cmd-${size}${copied ? " copied" : ""}`} onClick={copy} aria-label={`Copy: ${text}`}>
      <span className="cmd-text"><span className="cmd-dollar">$</span> {text.split(" ").map((w, i) => <React.Fragment key={i}>{i > 0 && " "}<span className="nb">{w}</span></React.Fragment>)}<span className="cmd-caret" aria-hidden /></span>
      <span className="cmd-copy"><CopyIcon done={copied} /><span>{copied ? "Copied" : "Copy"}</span></span>
    </button>
  );
};

/** a code block with a copy button */
export const Code: React.FC<{ code: string; lang?: string; copy?: string }> = ({ code, lang, copy }) => {
  const [copied, doCopy] = useCopy(copy ?? code);
  return (
    <div className="code">
      {lang && <span className="code-lang">{lang}</span>}
      <button className={`code-copy${copied ? " copied" : ""}`} onClick={doCopy} aria-label="Copy"><CopyIcon done={copied} /></button>
      <pre><code>{code}</code></pre>
    </div>
  );
};

/** a headline whose words rise in one after another */
export const Words: React.FC<{ text: string; as?: keyof JSX.IntrinsicElements; className?: string; dim?: string[]; delay?: number }> = ({ text, as: Tag = "h2", className, dim = [], delay = 0 }) => (
  <Tag className={`words ${className ?? ""}`} data-reveal="words" aria-label={text}>
    {text.split(" ").map((w, i) => (
      <React.Fragment key={i}><span className="w" aria-hidden><span className={dim.includes(w) ? "dim" : undefined} style={{ transitionDelay: `${delay + i * 55}ms` }}>{w}</span></span>{" "}</React.Fragment>
    ))}
  </Tag>
);

export const GitHubIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
);

/** the pixel thumb, taking a tap every few seconds (a ripple under it) */
export const Thumb: React.FC<{ className?: string; tapping?: boolean; press?: number }> = ({ className, tapping, press = 0 }) => (
  <span className={`thumb ${tapping ? "tapping" : ""} ${className ?? ""}`} style={{ ["--press" as string]: press }}>
    <img src="/thumb.png" alt="" width={358} height={681} draggable={false} />
  </span>
);

/** the pixel wordmark: "thumb" over "MCP" */
export const Wordmark: React.FC<{ className?: string; mcp?: boolean }> = ({ className, mcp = true }) => (
  <span className={`wordmark ${className ?? ""}`}>
    <img className="wm-thumb" src="/wordmark.png" alt="thumb" width={814} height={236} draggable={false} />
    {mcp && <img className="wm-mcp" src="/mcp.png" alt="MCP" width={334} height={77} draggable={false} />}
  </span>
);
