"""tests/unit conftest — factories for the no-server suites."""
import json
import os

import pytest


def write_run(root, run_id, files, status="completed", model="x",
              created_at=1700000000, test=False):
    """Write a run dir (artifact files + _flow.json sidecar).

    Shared by every unit suite that needs a run on disk. Tests that
    need custom sidecar shapes (garbled, hand-built dicts) write the
    sidecar themselves with tmp_path.
    """
    rd = os.path.join(str(root), run_id)
    os.makedirs(rd, exist_ok=True)
    for name, blob in files.items():
        with open(os.path.join(rd, name), "wb") as fp:
            fp.write(blob)
    sidecar = {"run_id": run_id, "status": status,
               "model": model, "created_at": created_at}
    if test:
        sidecar["test"] = True
    with open(os.path.join(rd, "_flow.json"), "w") as fp:
        fp.write(json.dumps(sidecar))
    return rd


@pytest.fixture
def make_run(tmp_path):
    """Factory fixture: make_run(run_id, files, root=None, **kwargs).

    Writes under tmp_path by default (auto-cleaned per test); pass
    root=<Path> to target a custom tree (the L3 tests use
    tmp_path/test-output as their own root)."""
    def _make(run_id, files, root=None, **kwargs):
        return write_run(root if root is not None else tmp_path,
                         run_id, files, **kwargs)
    _make.root = str(tmp_path)
    return _make
