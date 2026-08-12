"""Shortcuts -- the behaviour half of the shortcut system.

Driving a phone one primitive at a time is slow and error-prone: every tap needs
a screenshot to aim it, every screenshot is a round trip, and a mis-aimed tap
costs several more. But most real intents ("open Instagram", "search for X",
"scroll down") have a *known-good* sequence that never needs to look at pixels.

Each flow here encodes one such sequence end to end and returns a single settled
screenshot, so the caller sees one image instead of five.

Layout constants live in :mod:`landmarks`; this module holds only the steps.

Adding a new shortcut
---------------------
1. If it needs a new position, add it to ``landmarks`` (as a screen fraction).
2. Write a function here taking ``session`` first and returning
   ``(report, image)`` -- use :func:`settle` so it returns a stable frame.
3. Register a thin tool wrapper in ``server`` with ``@_flow_tool``.

Anything that changes the screen must be *verified*, not assumed: menu commands
and taps both no-op silently, and a flow that carries on regardless ends up
typing into the wrong screen.
"""

from __future__ import annotations

import time

from PIL import Image as PILImage
from PIL import ImageStat

from . import ax, inputs, landmarks, mirror
from .errors import MirrorError

# A frame delta above this means the screen genuinely changed, not just noise
# from a cursor blink or a live-updating clock.
CHANGED = 3.0


# --------------------------------------------------------------------------
# Primitives shared by every flow
# --------------------------------------------------------------------------

def settle(
    session,
    timeout_s: float = 5.0,
    stable_for_s: float = 0.35,
    threshold: float = 1.2,
    poll_s: float = 0.09,
) -> tuple[str, PILImage.Image]:
    """Poll until the screen stops changing. Returns (summary, final frame)."""
    deadline = time.monotonic() + max(0.1, timeout_s)
    previous = session.frame().image
    stable_since: float | None = None
    polls = 1

    while time.monotonic() < deadline:
        time.sleep(poll_s)
        current = session.frame().image
        polls += 1
        difference = mirror.frame_difference(previous, current)
        previous = current
        now = time.monotonic()
        if difference <= threshold:
            if stable_since is None:
                stable_since = now
            elif now - stable_since >= stable_for_s:
                return f"settled after {polls} frames", current
        else:
            stable_since = None
    return f"still changing after {timeout_s:g}s ({polls} frames)", previous


def _changed_since(session, before: PILImage.Image, threshold: float = CHANGED) -> bool:
    return mirror.frame_difference(before, session.frame().image) > threshold


def tap_at(session, fx: float, fy: float):
    """Tap a point given as screen fractions."""
    frame = session.live_frame()
    inputs.tap(frame, frame.device_w * fx, frame.device_h * fy)
    return frame


def swipe_between(session, x1, y1, x2, y2, duration_ms: int = 280):
    """Swipe between two points given as screen fractions."""
    frame = session.live_frame()
    inputs.swipe(
        frame,
        frame.device_w * x1, frame.device_h * y1,
        frame.device_w * x2, frame.device_h * y2,
        duration_ms,
    )
    return frame


def clear_field(pid: int, max_chars: int = 30) -> None:
    """Empty a text field with repeated backspaces.

    Cmd-A is the obvious way and it does not work: iOS does not honour the
    synthesised Command flag here, so the event arrives as a literal "a".
    Backspace needs no modifier and is a no-op on an already-empty field.
    """
    inputs.press_key_repeat(pid, "delete", max_chars, delay_s=0.012)


def type_into(session, fx: float, fy: float, text: str, submit: bool = False):
    """Focus a field, wait for focus to land, clear it, then type.

    The settle between tapping and typing is load-bearing: a field that is still
    animating into focus silently swallows keystrokes and ends up focused but
    empty.
    """
    tap_at(session, fx, fy)
    settle(session, timeout_s=4.0, stable_for_s=0.3)
    pid = session.live_frame().window.pid
    clear_field(pid)
    inputs.type_text(pid, text)
    if submit:
        settle(session, timeout_s=3.0, stable_for_s=0.25)
        inputs.press_key(pid, "return")
    return settle(session, timeout_s=6.0, stable_for_s=0.4)


# --------------------------------------------------------------------------
# Verified navigation
# --------------------------------------------------------------------------

def go_home(session, pid: int) -> bool:
    """Go to the Home Screen. Already-home is indistinguishable and also fine."""
    before = session.frame().image
    ax.press_menu_item(pid, ax.MENU_HOME)
    settle(session, timeout_s=3.0)
    if not _changed_since(session, before):
        inputs.press_command_key(pid, "1")  # keyboard fallback
        settle(session, timeout_s=3.0)
    return True


def open_spotlight(session, pid: int) -> bool:
    """Open Spotlight, confirming it is actually on screen.

    The View > Spotlight menu item is not reliable -- pressed straight after
    Home it frequently no-ops while the Home Screen is still animating, and the
    caller then types into the Home Screen, which does nothing. So verify, and
    fall back to Cmd-3 and then to the swipe-down gesture.
    """
    for attempt in range(3):
        before = session.frame().image
        if attempt == 0:
            ax.press_menu_item(pid, ax.MENU_SPOTLIGHT)
        elif attempt == 1:
            inputs.press_command_key(pid, "3")
        else:
            swipe_between(session, 0.5, 0.30, 0.5, 0.72, duration_ms=280)
        settle(session, timeout_s=3.0, stable_for_s=0.4)
        if _changed_since(session, before):
            time.sleep(0.25)  # let the field take keyboard focus
            return True
    return False


# --------------------------------------------------------------------------
# Gestures
# --------------------------------------------------------------------------

SCROLL_VECTORS = {
    # Scrolling *down* (revealing content below) means dragging *up*.
    "down": lambda a: (0.5, 0.5 + a / 2, 0.5, 0.5 - a / 2),
    "up": lambda a: (0.5, 0.5 - a / 2, 0.5, 0.5 + a / 2),
    "left": lambda a: (0.5 + a / 2, 0.5, 0.5 - a / 2, 0.5),
    "right": lambda a: (0.5 - a / 2, 0.5, 0.5 + a / 2, 0.5),
}


def scroll(session, direction: str = "down", amount: float = 0.6):
    """Scroll the content area by a fraction of the screen."""
    key = direction.strip().lower()
    if key not in SCROLL_VECTORS:
        raise MirrorError(
            f"Unknown scroll direction {direction!r}. Use down, up, left, or right."
        )
    amount = max(0.05, min(0.85, amount))
    swipe_between(session, *SCROLL_VECTORS[key](amount), duration_ms=260)


def back(session):
    """Swipe in from the left edge to go back."""
    swipe_between(session, landmarks.EDGE_INSET, 0.5, 0.62, 0.5, duration_ms=300)


def control_center(session):
    swipe_between(session, 0.92, landmarks.EDGE_INSET, 0.92, 0.45, duration_ms=320)


def notifications(session):
    swipe_between(session, 0.25, landmarks.EDGE_INSET, 0.25, 0.55, duration_ms=320)


def home_page(session, direction: str = "next"):
    """Page between Home Screen pages, starting from empty space above the dock."""
    y = landmarks.HOME_EMPTY_BAND
    if direction == "next":
        swipe_between(session, 0.86, y, 0.14, y, duration_ms=260)
    else:
        swipe_between(session, 0.14, y, 0.86, y, duration_ms=260)


# --------------------------------------------------------------------------
# Composite shortcuts
# --------------------------------------------------------------------------

def open_app(session, name: str, timeout_s: float = 8.0):
    """Home -> Spotlight -> type -> launch the top hit.

    Spotlight beats hunting for an icon: one deterministic path regardless of
    which Home Screen page the app lives on, no pixel search, and Return opens
    the top hit directly.
    """
    app = landmarks.canonical_name(name)
    frame = session.live_frame()
    pid = frame.window.pid

    # Focus the window first: menu items fire even when it is not frontmost, so
    # the screen can change while keyboard focus is still on the user's editor,
    # and every keystroke we then send lands nowhere.
    inputs.focus(pid)

    go_home(session, pid)
    if not open_spotlight(session, pid):
        return (
            "Could not open Spotlight on the phone -- the View menu command, "
            "Cmd-3 and the swipe gesture all left the screen unchanged. Check "
            "that the iPhone Mirroring window is visible and connected.",
            session.frame().image,
        )

    blank = session.frame().image
    clear_field(pid)
    inputs.type_text(pid, app)
    settle(session, timeout_s=3.0, stable_for_s=0.3)
    results = session.frame().image

    # If the query never reached the field the results are unchanged, and Return
    # would launch whatever the *stale* query matched. Retry once with focus
    # re-asserted rather than acting on a screen we did not cause.
    if mirror.frame_difference(blank, results) < CHANGED:
        inputs.focus(pid)
        clear_field(pid)
        inputs.type_text(pid, app)
        settle(session, timeout_s=3.0, stable_for_s=0.3)
        results = session.frame().image
        if mirror.frame_difference(blank, results) < CHANGED:
            return (
                f"Could not type {app!r} into Spotlight -- keystrokes are not "
                "reaching the phone. Check the mirroring window is visible.",
                results,
            )

    inputs.press_key(pid, "return")
    # Cap the post-launch wait: media-heavy apps (an autoplaying feed) never go
    # fully still, and the app is usable long before the timeout expires.
    status, final = settle(session, timeout_s=min(timeout_s, 4.5), stable_for_s=0.35)

    launched = mirror.frame_difference(results, final) > 8
    report = (
        f"Opened {app!r} via Spotlight ({status})."
        if launched
        else f"Typed {app!r} into Spotlight and pressed Return, but the screen "
        f"barely changed ({status}) -- the app may not exist, or the top hit was "
        "not an app. Check the screenshot."
    )
    return report, final


def search_in_app(
    session,
    app: str,
    query: str,
    tab_index: int | None = None,
    tab_count: int | None = None,
):
    """Open an app, go to its Search tab, and run a query -- no screenshots.

    The whole path comes from the landmark table rather than from pixels. Only
    the final screen is captured, because that is the only frame worth showing.
    """
    profile, known = landmarks.profile_for(app)
    slot, count = profile.search_tab
    if tab_index is not None:
        slot = tab_index
    if tab_count is not None:
        count = tab_count

    report, image = open_app(session, app)
    if "Could not" in report:
        return report, image

    tap_at(session, *landmarks.nav_slot(slot, count))
    settle(session, timeout_s=4.0, stable_for_s=0.3)

    status, image = type_into(session, *profile.search_field, query)
    layout = "known layout" if known else "generic layout"
    return f"{report} Searched {query!r} in {profile.name} ({layout}, {status}).", image


def survey_home(session, max_pages: int = 4):
    """Page across the Home Screen, collecting one screenshot per page.

    Returns [(label, image)] so the caller sees the whole Home Screen in one
    round trip instead of a swipe-and-screenshot loop. Stops early once a page
    stops changing, i.e. the last page was already reached.
    """
    frame = session.live_frame()
    go_home(session, frame.window.pid)
    _, current = settle(session, timeout_s=4.0)

    pages: list[tuple[str, PILImage.Image]] = [("page 1", current)]
    for index in range(2, max(2, max_pages) + 1):
        home_page(session, "next")
        _, current = settle(session, timeout_s=4.0)
        if mirror.frame_difference(pages[-1][1], current) < 2.0:
            break
        pages.append((f"page {index}", current))
    return pages


# --------------------------------------------------------------------------
# Messages
# --------------------------------------------------------------------------
#
# Composed from small named steps rather than one long script, so each piece is
# testable and reusable: open_compose -> pick_contact -> draft_message ->
# send_message. Sending is deliberately opt-in; see send_message.

def _band_detail(image, top: float, bottom: float) -> float:
    """How much visual content a horizontal band holds (0 = flat empty space).

    Used instead of a before/after diff to decide whether a suggestion list
    appeared. A single matching row barely moves a whole-frame difference, so
    the differential test produced false "no matches"; asking whether the band
    contains *anything* is absolute and does not depend on what was there
    before.
    """
    height = image.height
    box = (0, int(height * top), image.width, int(height * bottom))
    return ImageStat.Stat(image.crop(box).convert("L")).stddev[0]


# Empty dark space measures well under 1; a single contact row is several times
# this. Set between the two.
BAND_HAS_CONTENT = 3.0


def wait_for_band(session, top, bottom, want_content: bool, timeout_s: float = 6.0):
    """Poll until a band is (or stops being) populated. Returns (ok, frame).

    Waiting for the *condition we actually care about* beats settling and hoping.
    Contact suggestions render noticeably after the keystrokes land, so a
    settle() returns on a stable-but-empty screen and the following tap hits
    nothing; this returns the moment the list appears, so it is both faster and
    not a race.
    """
    deadline = time.monotonic() + timeout_s
    image = session.frame().image
    while True:
        image = session.frame().image
        if (_band_detail(image, top, bottom) >= BAND_HAS_CONTENT) == want_content:
            return True, image
        if time.monotonic() >= deadline:
            return False, image
        time.sleep(0.1)


def open_compose(session):
    """Open Messages and bring up the New Message sheet."""
    report, image = open_app(session, "Messages")
    if "Could not" in report:
        return False, report, image
    # Messages paints its list progressively; the capped launch settle can
    # return while the screen is still blank.
    settle(session, timeout_s=4.0, stable_for_s=0.35)

    # iOS resumes an app wherever it was left -- often inside a conversation, or
    # on a half-filled compose sheet. Get back to the conversation list before
    # doing anything, or the compose tap lands in a conversation and the
    # recipient ends up typed into the message body.
    #
    # Neither Escape nor the left-edge back swipe reliably leaves a conversation
    # (the swipe simply does not register through mirroring), but the back
    # chevron does. That same spot is "Edit" on the conversation list, so tap it
    # and then press Escape: from a conversation we land on the list and Escape
    # is a no-op; from the list we open the Edit menu and Escape closes it.
    # Either way we end up on the list, without needing to know which we started
    # from.
    pid = session.live_frame().window.pid
    inputs.press_key(pid, "escape")
    settle(session, timeout_s=2.0, stable_for_s=0.2)
    tap_at(session, *landmarks.MSG_BACK_BUTTON)
    settle(session, timeout_s=2.5, stable_for_s=0.25)
    inputs.press_key(pid, "escape")
    settle(session, timeout_s=2.0, stable_for_s=0.2)

    before = session.frame().image
    tap_at(session, *landmarks.MSG_COMPOSE_BUTTON)
    _, image = settle(session, timeout_s=4.0)
    if not _changed_since(session, before):
        return False, "Tapped Compose but the New Message sheet never appeared.", image
    # The sheet animates in over the list; wait for it to actually be blank
    # rather than judging it mid-transition.
    top_band, bottom_band = landmarks.MSG_SUGGESTION_BAND
    _, image = wait_for_band(
        session, top_band, bottom_band, want_content=False, timeout_s=3.0
    )

    # A fresh New Message sheet is blank below the "To:" field. A conversation
    # view is full of bubbles. Distinguishing them matters enormously: in a
    # conversation, the "To:" tap does nothing and keyboard focus stays on the
    # message body, so the recipient name gets typed into the message itself.
    top, bottom = landmarks.MSG_SUGGESTION_BAND
    if _band_detail(image, top, bottom) >= BAND_HAS_CONTENT:
        return (
            False,
            "Expected a blank New Message sheet but the screen has content "
            "below the To: field -- Messages is probably showing a conversation, "
            "not the compose sheet. Aborting rather than typing into it.",
            image,
        )
    return True, "New Message sheet open.", image


def pick_contact(session, recipient: str):
    """Type a name into "To:" and select the first matching contact.

    Returns (ok, report, image). Fails loudly when nothing matches: Messages
    leaves the typed text sitting in the field as a raw address, and sending to
    that would go to the wrong place -- or nowhere.
    """
    top, bottom = landmarks.MSG_SUGGESTION_BAND
    if _band_detail(session.frame().image, top, bottom) >= BAND_HAS_CONTENT:
        return (
            False,
            "Not on a blank New Message sheet -- there is already content below "
            "the To: field. Refusing to type a recipient here, because it would "
            "go into the message body instead.",
            session.frame().image,
        )

    tap_at(session, *landmarks.MSG_TO_FIELD)
    settle(session, timeout_s=3.0, stable_for_s=0.25)
    pid = session.live_frame().window.pid
    clear_field(pid)
    inputs.type_text(pid, recipient)

    found, typed = wait_for_band(session, top, bottom, want_content=True, timeout_s=6.0)
    if not found:
        return (
            False,
            f"No contact matching {recipient!r} -- the suggestion list stayed "
            "empty, so there is nobody to send to. Check the name, or add the "
            "contact on the phone.",
            typed,
        )

    tap_at(session, *landmarks.MSG_FIRST_CONTACT)
    _, image = settle(session, timeout_s=4.0, stable_for_s=0.3)
    return (
        True,
        f"Selected the first contact matching {recipient!r} (there may be "
        "several; the confirmation screenshot shows which one).",
        image,
    )


def draft_message(session, recipient: str, text: str):
    """Open Messages, pick the recipient, and type the body -- without sending."""
    ok, report, image = open_compose(session)
    if not ok:
        return False, report, image

    ok, report, image = pick_contact(session, recipient)
    if not ok:
        return False, report, image

    tap_at(session, *landmarks.MSG_BODY_FIELD)
    settle(session, timeout_s=3.0, stable_for_s=0.25)
    pid = session.live_frame().window.pid
    # iOS keeps a per-conversation draft. Without clearing, a leftover body from
    # an earlier aborted run gets the new text appended to it and sent as one
    # garbled message.
    clear_field(pid, 60)
    inputs.type_text(pid, text)
    status, image = settle(session, timeout_s=4.0, stable_for_s=0.3)
    return True, f"Drafted {text!r} to {recipient!r} ({status}).", image


def send_message(session, recipient: str, text: str, send: bool = False):
    """Draft a message and, only if ``send`` is true, actually send it.

    Sending a text is irreversible and goes to a real person, so the default is
    to stop at the drafted state and hand back a screenshot showing exactly who
    the recipient resolved to and what the body says. The caller confirms, then
    re-runs with send=True.
    """
    ok, report, image = draft_message(session, recipient, text)
    if not ok:
        return report, image
    if not send:
        return (
            report + " NOT SENT -- check the recipient and text in this "
            "screenshot, then call again with send=true to send it.",
            image,
        )

    before = session.frame().image
    tap_at(session, *landmarks.MSG_SEND_BUTTON)
    status, image = settle(session, timeout_s=5.0, stable_for_s=0.35)
    if not _changed_since(session, before):
        return (
            f"Pressed Send but the screen did not change ({status}) -- the "
            "message may not have gone. Check the screenshot.",
            image,
        )
    return f"Sent {text!r} to {recipient!r} ({status}).", image
