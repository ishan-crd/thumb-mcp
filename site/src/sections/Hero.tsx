import React, { useEffect, useRef, useState } from "react";
import { Command, GitHubIcon, REPO, Thumb, Wordmark } from "../ui";
import { reduced, useProgress } from "../motion";

export const Nav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 12);
    on(); addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <a className="nav-brand" href="#top" aria-label="thumb MCP">
        <img src="/thumb.png" alt="" className="nav-thumb" />
        <img src="/wordmark.png" alt="thumb" className="nav-word" />
      </a>
      <nav className="nav-links">
        <a href="#demo">Demo</a>
        <a href="#how">How it works</a>
        <a href="#tools">Tools</a>
        <a href="#setup">Setup</a>
      </nav>
      <a className="nav-gh" href={REPO} target="_blank" rel="noreferrer"><GitHubIcon size={16} /><span>GitHub</span></a>
    </header>
  );
};

/** The thumb arrives the way it does in the film: resolving out of big pixels. */
const PixelIn: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reduced()) { setDone(true); return; }
    const img = new Image();
    img.src = "/thumb.png";
    let raf = 0, t0 = 0;
    const steps = [5, 8, 12, 18, 28, 44, 70];
    img.onload = () => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      const small = document.createElement("canvas");
      const sctx = small.getContext("2d")!;
      c.width = img.width; c.height = img.height;
      const draw = (now: number) => {
        if (!t0) t0 = now;
        const i = Math.floor((now - t0 - 150) / 85);
        if (i >= steps.length) { setDone(true); return; }
        if (i >= 0) {
          const w = steps[i], h = Math.round((w * img.height) / img.width);
          small.width = w; small.height = h;
          sctx.clearRect(0, 0, w, h); sctx.drawImage(img, 0, 0, w, h);
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, w, h, 0, 0, c.width, c.height);
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    };
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`hero-thumb${done ? " done" : ""}`}>
      <canvas ref={canvas} className="hero-pixels" aria-hidden />
      <Thumb tapping={done} className="hero-real" />
    </div>
  );
};

export const Hero: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = Math.max(0, useProgress(ref, "pass") - 0.5) * 2; // 0 at rest, 1 once it has scrolled away
  return (
    <section className="hero" id="top" ref={ref}>
      <div className="hero-inner" style={{ transform: `translateY(${p * -60}px)`, opacity: 1 - p * 0.9 }}>
        <PixelIn />
        <Wordmark className="hero-word" />
        <h1 className="hero-title"><span className="rise" style={{ animationDelay: "900ms" }}>Give</span> <span className="rise dim" style={{ animationDelay: "980ms" }}>Claude</span> <span className="rise" style={{ animationDelay: "1060ms" }}>a</span> <span className="rise" style={{ animationDelay: "1140ms" }}>thumb.</span></h1>
        <p className="hero-sub rise" style={{ animationDelay: "1250ms" }}>The open-source iPhone MCP. Claude taps, types, scrolls and runs whole flows on your real phone, from the terminal.</p>
        <div className="rise" style={{ animationDelay: "1380ms" }}><Command /></div>
        <p className="hero-meta rise" style={{ animationDelay: "1500ms" }}>
          <span>macOS 15+</span><i /><span>Apple silicon</span><i /><span>iOS 18+</span><i /><a href={REPO} target="_blank" rel="noreferrer">MIT, on GitHub</a>
        </p>
      </div>
      <a className="scroll-hint" href="#ask" aria-label="Scroll"><span /></a>
    </section>
  );
};
