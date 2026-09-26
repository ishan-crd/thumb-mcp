import React, { useRef } from "react";
import { useProgress, seg, ease } from "../motion";
import { Phone, HomeScreen, Spotlight, Instagram } from "../Phone";

const PROMPT = "open instagram and search for latte art";
const type = (s: string, t: number) => s.slice(0, Math.round(s.length * t));

/** where the thumb taps on the phone screen, in % of the screen, and when (scroll progress) */
const TAPS: { at: number; x: number; y: number }[] = [
  { at: 0.43, x: 50, y: 30 },   // Spotlight top hit
  { at: 0.60, x: 30, y: 94 },   // search tab
  { at: 0.66, x: 50, y: 17 },   // search field
];

/**
 * The film's blue beat, scroll-driven: the thumb sting, then Claude Code on the left typing the ask and
 * calling thumb's tools while the phone on the right does it. Scrolling scrubs through it.
 */
export const Demo: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useProgress(ref, "sticky");
  const sting = seg(p, 0.02, 0.14);                 // the circle shrinks away
  const enter = ease(seg(p, 0.08, 0.2));            // terminal + phone slide in
  const prompt = seg(p, 0.18, 0.3);
  const call1 = seg(p, 0.3, 0.33), spot = seg(p, 0.32, 0.36), spotQ = seg(p, 0.35, 0.41), hit = seg(p, 0.4, 0.42);
  const ig = seg(p, 0.45, 0.5);
  const call2 = seg(p, 0.55, 0.58), search = seg(p, 0.6, 0.64), igQ = seg(p, 0.66, 0.75), results = seg(p, 0.76, 0.88);
  const done = seg(p, 0.88, 0.92);
  const tap = TAPS.filter((t) => p > t.at - 0.05).pop();
  const pressing = tap && p > tap.at - 0.012 && p < tap.at + 0.018;
  const spotOn = spot * (1 - ig);

  return (
    <section className="demo" id="demo" ref={ref}>
      <div className="demo-stage">
        <div className="demo-sting" style={{ transform: `translate(-50%,-50%) scale(${1 - ease(sting) * 0.7})`, opacity: 1 - sting }} aria-hidden>
          <img src="/thumb.png" alt="" />
        </div>
        <div className="demo-head" style={{ opacity: enter, transform: `translateY(${(1 - enter) * 20}px)` }}>
          <span className="eyebrow light">Scroll to run it</span>
        </div>
        <div className="demo-grid">
          <div className="term" style={{ opacity: enter, transform: `translateX(${(1 - enter) * -60}px)` }}>
            <div className="term-bar"><i /><i /><i /><span>Claude Code · thumb-mcp</span></div>
            <div className="term-body">
              <div className="term-ask"><b className="chev">›</b> {type(PROMPT, prompt)}{prompt < 1 && <b className="caret dark" />}</div>
              <ToolLine show={call1} name="open_app" args={`"instagram"`} time="2.1s" done={ig > 0.5} />
              <ToolLine show={call2} name="search_in_app" args={`"instagram", "latte art"`} time="3.4s" done={results > 0.9} />
              <div className="term-done" style={{ opacity: done, transform: `translateY(${(1 - done) * 8}px)` }}>
                <b>⏺</b> Instagram is open on your iPhone, searching <em>latte art</em>. The top result is a rosetta from @slowbar.
              </div>
            </div>
          </div>
          <div className="demo-phone" style={{ opacity: enter, transform: `translateY(${(1 - enter) * 80}px) rotate(${(1 - enter) * 4}deg)` }}>
            <Phone>
              <HomeScreen dim={spotOn} />
              <Spotlight show={spotOn} query={type("insta", spotQ)} hit={hit * (1 - ig)} />
              <Instagram show={ig} search={search} query={type("latte art", igQ)} results={results} />
              {tap && (
                <span className={`tap${pressing ? " press" : ""}`} style={{ left: `${tap.x}%`, top: `${tap.y}%`, opacity: p > 0.92 ? 0 : 1 }}>
                  <img src="/thumb.png" alt="" /><i />
                </span>
              )}
            </Phone>
          </div>
        </div>
        <div className="demo-bar" aria-hidden><i style={{ transform: `scaleX(${p})` }} /></div>
      </div>
    </section>
  );
};

const ToolLine: React.FC<{ show: number; name: string; args: string; time: string; done: boolean }> = ({ show, name, args, time, done }) => (
  <div className="term-tool" style={{ opacity: show, transform: `translateY(${(1 - show) * 8}px)` }}>
    <b className={done ? "ok" : "run"}>{done ? "✓" : "⏺"}</b>
    <span className="tool-ns">thumb</span>
    <span className="tool-call">{name}(<em>{args}</em>)</span>
    {done && <span className="tool-time">{time}</span>}
  </div>
);
