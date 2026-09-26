// A drawn iPhone and the screens thumb walks through in the demo.
import React from "react";

export const Phone: React.FC<{ children: React.ReactNode; className?: string; time?: string }> = ({ children, className, time = "9:41" }) => (
  <div className={`phone ${className ?? ""}`}>
    <div className="phone-screen">
      <div className="phone-status"><span>{time}</span><span className="phone-island" /><span className="phone-icons"><i /><i /><i /></span></div>
      {children}
      <div className="phone-home" />
    </div>
  </div>
);

const APPS: [string, string][] = [
  ["Messages", "linear-gradient(#6BE37C,#2BC24A)"], ["Calendar", "#fff"], ["Photos", "conic-gradient(#F9C84A,#F46B45,#E03C8A,#7B5BE8,#3AA0F0,#4CD06C,#F9C84A)"], ["Camera", "linear-gradient(#D7D7DC,#A9A9B0)"],
  ["Mail", "linear-gradient(#5AC0FF,#1774F0)"], ["Clock", "#16151A"], ["Maps", "linear-gradient(135deg,#7ED67A 0 45%,#F4F2ED 45% 55%,#5CB8F0 55%)"], ["Weather", "linear-gradient(#4AA7F8,#1D6FE0)"],
  ["Notes", "linear-gradient(#FFE27A 0 30%,#FFFDF5 30%)"], ["Instagram", "radial-gradient(circle at 30% 110%,#FFD86B,#F76A3A 35%,#D72D8A 60%,#7A35D6)"], ["WhatsApp", "linear-gradient(#5CEB7C,#1FB84A)"], ["Settings", "linear-gradient(#B8B8BE,#7E7E86)"],
  ["Spotify", "#16151A"], ["App Store", "linear-gradient(#3BB5FF,#1A6CF0)"], ["Wallet", "#16151A"], ["Music", "linear-gradient(#FF6B81,#F2344E)"],
];

export const HomeScreen: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <div className="scr scr-home" style={{ filter: `blur(${dim * 10}px)`, transform: `scale(${1 + dim * 0.04})` }}>
    <div className="apps">
      {APPS.map(([name, bg]) => (
        <div key={name} className="icon"><i style={{ background: bg }} data-app={name} /><span>{name}</span></div>
      ))}
    </div>
    <div className="dock">{["linear-gradient(#6BE37C,#2BC24A)", "linear-gradient(#5AC0FF,#1774F0)", "linear-gradient(#FF6B81,#F2344E)", "linear-gradient(#ECECF0,#C8C8D0)"].map((bg, i) => <i key={i} style={{ background: bg }} />)}</div>
  </div>
);

export const Spotlight: React.FC<{ query: string; show: number; hit: number }> = ({ query, show, hit }) => (
  <div className="scr scr-spot" style={{ opacity: show, transform: `translateY(${(1 - show) * 24}px)` }}>
    <div className="spot-field"><SearchGlyph /><span>{query}<b className="caret" /></span></div>
    <div className="spot-hit" style={{ opacity: hit, transform: `scale(${0.96 + hit * 0.04})` }}>
      <span className="spot-label">Top Hit</span>
      <div className="spot-row"><i style={{ background: APPS[9][1] }} /><div><b>Instagram</b><small>Open</small></div></div>
    </div>
  </div>
);

export const Instagram: React.FC<{ show: number; search: number; query: string; results: number }> = ({ show, search, query, results }) => (
  <div className="scr scr-ig" style={{ opacity: show, transform: `scale(${0.94 + show * 0.06})` }}>
    <div className="ig-top"><b>Instagram</b><span className="ig-icons"><i /><i /></span></div>
    <div className="ig-feed" style={{ opacity: 1 - search }}>
      <div className="ig-stories">{[0, 1, 2, 3, 4].map((i) => <i key={i} />)}</div>
      <div className="ig-post"><div className="ig-author"><i /><span /></div><div className="ig-photo" /></div>
    </div>
    <div className="ig-search" style={{ opacity: search, transform: `translateY(${(1 - search) * 16}px)` }}>
      <div className="ig-field"><SearchGlyph /><span>{query}{search > 0.5 && results < 0.1 && <b className="caret" />}</span></div>
      <div className="ig-grid">
        {LATTES.map((l, i) => (
          <i key={i} className="latte" style={{ background: l, opacity: seg01(results * 9 - i), transform: `scale(${0.8 + 0.2 * seg01(results * 9 - i)})` }} />
        ))}
      </div>
    </div>
    <div className="ig-tabs">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i === 1 && search > 0.3 ? "on" : ""} />)}</div>
  </div>
);
const seg01 = (v: number) => Math.min(1, Math.max(0, v));

// latte art, drawn: cream rosettas / hearts on espresso
const LATTES = [
  "radial-gradient(circle at 50% 46%,#FBEBD3 0 14%,#B5774C 15% 20%,#F6DFC0 21% 30%,#8A5433 31% 58%,#4E2E1D 59%)",
  "radial-gradient(ellipse 30% 36% at 50% 52%,#FBEBD3 0 60%,transparent 61%),radial-gradient(circle,#9C6440 0 56%,#523020 57%)",
  "radial-gradient(circle at 50% 70%,#FBEBD3 0 10%,transparent 11%),radial-gradient(ellipse 34% 20% at 50% 50%,#F7E1C4 0 70%,transparent 71%),radial-gradient(ellipse 28% 16% at 50% 32%,#F7E1C4 0 70%,transparent 71%),radial-gradient(circle,#A06843 0 56%,#4B2C1C 57%)",
  "radial-gradient(circle at 50% 50%,#F4DDBD 0 22%,#955E3B 23% 30%,#F4DDBD 31% 36%,#7E4B2E 37% 58%,#3F2518 59%)",
  "radial-gradient(ellipse 22% 30% at 42% 46%,#FBEBD3 0 70%,transparent 71%),radial-gradient(ellipse 22% 30% at 58% 46%,#FBEBD3 0 70%,transparent 71%),radial-gradient(circle,#A56C45 0 56%,#55331F 57%)",
  "radial-gradient(circle at 50% 50%,#FBEBD3 0 8%,#B07A52 9% 14%,#FBEBD3 15% 22%,#8C5634 23% 57%,#E9E3D8 58%)",
  "radial-gradient(ellipse 36% 26% at 50% 56%,#F8E4C8 0 60%,transparent 61%),radial-gradient(circle,#8F5A38 0 56%,#2E1B11 57%)",
  "radial-gradient(circle at 50% 50%,#EED3AE 0 30%,#A06843 31% 58%,#C9BFB0 59%)",
  "radial-gradient(ellipse 18% 34% at 50% 50%,#FBEBD3 0 65%,transparent 66%),radial-gradient(circle,#99613D 0 56%,#442819 57%)",
];

const SearchGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><circle cx="5" cy="5" r="3.6" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M7.8 7.8L10.6 10.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
);
