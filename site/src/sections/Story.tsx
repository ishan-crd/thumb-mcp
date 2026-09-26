import React, { useEffect, useRef, useState } from "react";
import { Words } from "../ui";
import { useInView, useProgress, seg, ease } from "../motion";

/** the film's statement beat: three "No"s, then the coral pill */
export const Mirroring: React.FC = () => (
  <section className="nope">
    <div className="nope-lines">
      {["No jailbreak.", "No WebDriverAgent.", "No developer profile."].map((l, i) => (
        <p key={l} data-reveal style={{ ["--d" as string]: `${i * 140}ms` }}>{l}</p>
      ))}
    </div>
    <div className="nope-pill" data-reveal="pop" style={{ ["--d" as string]: "480ms" }}>
      <PhoneGlyph /> Just iPhone Mirroring.
    </div>
    <p className="nope-sub" data-reveal style={{ ["--d" as string]: "600ms" }}>
      thumb drives the same mirroring window you already use by hand. Nothing is installed on the iPhone.
    </p>
  </section>
);
const PhoneGlyph = () => (
  <svg width="20" height="26" viewBox="0 0 20 26" fill="none" aria-hidden><rect x="1.5" y="1.5" width="17" height="23" rx="4" stroke="currentColor" strokeWidth="2.2" /><rect x="7" y="4.2" width="6" height="1.8" rx=".9" fill="currentColor" /></svg>
);

const HOW = [
  {
    k: "01", title: "It reads the screen", body: "Apple's on-device Vision OCR finds every piece of text with tap coordinates. No API key, no network, nothing leaves your Mac.",
    code: [["describe_screen()", ""], ["(302, 175)", "Wallet →"], ["(112, 278)", "Available $0"], ["(196, 431)", "Wi-Fi"]],
  },
  {
    k: "02", title: "It taps like you do", body: "Real keycodes and real HID input events into the mirroring window. Tap text by name, so flows survive layout changes.",
    code: [["tap_text(\"Wi-Fi\")", ""], ["→ tapped", "(196, 431)"], ["type_text(\"hi\")", ""], ["→ typed", "2 keys"]],
  },
  {
    k: "03", title: "It checks it worked", body: "Every step waits for the screen to settle and compares frames. Silent no-ops fail loudly instead of drifting on.",
    code: [["wait_until_settled()", ""], ["→ settled", "0.42s"], ["assert_changed()", ""], ["→ ok", "Δ 18.6"]],
  },
];

export const How: React.FC = () => (
  <section className="how" id="how">
    <div className="section-head">
      <span className="eyebrow" data-reveal>How it works</span>
      <Words text="Reads. Taps. Checks." className="h2" dim={["Checks."]} />
    </div>
    <div className="how-grid">
      {HOW.map((h, i) => (
        <article key={h.k} className="how-card" data-reveal style={{ ["--d" as string]: `${i * 120}ms` }}>
          <span className="how-k">{h.k}</span>
          <h3>{h.title}</h3>
          <p>{h.body}</p>
          <div className="how-code">
            {h.code.map(([a, b], j) => <div key={j} className={b ? "out" : "in"}><span>{a}</span>{b && <em>{b}</em>}</div>)}
          </div>
        </article>
      ))}
    </div>
  </section>
);

/** coral: "Build your app faster": Figma → Claude → Expo, with the cards drifting apart as you scroll */
export const Build: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useProgress(ref, "pass");
  const drift = (k: number) => `translateY(${(0.5 - p) * k}px)`;
  return (
    <section className="build" ref={ref}>
      <div className="section-head">
        <span className="eyebrow light" data-reveal>For builders</span>
        <Words text="Build your app faster, with a thumb." className="h2 light" dim={["thumb."]} />
        <p className="lede light" data-reveal>
          <code>open_expo_app()</code> finds your Mac's LAN address and opens your dev server in Expo Go. Claude looks at the screen, compares it with the design and fixes the code, on the phone in your hand.
        </p>
      </div>
      <div className="build-cards">
        <div data-reveal><div className="bcard term" style={{ transform: drift(60) }}>
          <div className="term-bar"><i /><i /><i /><span>Claude Code · my-app</span></div>
          <div className="term-body">
            <div className="term-ask"><b className="chev">›</b> make the app match the Figma design</div>
            <div className="term-tool"><b className="ok">✓</b><span className="tool-ns">thumb</span><span className="tool-call">open_expo_app()</span></div>
            <div className="term-tool"><b className="ok">✓</b><span className="tool-ns">thumb</span><span className="tool-call">screenshot()</span></div>
            <div className="diff">
              <div><span>primary</span><s>#3B82F6</s><b>#E9573F</b></div>
              <div><span>radius</span><s>8</s><b>22</b></div>
              <div><span>title</span><s>Medium 24</s><b>Bold 30</b></div>
              <div><span>cta</span><s>square</s><b>pill · full</b></div>
            </div>
            <div className="term-tool"><b className="ok">✓</b><span className="tool-ns">thumb</span><span className="tool-call">screenshot()</span><span className="tool-time">matches</span></div>
          </div>
        </div></div>
        <div data-reveal style={{ ["--d" as string]: "140ms" }}><div className="bcard app" style={{ transform: drift(-40) }}>
          <div className="app-head"><small>Good morning</small><b>Ishan</b><i /></div>
          <div className="app-hero"><small>Today's special</small><b>Flat white</b><span>Oat milk · 12 oz · ₹240</span><i /></div>
          {["Order history", "Favourites", "Rewards · 240 pts"].map((r, i) => <div key={r} className="app-row"><i className={i === 2 ? "c" : ""} />{r}</div>)}
          <div className="app-cta">Order now</div>
        </div></div>
      </div>
    </section>
  );
};

/** the launch film, muted, playing only while on screen */
export const Film: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView) { if (!src) setSrc("/film.mp4"); v.play().catch(() => {}); } else v.pause();
  }, [inView, src]);
  return (
    <section className="film">
      <div className="section-head">
        <span className="eyebrow" data-reveal>The film</span>
        <Words text="Fifty seconds of thumb." className="h2" dim={["thumb."]} />
      </div>
      <div className="film-frame" ref={ref} data-reveal="scale">
        <video ref={video} src={src} poster="/film.jpg" muted loop playsInline preload="none" aria-label="thumb MCP launch film" />
      </div>
      <p className="film-note" data-reveal>Made in <a href="https://studio.insyd.in/templates/thumb-launch">Studio by Insyd</a>. Remix it as a template.</p>
    </section>
  );
};

// ---------------------------------------------------------------- skills
const STEPS = ["open Settings", "tap “Wi-Fi”", "toggle on", "go_back()"];
export const Skills: React.FC = () => {
  const [ref, inView] = useInView<HTMLElement>("-25% 0px");
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    setN(0);
    let i = 0;
    const id = setInterval(() => { i++; setN(i); if (i >= STEPS.length + 3) clearInterval(id); }, 520);
    return () => clearInterval(id);
  }, [inView]);
  const recording = n > 0 && n <= STEPS.length;
  return (
    <section className="skills" ref={ref}>
      <div className="skills-copy">
        <span className="eyebrow" data-reveal>Skills</span>
        <Words text="Show it once. Replay forever." className="h2" dim={["Replay", "forever."]} />
        <p className="lede" data-reveal>Record a flow by driving the mirroring window yourself. thumb saves it as device-point steps, so it replays on any window size, and starts from the app's root every time.</p>
      </div>
      <div className="rec" data-reveal="scale">
        <div className={`rec-head${recording ? " on" : ""}`}><i />{recording ? "Recording" : n > STEPS.length ? "Saved" : "Ready"}<code>start_recording()</code></div>
        <ol className="rec-steps">
          {STEPS.map((s, i) => <li key={s} className={n > i ? "in" : ""}><span>{String(i + 1).padStart(2, "0")}</span>{s}</li>)}
        </ol>
        <div className={`rec-save${n > STEPS.length ? " in" : ""}`}><code>stop_recording(<em>"open-wifi"</em>, app=<em>"Settings"</em>)</code></div>
        <div className={`rec-run${n > STEPS.length + 1 ? " in" : ""}`}><b>▶</b><code>run_skill(<em>"open-wifi"</em>)</code><span>4 steps · 3.8s</span></div>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------- safety
const DENY = ["Send", "Pay", "Place order", "Delete", "Log out", "Call", "$ 75.00 a month"];
export const Safety: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useProgress(ref, "pass");
  const s = ease(seg(p, 0.2, 0.45));
  return (
    <section className="safety" ref={ref}>
      <div className="section-head">
        <span className="eyebrow" data-reveal>Safe by default</span>
        <Words text="It drafts. You send." className="h2" dim={["You", "send."]} />
      </div>
      <div className="safety-grid">
        <article className="safe-card" data-reveal>
          <div className="imsg">
            <div className="imsg-to">To: <b>Rohit</b></div>
            <div className="bubble" style={{ transform: `scale(${0.85 + s * 0.15})`, opacity: s }}>running 10 min late</div>
            <div className="imsg-bar"><span>iMessage</span><b className={p > 0.5 ? "armed" : ""}>↑</b></div>
          </div>
          <h3>Messages wait for your yes</h3>
          <p><code>send_message</code> and <code>send_whatsapp</code> draft and show you a screenshot. Nothing goes out until you say so and Claude calls <code>confirm_send()</code>.</p>
        </article>
        <article className="safe-card" data-reveal style={{ ["--d" as string]: "120ms" }}>
          <div className="deny">{DENY.map((d, i) => <span key={d} className={p > 0.3 + i * 0.03 ? "struck" : ""}>{d}</span>)}</div>
          <h3>Exploring never buys anything</h3>
          <p><code>explore_app</code> maps an app screen by screen, and never taps send, pay, order, delete, log out, call, or anything with a price on it.</p>
        </article>
      </div>
    </section>
  );
};
