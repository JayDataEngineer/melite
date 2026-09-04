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
# does the same insert on boot). ONE insert, owned here.
if str(REPO / "py") not in sys.path:
    sys.path.insert(0, str(REPO / "py"))


@pytest.fixture(scope="session")
def repo():
    """The repo root as a Path. Cheaper than git rev-parse and always
    correct (conftest location is fixed relative to the repo)."""
    return REPO
