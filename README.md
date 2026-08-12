# iphone-mirror-mcp

An MCP server that lets Claude see and control a physical iPhone through the
macOS **iPhone Mirroring** app. Claude gets a screenshot tool plus tap, swipe,
typing, and the Home / App Switcher / Spotlight commands.

No jailbreak, no developer profile, no WebDriverAgent — it drives the same
mirroring window you already use by hand.

---

## Requirements

| | |
|---|---|
| macOS | 15 (Sequoia) or later, on Apple silicon |
| iOS | 18 or later |
| Setup | Mac and iPhone signed into the **same Apple Account**, Bluetooth + Wi-Fi on, iPhone Mirroring already paired and working manually once |
| Python | 3.11+ (managed by `uv`) |

iPhone Mirroring is not available in every region. If the app is missing or
refuses to connect, that is an Apple-side restriction, not this server.

---

## Install

```bash
git clone <this-repo> && cd screenmirrormcp
uv sync
```

Verify everything before wiring it into Claude:

```bash
uv run python -c "import iphone_mirror_mcp.server as s; print(s.device_info())"
```

That prints permissions, window geometry, the detected coordinate space, and
whether the phone is currently streaming. Fix anything it reports before
continuing.

---

## Permissions — read this part

macOS grants screen and input permissions to the **application that launches the
server**, not to Python. If you run this from Claude Desktop, *Claude Desktop*
needs the grants. From a terminal, that terminal app does. From Claude Code in
iTerm, *iTerm* does.

`device_info()` prints the exact host process it detected, so you don't have to
guess.

Grant both:

1. **Screen Recording** — required to capture the mirrored screen.
   `System Settings › Privacy & Security › Screen & System Audio Recording`
   Add the host app with **+** if it isn't listed, enable the toggle, then
   **fully quit and reopen that app**. macOS only applies a new Screen Recording
   grant on relaunch.

2. **Accessibility** — required to send taps, swipes, and keystrokes.
   `System Settings › Privacy & Security › Accessibility`
   Add the host app, enable the toggle, restart it.

Without Screen Recording, capture returns blank frames. Without Accessibility,
input is silently dropped. The server checks both up front and fails with the
pane name rather than misbehaving quietly.

---

## Wiring it into Claude

**Claude Code**

```bash
claude mcp add iphone-mirror -- uv --directory /absolute/path/to/screenmirrormcp run iphone-mirror-mcp
```

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iphone-mirror": {
      "command": "uv",
      "args": [
        "--directory", "/absolute/path/to/screenmirrormcp",
        "run", "iphone-mirror-mcp"
      ]
    }
  }
}
```

Use an absolute path, and `which uv` if `uv` isn't found (GUI apps don't inherit
your shell `PATH`).

---

## Tools

### Composite flows — prefer these

Each is one call that runs a known-good sequence and returns the **settled**
screen. They exist because driving a phone one primitive at a time is slow and
error-prone: every tap needs a screenshot to aim it, and every screenshot is a
round trip.

| Tool | What it does |
|---|---|
| `search_in_app(app, query)` | **Open an app and search inside it in one call** — Home → Spotlight → launch → Search tab → search field → type. No intermediate screenshots |
| `open_app(name)` | Home → Spotlight → type → launch top hit. One call, ~6s |
| `tap_and_type(x, y, text)` | Focus a field and type, waiting for focus first |
| `survey_home(max_pages=4)` | Pages across the Home Screen, returning **one screenshot per page in a single call**. Stops early at the last page |
| `scroll(direction, amount=0.6)` | Scroll `down`/`up`/`left`/`right` by a fraction of the screen |
| `go_back()` | Left-edge back swipe |
| `control_center()` / `notifications()` | Pull down from the top-right / top-left |

`open_app` uses Spotlight rather than hunting for an icon: it's one deterministic
path no matter which page the app lives on, needs no pixel search, and Return
launches the top hit directly. Use `survey_home()` when you actually need to see
the layout — it replaces a swipe-and-screenshot loop with a single call.

### Primitives

| Tool | What it does |
|---|---|
| `screenshot()` | The mirrored screen, plus the coordinate space to use |
| `tap(x, y)` | Tap at a device point |
| `swipe(x1, y1, x2, y2, duration_ms=300)` | Drag between two device points |
| `type_text(text)` | Type into the focused field (unicode + emoji) |
| `press_key(key)` | `return`, `delete`, `escape`, `tab`, `space`, arrows |
| `home()` / `app_switcher()` / `spotlight()` | Driven via the app's real menu items |
| `wait_until_settled(timeout_s=5)` | Poll until the screen stops animating |
| `device_info()` | Geometry, permissions, streaming state — for debugging |
| `reconnect()` | Press Connect/Resume to resume a paused session |

Composite flows already settle internally, so `wait_until_settled()` is only
needed after a raw `tap`/`swipe`.

### Adding a shortcut

The shortcut system is split so that adding one rarely means writing flow logic:

| File | Holds | Edit it when |
|---|---|---|
| `landmarks.py` | Positions and per-app layouts, as **screen fractions** | Adding app support or a new UI position |
| `flows.py` | The step sequences | Adding a genuinely new behaviour |
| `server.py` | Thin MCP tool wrappers | Exposing a flow as a tool |

**To support a new app**, add one entry to `APP_PROFILES` in `landmarks.py` —
no other file changes:

```python
AppProfile("Spotify", search_tab=(2, 3), aliases=("spot",))
```

`search_tab` is `(slot, total_slots)` in the bottom tab bar; `aliases` are the
other names a user might say, so "open insta" resolves to Instagram. Unknown
apps fall back to the generic layout rather than failing.

**To add a new flow**, write a function in `flows.py` taking `session` first and
returning `(report, image)`, then register a wrapper in `server.py`.

Two rules keep flows reliable:

* Coordinates are **fractions of the screen**, never absolute points, so a
  shortcut works on every iPhone size.
* **Verify anything that changes the screen.** Menu commands and taps both
  no-op silently; a flow that assumes success ends up typing into the wrong
  screen. Use `settle()` and compare frames (`_changed_since`) rather than
  trusting a step worked.

### Coordinates

All coordinates are **device points**, origin at the top-left of the phone
screen — never Mac screen coordinates, and never pixels of the returned image.
`screenshot()` states the space every time (e.g. `393 x 852`).

The returned image is downscaled to keep token cost sane, so image pixels and
device points are deliberately *not* 1:1. Use the numbers `screenshot()` reports.

Internally each call re-reads the window bounds, re-derives where the device
screen sits inside the window, and maps device points through that to global
screen coordinates. Nothing about the transform is cached, so moving, zooming,
or re-docking the window mid-session is safe.

---

## Constraints worth knowing

**Mirroring stops the moment you pick up the phone.** This is Apple's design,
not a bug. The window switches to an "iPhone in Use" screen and streaming ends.
The server detects this and returns an explicit error instead of tapping into a
dialog. Lock the iPhone, put it down, and call `reconnect()`.

**The mirroring window must be visible and unobscured.** Input is delivered
through the system HID event stream (see below), so events land on whatever is
at that screen location. Every input call activates the mirroring app first,
which raises its window. Don't cover it mid-run.

**Input steals focus and moves the cursor.** Activating the mirroring app takes
foreground focus from whatever you were doing, and the pointer is borrowed for
the gesture. The cursor is restored to where it was afterwards, but focus is
not. This is not a good fit for running in the background while you work.

**The phone is real.** Taps land on a real device with real accounts. Swipes
that start on a Home Screen icon can rearrange apps if they run long — the
implementation guards against this (below), and the composite gestures all start
from safe empty bands, which is another reason to prefer them over raw `swipe`.

---

## Implementation notes — things that are silently wrong if done the obvious way

**Typing must press real keycodes.** The tidy way to type is one event with
keycode 0 carrying a unicode payload via `CGEventKeyboardSetUnicodeString`.
iPhone Mirroring relays the *keycode* to the phone and drops the unicode string
— and keycode 0 is the physical `A` key, so every character arrives as `a`, and
the repeats trip iOS's press-and-hold accent picker. Characters are mapped to
US-ANSI keycodes with Shift where needed; only characters with no key (emoji,
accents) fall back to the unicode path.

**Modifier flags must be set explicitly, including to zero.** A synthesised key
event otherwise inherits the live modifier state, so a Command flag left over
from an earlier shortcut rides along on ordinary letters. Typing "instagra**m**"
then delivers Cmd-M and minimises the mirroring window mid-run.

**Menu commands need verifying.** `View > Spotlight` pressed straight after
`Home` frequently no-ops while the Home Screen is still animating. Unverified,
the caller then types into the Home Screen, which silently does nothing and
leaves the previous query in the field. `open_spotlight()` checks the screen
actually changed and falls back to Cmd-3, then to the swipe-down gesture.

**Fields are cleared with backspace, not Cmd-A.** iOS does not honour the
synthesised Command flag for select-all, so Cmd-A arrives as a literal `a`.

## Two more implementation notes

**Input goes through the HID tap, not `CGEventPostToPid`.** Posting events to
the mirroring process directly is tidier — it doesn't touch the real cursor —
but iPhone Mirroring **ignores those events entirely**. Measured against a live
session, an identical down/up pair produced a frame delta of `0.007` (nothing
happened) via `CGEventPostToPid` versus `100.18` (the tapped app launched) via
`CGEventPost(kCGHIDEventTap)`. Apple's client only honours HID-stream events.
Set `IPHONE_MIRROR_EVENT_TARGET=pid` to force the per-process path if a future
macOS release starts honouring it.

**Swipes are driven off the wall clock.** A naive `sleep(duration/steps)` loop
overshoots badly, because posting each event costs real time — a requested 350ms
gesture measured 485ms. Overshooting past iOS's ~500ms long-press threshold
turns a Home Screen swipe into an icon *drag*, which silently rearranges apps
and can merge them into folders. Gestures now track elapsed time and land within
about 1% of the requested duration.

---

## Tuning

| Variable | Default | Purpose |
|---|---|---|
| `IPHONE_MIRROR_MAX_EDGE` | `1024` | Max long edge (px) of returned screenshots |
| `IPHONE_MIRROR_DEVICE_SIZE` | auto | Override the coordinate space, e.g. `393x852` |
| `IPHONE_MIRROR_TAP_HOLD_MS` | `80` | Mouse-down hold for a tap |
| `IPHONE_MIRROR_KEY_DELAY_MS` | `12` | Delay between typed characters |
| `IPHONE_MIRROR_ACTIVATE_DELAY_MS` | `150` | Wait after fronting the app before input |
| `IPHONE_MIRROR_EVENT_TARGET` | `hid` | `hid` or `pid` (see above) |

The device model is inferred from the mirrored screen's aspect ratio. Because
the same nominal size is used both to describe the screenshot and to map taps,
a near-miss on the exact model is harmless — taps still land where they were
aimed. Set `IPHONE_MIRROR_DEVICE_SIZE` if you want an exact label.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "iPhone Mirroring app is not running" | Launch it and connect once by hand |
| "showing its setup / Welcome screen" | Not paired yet — the first handshake needs the phone and can't be automated |
| "not streaming ... iPhone in Use" | Phone was picked up. Lock it, set it down, `reconnect()` |
| "window exists but is off-screen" | Un-minimise it / bring it to the current Space. The server tries to wake it automatically |
| Blank or black screenshots | Screen Recording not granted to the **host** app, or granted but not relaunched |
| Taps do nothing | Accessibility not granted to the **host** app |
| Taps land in the wrong place | Something is covering the mirroring window |

---

## License

MIT
# thumb-mcp
