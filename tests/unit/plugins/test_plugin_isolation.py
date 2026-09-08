"""Plugin isolation wall (pattern 5 from the drift playbook).

Plugins must not run code that mutates global state, opens network
sockets, touches the filesystem outside their dir, or otherwise
side-effects the import graph. We assert this by importing the
plugin infrastructure in a fresh subprocess and checking it
completes cleanly with no stderr noise.

The actual import surface for this estate is python/plugins.py (the
plugin discovery broker). The engine plugins themselves are loaded
by reading engine.yaml and exec()-ing plugin.py at compose time,
NOT by Python import. So the clean-import assertion lives on
python/plugins + the gateway-facing model catalog (python/catalog.py).

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
    "plugins",                  # python/plugins.py: the plugin discovery broker
                                # (2026-09-08 red-closure: the entry read
                                # "packages" — no python/packages.py exists;
                                # the name imported the repo packages/
                                # namespace dir and pinned nothing.)
    # (2026-09-08 S-oracle drive-by: python/catalog.py died in
    # S-catalog — the roster kept naming it, red since. Dropped.)
    # (PURGE S-oracle 2026-09-08: lane_disclosure dropped with the
    # module — the disclosure doors are TS-native.)
    "asset_ledger",            # python/asset_ledger.py: the asset-ledger rung
    # 2026-09-04: the surface-registry meta-test (test_surface_registry.py)
    # caught these five gateway-imported modules running unpinned —
    # every python/ sibling python/gateway.py imports must have a clean-import
    # pin here or a documented exemption there.
    "editor_forms",            # python/editor_forms.py: editor form discovery
    "editor_runs",             # python/editor_runs.py: editor run routing
    "flow",                    # python/flow.py: flows/<name>/flow.py resolver
    "manage",                  # python/manage.py: management-plane door
    "flow_graph",          # python/flow_graph.py: run graph emitter
    # 2026-09-05: caught by the same meta-test after the estate-config
    # + artifact-ref sweep — gateway imports them; they pin clean.
    "estate_config",           # python/estate_config.py: deployment config row
    "artifact_refs",           # python/artifact_refs.py: dangling-ref finder
    # ORACLE DEATH 2026-09-08: "provision_rail" dropped from this
    # list with the module (python/provision_rail.py deleted — the
    # gateway import that pinned it here is dead; on-demand
    # provisioning dies with the py serving oracle).
]


@pytest.mark.parametrize("surface", IMPORT_SURFACES, ids=IMPORT_SURFACES)
def test_clean_import(surface: str) -> None:
    """The import must complete, exit 0, produce no stderr, and
    finish quickly (no hanging network calls)."""
    started = time.monotonic()
    # python/ scripts are importable as TOP-LEVEL modules (asset_ledger,
    # plugins, catalog, ...) when python/ itself is on sys.path. python/ is
    # NOT a package (no __init__.py); the gateway does the same on
    # boot.
    code = "import sys; sys.path.insert(0, 'python'); import " + surface
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
# subprocess runs (after sys.path is extended with the python/ dir).
DISCOVERY_CODE = """import sys
sys.path.insert(0, 'python')
from plugins import iter_plugin_dirs_under
from pathlib import Path
n = sum(1 for _ in iter_plugin_dirs_under(Path('plugins')))
print(f'discovered {n} plugin dirs')"""


def test_plugin_discovery_finds_no_crashers() -> None:
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
