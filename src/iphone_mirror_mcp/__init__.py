"""Control an iPhone from Claude through the macOS iPhone Mirroring app.

Only ``main`` is re-exported: binding the name ``server`` here would shadow the
``iphone_mirror_mcp.server`` submodule for anyone importing it directly.
"""

from .server import main

__all__ = ["main"]
