"""Loud, actionable errors.

Every failure mode a user can actually hit names the exact System Settings pane
and the exact application that needs the grant. Permissions on macOS are granted
to the *host* process (the app that spawned this server), not to Python itself,
so the messages resolve and name that host.
"""

from __future__ import annotations

import os
import subprocess
import sys
from functools import lru_cache

SCREEN_RECORDING_PANE = (
    "System Settings › Privacy & Security › Screen & System Audio Recording"
)
ACCESSIBILITY_PANE = "System Settings › Privacy & Security › Accessibility"


@lru_cache(maxsize=1)
def host_app() -> str:
    """Best-effort name of the process that must hold the TCC grants.

    TCC attributes permissions to the *responsible* process -- the app that
    launched this interpreter (Claude Desktop, Terminal, iTerm, Cursor...).
    Naming it removes the most common source of "I granted it and it still
    doesn't work" confusion.
    """
    names: list[str] = []
    pid = os.getppid()
    for _ in range(4):  # walk a few ancestors; stop at launchd
        if pid <= 1:
            break
        try:
            out = subprocess.run(
                ["ps", "-o", "comm=", "-p", str(pid)],
                capture_output=True,
                text=True,
                timeout=2,
            ).stdout.strip()
            ppid_out = subprocess.run(
                ["ps", "-o", "ppid=", "-p", str(pid)],
                capture_output=True,
                text=True,
                timeout=2,
            ).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            break
        if not out:
            break
        # /Applications/Foo.app/Contents/MacOS/Foo -> Foo
        if ".app/" in out:
            app = out.split(".app/")[0].split("/")[-1]
            names.append(f"{app}.app")
            break
        names.append(out.split("/")[-1])
        try:
            pid = int(ppid_out)
        except ValueError:
            break
    if names:
        return names[-1]
    return os.path.basename(sys.executable)


class MirrorError(RuntimeError):
    """Base class. The message is written to be read by a model *and* a human."""


class MirroringNotRunning(MirrorError):
    def __init__(self) -> None:
        super().__init__(
            "The iPhone Mirroring app is not running.\n"
            "Fix: open the iPhone Mirroring app on this Mac and connect your iPhone "
            "(you may need to unlock the phone and confirm the pairing prompt).\n"
            "Requires macOS 15 (Sequoia) or later and iOS 18 or later, with the same "
            "Apple Account and Wi-Fi/Bluetooth enabled on both devices."
        )


class WindowNotFound(MirrorError):
    def __init__(self, detail: str = "") -> None:
        super().__init__(
            "iPhone Mirroring is running but its mirroring window could not be found"
            f"{': ' + detail if detail else '.'}\n"
            "Fix: bring the iPhone Mirroring window on screen -- it cannot be "
            "minimised, hidden, or on another Space. If the phone is locked or was "
            "just picked up, mirroring is paused: unlock the Mac-side session by "
            "clicking the window, and put the phone down."
        )


class MirroringNotConnected(MirrorError):
    def __init__(self) -> None:
        super().__init__(
            "iPhone Mirroring is open but not connected to an iPhone -- it is "
            "showing its setup / 'Welcome to iPhone Mirroring' screen.\n"
            "Fix: click through that window on your Mac to connect your iPhone. "
            "The connection handshake requires unlocking the iPhone and approving "
            "the prompt on the phone itself, which cannot be automated. Once the "
            "mirrored screen is visible, retry."
        )


class ScreenRecordingDenied(MirrorError):
    def __init__(self) -> None:
        super().__init__(
            "Screen Recording permission is missing, so the mirrored screen cannot "
            "be captured.\n"
            f"Fix: grant Screen Recording to {host_app()!r} in:\n"
            f"  {SCREEN_RECORDING_PANE}\n"
            f"Add {host_app()!r} with the '+' button if it is not listed, enable the "
            "toggle, then fully quit and reopen that app -- macOS only applies a new "
            "Screen Recording grant on relaunch."
        )


class AccessibilityDenied(MirrorError):
    def __init__(self) -> None:
        super().__init__(
            "Accessibility permission is missing, so taps and keystrokes cannot be "
            "delivered to the mirroring window.\n"
            f"Fix: grant Accessibility to {host_app()!r} in:\n"
            f"  {ACCESSIBILITY_PANE}\n"
            f"Add {host_app()!r} with the '+' button if it is not listed, enable the "
            "toggle, then restart that app."
        )


class CaptureFailed(MirrorError):
    def __init__(self, detail: str) -> None:
        super().__init__(
            f"Failed to capture the iPhone Mirroring window: {detail}\n"
            "This usually means mirroring disconnected or the window was closed "
            "between the window lookup and the capture. Re-check the iPhone "
            "Mirroring app, then retry."
        )


class MirroringPaused(MirrorError):
    def __init__(self, message: str = "", buttons: list[str] | None = None) -> None:
        buttons = buttons or []
        quoted = f" The window currently says: {message!r}." if message else ""
        hint = (
            "\nCall reconnect() to press Connect once the iPhone is locked."
            if any(b.lower() == "connect" for b in buttons)
            else ""
        )
        super().__init__(
            "iPhone Mirroring is not streaming the device right now -- it is "
            "showing an interstitial instead of the phone screen." + quoted + "\n"
            "The usual cause is that the physical iPhone was picked up or "
            "unlocked. Mirroring stops the instant the phone is in use, by "
            "design. Fix: lock the iPhone and set it down." + hint
        )


class CoordinatesOutOfRange(MirrorError):
    def __init__(self, x: float, y: float, w: int, h: int) -> None:
        super().__init__(
            f"Point ({x:g}, {y:g}) is outside the device screen, which is "
            f"{w}x{h} points. Valid x is 0..{w}, valid y is 0..{h}. "
            "Take a screenshot() first -- it reports the current coordinate space."
        )
