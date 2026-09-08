"""tests/ root conftest — the ONE place path setup happens.

pytest loads this before collecting anything under tests/. The
repo python/ dir goes on sys.path here so every test can import the
gateway modules directly (asset_ledger, catalog, plugins, ...)
with no per-file sys.path.insert rituals.
"""
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
REPO = Path(__file__).resolve().parent.parent

# the estate's python/ scripts are importable as TOP-LEVEL modules when
# python/ itself is on sys.path (python/ has no __init__.py; the gateway
# does the same insert on boot). ONE insert, owned here. The tests/
# dir rides along for the shared bootstrap (tests/_bootstrap.py —
# fixture audit 2026-09-04).
for _p in (str(REPO / "python"), str(REPO / "tests"),
           # (2026-09-07) the fit/skin lane-lens inserts (fit_spec/
           # skin_spec in the cards' python/ dirs) died with the python
           # render plane (commit b324c480) — removed, not commented.
           ):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Writable comfy_script shadow (2026-09-06): the co_script pin writer
# targets the IMPORTED comfy_script package dir; on
# read-only-site-packages mounts that write raises Errno 30 and every
# phase-2 render refuses under pytest (import order decides which copy
# wins, so per-suite inserts race — the ONE place owns it).
# data/tmp/shim carries the writable copy (the script-world suites'
# PYTHONPATH workaround). Guarded: environments without the shadow
# resolve the installed package exactly as before.
_shim = str(REPO / "data" / "tmp" / "shim")
if Path(_shim).is_dir() and _shim not in sys.path:
    sys.path.insert(0, _shim)


@pytest.fixture(scope="session")
def repo() -> Path:
    """The repo root as a Path. Cheaper than git rev-parse and always
    correct (conftest location is fixed relative to the repo)."""
    return REPO


# The disclosure doors every test shares in-process (peek/card_tools/
# skill_read). A test that setattr-doubles one of these and leaks it
# poisons every LATER test in the process (the 2026-09-05 "boom":
# strictness's raising doubles, no teardown, form_wire red in suite
# but green isolated). This autouse guard snapshots the three door
# identities per test and fails THE LEAKING TEST — never a
# downstream victim. Properly restored doubles (monkeypatch,
# try/finally) pass through untouched. Import cost ~0.05s, once per
# process (sys.modules-cached); the static pin for new setattr sites
# lives in suites/test_primitive_hygiene.py.
_DISCLOSURE_DOORS = ("peek", "card_tools", "skill_read")


@pytest.fixture(autouse=True)
def _no_leaked_disclosure_doubles() -> Iterator[None]:
    import lane_disclosure as _ld
    before = {n: id(getattr(_ld, n)) for n in _DISCLOSURE_DOORS}
    yield
    leaked = [n for n in _DISCLOSURE_DOORS
              if id(getattr(_ld, n)) != before[n]]
    assert not leaked, (
        "test leaked doubles onto lane_disclosure: %s — restore "
        "them (monkeypatch or try/finally) so later tests see the "
        "real doors" % leaked)


# Script-style suites that call sys.exit() at import time.
# pytest collects them before running — and crashes the whole run.
# timeline/*: h3-era scripts whose SSOT files are deleted (EXTENSION
# LAW, 2026-09-03). dev_dsh_boot_e2e.py gates on an env that may
# not be present. Neither dir is covered by the walls conftest
# (tests/walls/) which governs only suites/ subdirectory collection.
collect_ignore_glob = [
    "timeline/*",
    "dev_dsh/test_dev_dsh_boot_e2e.py",
]
