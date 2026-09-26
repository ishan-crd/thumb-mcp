import React, { useState } from "react";
import { Code, Command, GitHubIcon, INSTALL, REPO, Thumb, Wordmark, Words } from "../ui";

const FLOWS: [string, string][] = [
  ["describe_screen()", "Every text element on screen, with tap coordinates. Text-only by default, far cheaper than an image."],
  ["tap_text(\"Wallet\")", "Tap on-screen text by name. No coordinates, survives layout changes."],
  ["open_app(\"insta\")", "Home → Spotlight → type → launch the top hit. Aliases resolve."],
  ["search_in_app(app, query)", "Open an app and search inside it, in one call."],
  ["send_message(to, text)", "iMessage. Resolves a real contact, drafts by default, returns a screenshot."],
  ["send_whatsapp(to, text)", "WhatsApp, same shape. Picks the right row when names collide."],
  ["confirm_send()", "Press Send on the draft on screen, verify, retry if the tap missed."],
  ["open_expo_app()", "Run your Expo dev-server project on the phone, via the Mac's LAN address."],
  ["scroll_to(\"General\")", "Scroll until the text appears, and optionally tap it."],
  ["wait_for_text(\"Done\")", "Wait for text to appear or disappear, even on screens that never go still."],
  ["open_url(url)", "Open a URL or deep link (exp://, maps://), verified."],
  ["explore_app(\"Settings\")", "Walk an app breadth-first and return a map of its screens."],
];
const PRIMS: [string, string][] = [
  ["screenshot()", "The mirrored screen, plus the coordinate space to use."],
  ["tap(x, y) · double_tap · long_press", "Taps at a device point."],
  ["swipe(x1, y1, x2, y2)", "A flick, kept under iOS's long-press threshold."],
  ["drag(x1, y1, x2, y2)", "Pick up, move, drop."],
  ["type_text(text) · press_key(key)", "Unicode and emoji, return, delete, arrows."],
  ["home() · app_switcher() · spotlight()", "Driven through the app's real menu items, verified."],
  ["go_back() · go_to_root()", "The back chevron once, or all the way to the root."],
  ["wait_until_settled()", "Poll until the screen stops animating."],
  ["device_info()", "Geometry, permissions, host app, streaming state."],
  ["reconnect()", "Resume after the phone was picked up."],
  ["start_recording() · run_skill(name)", "Record a flow by hand, replay it by name."],
  ["survey_home() · get_orientation()", "Every Home Screen page, in one call."],
];

export const Tools: React.FC = () => {
  const [tab, setTab] = useState<"flows" | "prims">("flows");
  const list = tab === "flows" ? FLOWS : PRIMS;
  return (
    <section className="tools" id="tools">
      <div className="section-head">
        <span className="eyebrow" data-reveal>Tools</span>
        <Words text="One call, a whole flow." className="h2" dim={["whole", "flow."]} />
        <p className="lede" data-reveal>Composite flows run a known-good sequence and return the settled screen, so Claude isn't screenshotting between every tap. The primitives are there when it needs them.</p>
        <div className="tabs" role="tablist" data-reveal>
          <button role="tab" aria-selected={tab === "flows"} className={tab === "flows" ? "on" : ""} onClick={() => setTab("flows")}>Composite flows</button>
          <button role="tab" aria-selected={tab === "prims"} className={tab === "prims" ? "on" : ""} onClick={() => setTab("prims")}>Primitives</button>
        </div>
      </div>
      <div className="tool-grid" key={tab}>
        {list.map(([name, body], i) => (
          <div key={name} className="tool" style={{ animationDelay: `${i * 35}ms` }}>
            <code>{name}</code>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <p className="tools-apps" data-reveal>Built-in layouts for Messages, WhatsApp, Instagram, X, Threads, YouTube, Spotify, Maps and the App Store. Other apps fall back to a generic layout.</p>
    </section>
  );
};

const DESKTOP = `{
  "mcpServers": {
    "thumb": {
      "command": "uvx",
      "args": ["thumb-mcp"]
    }
  }
}`;
const CLIENTS = {
  code: { label: "Claude Code", body: <><p>One command, remembered per machine.</p><Code code={INSTALL} lang="terminal" /></> },
  desktop: { label: "Claude Desktop", body: <><p>Settings › Developer › Edit Config, then restart Claude Desktop.</p><Code code={DESKTOP} lang="claude_desktop_config.json" /></> },
  other: { label: "Cursor & others", body: <><p>Any MCP client takes the same command and args. The server speaks plain stdio MCP.</p><Code code={`command: uvx\nargs:    ["thumb-mcp"]`} copy="uvx thumb-mcp" lang="stdio" /></> },
};

export const Setup: React.FC = () => {
  const [client, setClient] = useState<keyof typeof CLIENTS>("code");
  return (
    <section className="setup" id="setup">
      <div className="section-head">
        <span className="eyebrow" data-reveal>Setup</span>
        <Words text="Three minutes, once." className="h2" dim={["once."]} />
      </div>
      <ol className="steps">
        <li className="step" data-reveal>
          <span className="step-n">1</span>
          <div>
            <h3>Have the basics</h3>
            <p>A Mac on macOS 15 or later with Apple silicon, an iPhone on iOS 18 or later, both on the same Apple Account, and iPhone Mirroring connected by hand once. You'll also need <a href="https://docs.astral.sh/uv/" target="_blank" rel="noreferrer">uv</a>:</p>
            <Code code="curl -LsSf https://astral.sh/uv/install.sh | sh" lang="terminal" />
          </div>
        </li>
        <li className="step" data-reveal>
          <span className="step-n">2</span>
          <div>
            <h3>Connect it to Claude</h3>
            <div className="tabs small" role="tablist">
              {(Object.keys(CLIENTS) as (keyof typeof CLIENTS)[]).map((k) => (
                <button key={k} role="tab" aria-selected={client === k} className={client === k ? "on" : ""} onClick={() => setClient(k)}>{CLIENTS[k].label}</button>
              ))}
            </div>
            <div className="client" key={client}>{CLIENTS[client].body}</div>
          </div>
        </li>
        <li className="step" data-reveal>
          <span className="step-n">3</span>
          <div>
            <h3>Grant two permissions</h3>
            <p>To the app that runs Claude (Terminal, iTerm, Claude Desktop, Cursor), then quit and reopen it.</p>
            <div className="perms">
              <div><b>Screen Recording</b><span>so it can see the mirrored screen</span></div>
              <div><b>Accessibility</b><span>so its taps and keystrokes land</span></div>
            </div>
          </div>
        </li>
        <li className="step" data-reveal>
          <span className="step-n">4</span>
          <div>
            <h3>Lock the phone, put it down, ask</h3>
            <p>Mirroring stops the moment you pick the phone up. Leave the window visible, then try:</p>
            <div className="asks">
              {["take a screenshot of my iPhone", "open Settings and scroll to General", "text Rohit “on my way”, draft only"].map((a) => <span key={a}>{a}</span>)}
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
};

/** the film's end card */
export const Outro: React.FC = () => (
  <section className="outro">
    <div data-reveal="scale"><Thumb tapping className="outro-thumb" /></div>
    <div data-reveal style={{ ["--d" as string]: "100ms" }}><Wordmark className="outro-word" /></div>
    <Words text="Give Claude a thumb." className="h2 outro-title" dim={["Claude"]} delay={200} />
    <div data-reveal style={{ ["--d" as string]: "450ms" }}><Command /></div>
    <a className="outro-gh" href={REPO} target="_blank" rel="noreferrer" data-reveal style={{ ["--d" as string]: "550ms" }}><GitHubIcon size={15} /> github.com/ishan-crd/thumb-mcp</a>
  </section>
);

export const Footer: React.FC = () => (
  <footer className="footer">
    <div className="footer-brand"><img src="/thumb.png" alt="" /><span>thumb MCP</span></div>
    <nav>
      <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
      <a href={`${REPO}#10-troubleshooting`} target="_blank" rel="noreferrer">Troubleshooting</a>
      <a href={`${REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">Contribute</a>
      <a href="https://studio.insyd.in" target="_blank" rel="noreferrer">Studio by Insyd</a>
    </nav>
    <p>MIT licensed. Not affiliated with Apple or Anthropic. iPhone Mirroring isn't available in every region.</p>
  </footer>
);
