// Scroll motion: reveals (IntersectionObserver adds .in to [data-reveal]) and scroll progress hooks.
import { useEffect, useRef, useState, type RefObject } from "react";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** 0..1 of `p` between `a` and `b` */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const ease = (t: number) => 1 - (1 - t) ** 3;
export const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Watch every [data-reveal] in the page (including ones mounted later) and mark it .in once it's on screen. */
export function useReveals() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    const seen = new WeakSet<Element>();
    const scan = () => document.querySelectorAll("[data-reveal]").forEach((el) => { if (!seen.has(el)) { seen.add(el); io.observe(el); } });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

/**
 * Scroll progress of a section.
 *   "sticky": 0 when its top reaches the top of the viewport, 1 when its bottom reaches the bottom
 *             (for a tall section with a sticky stage inside)
 *   "pass":   0 when its top enters from below, 1 when its bottom leaves at the top
 */
export function useProgress(ref: RefObject<HTMLElement>, mode: "sticky" | "pass" = "sticky") {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const v = mode === "sticky" ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (r.height + vh);
      setP(clamp(v));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [ref, mode]);
  return p;
}

/** true while the element is (at least partly) on screen */
export function useInView<T extends HTMLElement>(margin = "0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}
