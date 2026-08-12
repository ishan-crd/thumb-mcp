"""Where things are on screen -- the data half of the shortcut system.

Taking a screenshot just to locate a tab bar is the biggest single time sink in
driving a phone, so common targets live here as fixed positions instead. Every
coordinate is a **fraction of the device screen** (0..1, origin top-left), never
an absolute point, so the same landmark is correct on an iPhone SE and a Pro Max
alike.

This file is meant to be edited. Adding support for a new app is a matter of
adding one `AppProfile` below -- no flow logic changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# --------------------------------------------------------------------------
# Generic iOS chrome
# --------------------------------------------------------------------------

NAV_Y = 0.94                    # vertical centre of the bottom tab bar
NAV_SPAN = (0.165, 0.833)       # horizontal centres of the first and last tab
TOP_SEARCH_FIELD = (0.5, 0.10)  # search bar pinned below the status bar
SPOTLIGHT_FIELD = (0.5, 0.93)   # iOS Spotlight puts its field at the *bottom*
FIRST_RESULT = (0.5, 0.20)      # first row of a typical results list
HOME_EMPTY_BAND = 0.82          # y of dead space between last icon row and dock
SCREEN_MIDDLE = (0.5, 0.5)

# Edge gestures start marginally off-screen so iOS reads them as edge swipes
# rather than as in-content drags.
EDGE_INSET = 0.005


def nav_slot(index: int, count: int = 5) -> tuple[float, float]:
    """Centre of the index-th bottom-tab item (1-based), as screen fractions."""
    if count <= 1:
        return 0.5, NAV_Y
    low, high = NAV_SPAN
    index = max(1, min(count, index))
    return low + (index - 1) * (high - low) / (count - 1), NAV_Y


# --------------------------------------------------------------------------
# Per-app layouts
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class AppProfile:
    """Where an app keeps the controls the shortcuts need.

    ``search_tab`` is (slot, total_slots) in the bottom tab bar; ``search_field``
    is where the search input sits once that tab is open. ``aliases`` are the
    other names a user might say ("insta" for Instagram).
    """

    name: str
    search_tab: tuple[int, int] = (4, 5)
    search_field: tuple[float, float] = TOP_SEARCH_FIELD
    aliases: tuple[str, ...] = field(default_factory=tuple)


# Keep alphabetical. The key is the canonical, launchable app name -- it is what
# gets typed into Spotlight, so it must match the real app title.
APP_PROFILES: tuple[AppProfile, ...] = (
    AppProfile("App Store", search_tab=(5, 5), aliases=("appstore",)),
    AppProfile("Instagram", search_tab=(4, 5), aliases=("insta", "ig")),
    AppProfile("Maps", search_tab=(1, 1), search_field=(0.5, 0.88)),
    AppProfile("Spotify", search_tab=(2, 3), aliases=("spot",)),
    AppProfile("Threads", search_tab=(2, 5)),
    AppProfile("X", search_tab=(2, 5), aliases=("twitter",)),
    AppProfile("YouTube", search_tab=(2, 5), search_field=(0.5, 0.07),
               aliases=("yt",)),
)

# Used when an app has no profile: the most common iOS arrangement.
DEFAULT_PROFILE = AppProfile("generic", search_tab=(4, 5))

_BY_NAME: dict[str, AppProfile] = {}
for _profile in APP_PROFILES:
    _BY_NAME[_profile.name.lower()] = _profile
    for _alias in _profile.aliases:
        _BY_NAME[_alias.lower()] = _profile


def profile_for(app: str) -> tuple[AppProfile, bool]:
    """Look up an app's layout by name or alias.

    Returns (profile, is_known). Unknown apps fall back to the generic layout
    rather than failing, since the generic guess is usually right and the caller
    can override the tab position explicitly.
    """
    found = _BY_NAME.get(app.strip().lower())
    return (found, True) if found is not None else (DEFAULT_PROFILE, False)


def canonical_name(app: str) -> str:
    """Resolve an alias to the real app name to type into Spotlight."""
    profile, known = profile_for(app)
    return profile.name if known else app
