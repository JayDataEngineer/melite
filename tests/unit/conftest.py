"""tests/unit conftest — stamps every collected item with the
`xdist_group("unit")` marker so `pytest -n auto --dist=loadgroup`
runs all unit tests on a single worker (none of them have
session-scoped fixtures today, but the group also gives xdist a
stable scheduling key when the suite grows).

`stamp_xdist_group` lives in tests/_bootstrap.py — the shared
bootstrap module that's already on sys.path (root conftest
inserts it) so it's importable from every directory conftest
without a circular import.
"""
from pathlib import Path

import _bootstrap  # tests/_bootstrap.py — path owned by the root conftest
import pytest


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    _bootstrap.stamp_xdist_group(
        config, items, "unit", Path(__file__).resolve().parent)

