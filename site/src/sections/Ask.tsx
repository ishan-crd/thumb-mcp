import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { reduced, useInView } from "../motion";

const ASKS: [string, string][] = [
  ["▦", "open Instagram"],
  ["⌁", "turn on Wi-Fi"],
  ["▷", "run the Expo app"],
  ["✉", "text Rohit “running late”"],
  ["⌕", "search Spotify for lo-fi"],
  ["◎", "explore the Settings app"],
  ["●", "record a skill"],
];

/** "Ask Claude to [pill]": the pill cycles through things people ask, its width springing between them */
export const Ask: React.FC = () => {
  const [ref, inView] = useInView<HTMLElement>("-20% 0px");
  const [i, setI] = useState(0);
  const [w, setW] = useState<number>();
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (!inView || reduced()) return;
    const id = setInterval(() => setI((n) => (n + 1) % ASKS.length), 1700);
    return () => clearInterval(id);
  }, [inView]);
  useLayoutEffect(() => {
    const measure = () => setW(items.current[i]?.offsetWidth);
    measure();
    document.fonts?.ready.then(measure);
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [i]);
  return (
    <section className="ask" id="ask" ref={ref}>
      <h2 className="ask-line" data-reveal>
        <span>Ask Claude to</span>
        <span className="ask-pill" style={{ width: w }} aria-live="polite">
          {ASKS.map(([icon, text], n) => (
            <span key={n} ref={(el) => (items.current[n] = el)} className={`ask-item${n === i ? " on" : n === (i + ASKS.length - 1) % ASKS.length ? " out" : ""}`} aria-hidden={n !== i}>
              <i>{icon}</i>{text}
            </span>
          ))}
        </span>
      </h2>
      <p className="ask-sub" data-reveal style={{ ["--d" as string]: "120ms" }}>…and it does it on your actual iPhone. Same apps, same accounts, same screen you'd use by hand.</p>
    </section>
  );
};
