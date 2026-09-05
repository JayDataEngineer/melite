"""tests/ root conftest — the ONE place path setup happens.

pytest loads this before collecting anything under tests/. The
repo py/ dir goes on sys.path here so every test can import the
gateway modules directly (asset_ledger, catalog, plugins, ...)
with no per-file sys.path.insert rituals.
"""
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent

# the estate's py/ scripts are importable as TOP-LEVEL modules when
# py/ itself is on sys.path (py/ has no __init__.py; the gateway
# does the same insert on boot). ONE insert, owned here. The tests/
# dir rides along for the shared bootstrap (tests/_bootstrap.py —
# fixture audit 2026-09-04).
for _p in (str(REPO / "py"), str(REPO / "tests")):
    if _p not in sys.path:
        sys.path.insert(0, _p)


@pytest.fixture(scope="session")
def repo() -> Path:
    """The repo root as a Path. Cheaper than git rev-parse and always
    correct (conftest location is fixed relative to the repo)."""
    return REPO


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
