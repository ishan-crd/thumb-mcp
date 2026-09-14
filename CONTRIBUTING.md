# Contributing to thumb

Thanks for helping. thumb drives a real phone through a real mirroring window, so the bar is: **every
change must be verified against the screen, never assumed** — most of the bugs in this project's history
were tools that reported success while doing nothing.

## Setup

```bash
git clone https://github.com/ishan-crd/thumb-mcp && cd thumb-mcp
uv sync --dev
uv run pytest            # pure-logic suite, ~1 s, no phone needed
```

To try your change against a phone, pair iPhone Mirroring once by hand, grant Screen Recording and
Accessibility to your terminal app (see the README), then:

```bash
uv run python -c "import thumb.server as s; print(s.device_info())"
claude mcp add thumb-dev -- uv --directory "$PWD" run thumb-mcp     # or point any MCP client at it
```

## Where things live

| Path | What |
|---|---|
| `src/thumb/server.py` | MCP tools — thin wrappers, docstrings are what the model reads |
| `src/thumb/flows.py` | Step sequences behind composite tools (`open_app`, `send_message`, …) |
| `src/thumb/landmarks.py` | Screen positions and per-app layouts as **fractions of the screen** (`APP_PROFILES`) |
| `src/thumb/drafts.py` | Flows that work partially and are deliberately *not* registered as tools |
| `tests/` | Pure-logic tests; nothing here needs a device |

## Good first contributions

- **An app profile.** One line in `APP_PROFILES`: `AppProfile("Spotify", search_tab=(2, 3), aliases=("spot",))`.
  Include which iPhone/iOS you verified it on.
- **A flow.** A function in `flows.py` taking `session` first and returning `(report, image)`, plus a
  `@server.tool` wrapper in `server.py`. Coordinates as screen fractions; verify every screen change
  with `settle()` / `assert_changed()`.
- **A regression test** for anything that bit you.
- **Docs** — especially permission and setup snags on other macOS/iOS versions.

## Pull requests

- Keep one change per PR. Small PRs get reviewed the same day; large ones sit.
- Run `uv run pytest` before pushing; CI runs it on macOS for Python 3.11 and 3.13 and checks the
  server still registers its tools.
- If the change touches phone behaviour, put a short **"Verified on"** line in the description
  (Mac + macOS version, iPhone model + iOS version, the app) and what you saw on screen. A screenshot or
  clip helps.
- Never add a tool that can spend money, delete data or send messages without a `send=False`-style
  draft step and a verification screenshot. `send_message` is the reference.
- Match the code style around you: type hints, small functions, comments that say *why*, not what.
- Commit messages: imperative, ≤ 72-char subject, `feat:` / `fix:` / `test:` / `docs:` prefix, body
  explaining what was silently wrong before if that's the story.

## Reporting bugs

Open an issue with the output of `device_info()`, macOS + iOS versions, the tool you called, and what
the mirroring window showed. The issue template asks for exactly this.

## Releases

Maintainers cut releases by tagging `vX.Y.Z`; the `release` workflow runs the tests, builds, and publishes
to PyPI via trusted publishing.
