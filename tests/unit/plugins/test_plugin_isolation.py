"""Plugin isolation wall (pattern 5 from the drift playbook).

Plugins must not run code that mutates global state, opens network
sockets, touches the filesystem outside their dir, or otherwise
side-effects the import graph. We assert this by importing the
plugin infrastructure in a fresh subprocess and checking it
completes cleanly with no stderr noise.

The actual import surface for this estate is py/plugins.py (the
plugin discovery broker). The engine plugins themselves are loaded
by reading engine.yaml and exec()-ing plugin.py at compose time,
NOT by Python import. So the clean-import assertion lives on
py/plugins + the gateway-facing model catalog (py/catalog.py).

If a plugin DID introduce an import-time side effect (e.g., import
requests at module top-level, or a module-level network call), the
subprocess would either crash, write to stderr, or hang. We pin
all three.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest


REPO = Path(__file__).resolve().parents[3]


IMPORT_SURFACES = [
    "plugins",                 # py/plugins.py: the plugin discovery broker
    "catalog",                 # py/catalog.py: model catalog scanner
    "lane_disclosure",          # py/lane_disclosure.py: lane listing
    "asset_ledger",            # py/asset_ledger.py: the asset-ledger rung
]


@pytest.mark.parametrize("surface", IMPORT_SURFACES, ids=IMPORT_SURFACES)
def test_clean_import(surface):
    """The import must complete, exit 0, produce no stderr, and
    finish quickly (no hanging network calls)."""
    started = time.monotonic()
    # py/ scripts are importable as TOP-LEVEL modules (asset_ledger,
    # plugins, catalog, ...) when py/ itself is on sys.path. py/ is
    # NOT a package (no __init__.py); the gateway does the same on
    # boot.
    code = "import sys; sys.path.insert(0, 'py'); import " + surface
    proc = subprocess.run(
        [sys.executable, "-c", code],
        cwd=REPO, capture_output=True, text=True, timeout=10,
    )
    elapsed = time.monotonic() - started
    assert proc.returncode == 0, (
        "importing " + surface + " crashed (exit "
        + str(proc.returncode) + "): " + proc.stderr[:500]
    )
    assert proc.stderr.strip() == "", (
        "importing " + surface + " wrote to stderr: "
        + proc.stderr[:500]
    )
    assert elapsed < 5.0, (
        "importing " + surface + " took " + str(round(elapsed, 2))
        + "s -- suspicious (network?)"
    )


# Triple-quoted with REAL newlines. The Python source the
# subprocess runs (after sys.path is extended with the py/ dir).
DISCOVERY_CODE = """import sys
sys.path.insert(0, 'py')
from plugins import iter_plugin_dirs_under
from pathlib import Path
n = sum(1 for _ in iter_plugin_dirs_under(Path('plugins')))
print(f'discovered {n} plugin dirs')"""


def test_plugin_discovery_finds_no_crashers():
    """Walk the plugin tree from a fresh subprocess via the broker
    API itself (the same code path the gateway uses). No exception
    should leak; the broker is supposed to skip broken plugins, not
    crash the caller."""
    proc = subprocess.run(
        [sys.executable, "-c", DISCOVERY_CODE],
        cwd=REPO, capture_output=True, text=True, timeout=15,
    )
    assert proc.returncode == 0, (
        "plugin discovery crashed: " + proc.stderr[:500]
    )
    assert proc.stderr.strip() == "", (
        "plugin discovery wrote to stderr: " + proc.stderr[:500]
    )
