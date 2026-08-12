"""Accessibility-API helpers: permissions, menu commands, and overlay detection.

Two things here are load-bearing.

Overlay detection: while a session is actually streaming, the mirroring window's
AX subtree is empty -- just a bare AXGroup. The moment the session pauses or
drops (the phone gets picked up, the Mac session times out), the app paints a
native overlay whose AXStaticText/AXButton nodes *are* exposed. So "does this
window have AX text or buttons in it" is an exact, pixel-free test for "is this
window showing the device, or showing an interstitial". It also hands us the
real on-screen message to quote back to the user.

Menu commands: Home / App Switcher / Spotlight are driven by pressing the real
menu items rather than synthesising Cmd-1/2/3. Pressing the menu item does not
depend on the window holding keyboard focus, so it cannot silently deliver a
Cmd-N to whatever app happens to be frontmost.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field

import AppKit
from ApplicationServices import (
    AXIsProcessTrusted,
    AXUIElementCopyAttributeValue,
    AXUIElementCreateApplication,
    AXUIElementPerformAction,
    AXUIElementSetAttributeValue,
)

from .errors import AccessibilityDenied, MirrorError

# Menu item titles under the View menu, keyed by the tool that drives them.
MENU_HOME = "Home Screen"
MENU_APP_SWITCHER = "App Switcher"
MENU_SPOTLIGHT = "Spotlight"


def ensure_accessibility() -> None:
    if not AXIsProcessTrusted():
        raise AccessibilityDenied()


def accessibility_ok() -> bool:
    return bool(AXIsProcessTrusted())


def _attr(element, name: str):
    _err, value = AXUIElementCopyAttributeValue(element, name, None)
    return value


def app_element(pid: int):
    return AXUIElementCreateApplication(pid)


@dataclass
class Overlay:
    """A non-streaming interstitial painted over the mirror surface."""

    texts: list[str] = field(default_factory=list)
    buttons: list[str] = field(default_factory=list)

    @property
    def message(self) -> str:
        return " ".join(t.replace("\n", " ").strip() for t in self.texts if t).strip()


def detect_overlay(pid: int) -> Overlay | None:
    """Return the overlay covering the mirror surface, or None while streaming."""
    app = app_element(pid)
    windows = _attr(app, "AXWindows") or []
    for window in windows:
        if _attr(window, "AXTitle") != "iPhone Mirroring":
            continue
        texts: list[str] = []
        buttons: list[str] = []

        def walk(element, depth: int = 0) -> None:
            if depth > 8:
                return
            role = _attr(element, "AXRole")
            if role == "AXStaticText":
                value = _attr(element, "AXValue")
                if value:
                    texts.append(str(value))
            elif role == "AXButton":
                label = _attr(element, "AXDescription") or _attr(element, "AXTitle")
                if label:
                    buttons.append(str(label))
            for child in _attr(element, "AXChildren") or []:
                walk(child, depth + 1)

        walk(window)
        if texts or buttons:
            return Overlay(texts=texts, buttons=buttons)
        return None
    return None


def press_button(pid: int, label: str) -> bool:
    """Press an overlay button (e.g. 'Connect') by its accessibility label."""
    app = app_element(pid)
    for window in _attr(app, "AXWindows") or []:
        found: list = []

        def walk(element, depth: int = 0) -> None:
            if depth > 8 or found:
                return
            if _attr(element, "AXRole") == "AXButton":
                name = _attr(element, "AXDescription") or _attr(element, "AXTitle")
                if name and str(name).strip().lower() == label.strip().lower():
                    found.append(element)
                    return
            for child in _attr(element, "AXChildren") or []:
                walk(child, depth + 1)

        walk(window)
        if found:
            AXUIElementPerformAction(found[0], "AXPress")
            return True
    return False


def press_menu_item(pid: int, title: str) -> None:
    """Press a menu item by title, e.g. 'Home Screen'."""
    ensure_accessibility()
    app = app_element(pid)
    menubar = _attr(app, "AXMenuBar")
    if menubar is None:
        raise MirrorError(
            "Could not read the iPhone Mirroring menu bar over the Accessibility "
            f"API. Confirm Accessibility is granted, then retry. (menu: {title})"
        )
    for top in _attr(menubar, "AXChildren") or []:
        for submenu in _attr(top, "AXChildren") or []:
            for item in _attr(submenu, "AXChildren") or []:
                if _attr(item, "AXTitle") == title:
                    AXUIElementPerformAction(item, "AXPress")
                    return
    raise MirrorError(
        f"Menu item {title!r} was not found in the iPhone Mirroring menus. "
        "This usually means mirroring is not connected, so the View menu is "
        "disabled."
    )


def activate(pid: int) -> None:
    """Bring the mirroring app forward so it receives synthesised input.

    Keyboard events only reach the app that owns focus, and the mirroring window
    ignores clicks while inactive, so input tools must front the app first.
    """
    running = AppKit.NSRunningApplication.runningApplicationWithProcessIdentifier_(pid)
    if running is not None:
        # 1 << 1 == NSApplicationActivateIgnoringOtherApps
        running.activateWithOptions_(1 << 1)
        return
    app = app_element(pid)
    AXUIElementSetAttributeValue(app, "AXFrontmost", True)


def frontmost_pid() -> int | None:
    """PID of whatever app currently owns focus."""
    app = AppKit.NSWorkspace.sharedWorkspace().frontmostApplication()
    return int(app.processIdentifier()) if app is not None else None


@contextmanager
def keep_focus(mirror_pid: int | None = None):
    """Hand focus back to whatever the user was using.

    Input has to go through the HID event stream, which means the mirroring app
    must be frontmost while a gesture is delivered -- so every call steals focus
    from the user's editor or terminal. If we don't give it back, the user's own
    keystrokes land on the *phone*, silently interleaving with typed text.
    """
    previous = frontmost_pid()
    try:
        yield
    finally:
        if previous is not None and previous != mirror_pid:
            app = AppKit.NSRunningApplication.runningApplicationWithProcessIdentifier_(
                previous
            )
            if app is not None:
                app.activateWithOptions_(1 << 1)
