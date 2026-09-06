"""test_lockfile.py - the R2 single-writer wall (2026-09-06;
design record docs/queue/gpu-fifo.md). ONE state root, ONE
gateway writing it: a second gateway corrupts sidecars, double-
claims the GPU FIFO, and interleaves ledger rows. Pinned:

  1. first acquire: O_CREAT|O_EXCL wins, the pid rides the file.
  2. live holder (the test process own pid): REFUSED loud.
  3. dead holder (a real exited pid) and garbage holder: STOLEN,
     ledgered server.lock_stolen, re-acquired.
  4. release_lock: unlink; the next acquire is first-try.
  5. main() acquires BEFORE Gateway()/boot side effects and exits
     on refusal (source-order pin — the resurrect/sweep order wall
     pattern).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    state = tmp_path / "state"
    state.mkdir()
    monkeypatch.setattr(gw_mod, "STATE_ROOT", state)
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    return state


def _lock(state: Path) -> Path:
    return state / "gateway.lock"


def _dead_pid() -> int:
    p = subprocess.Popen(["true"])
    p.wait()
    assert p.returncode == 0
    return p.pid


def test_acquire_wins_first_try(scratch: Path) -> None:
    ok, note = gw_mod.acquire_lock(pid=4242)
    assert ok and note == "acquired"
    assert _lock(scratch).read_text().strip() == "4242"


def test_live_holder_refused(scratch: Path) -> None:
    mine = os.getpid()          # alive by definition: the test runs
    _lock(scratch).write_text(str(mine))
    ok, note = gw_mod.acquire_lock(pid=99)
    assert not ok
    assert str(mine) in note
    assert "live pid" in note
    assert _lock(scratch).read_text().strip() == str(mine)


def test_dead_holder_stolen(scratch: Path) -> None:
    dead = _dead_pid()
    _lock(scratch).write_text(str(dead))
    ok, note = gw_mod.acquire_lock(pid=77)
    assert ok and "stolen" in note and str(dead) in note
    assert _lock(scratch).read_text().strip() == "77"
    evs = [json.loads(l) for l in
           gw_mod.LEDGER_PATH.read_text().splitlines()]
    assert any(e["event"] == "server.lock_stolen" and
               e["data"]["stale_pid"] == dead for e in evs)


def test_garbage_holder_stolen(scratch: Path) -> None:
    _lock(scratch).write_text("not-a-pid")
    ok, note = gw_mod.acquire_lock(pid=88)
    assert ok and "stolen" in note
    assert _lock(scratch).read_text().strip() == "88"


def test_release_then_reacquire(scratch: Path) -> None:
    ok, _ = gw_mod.acquire_lock(pid=1)
    assert ok
    gw_mod.release_lock(pid=1)   # the holder releases
    assert not _lock(scratch).exists()
    ok, note = gw_mod.acquire_lock(pid=2)
    assert ok and note == "acquired"


def test_release_missing_is_silent(scratch: Path) -> None:
    gw_mod.release_lock()      # no file, no exception
    assert not _lock(scratch).exists()


def test_release_is_pid_checked_never_foreign(scratch: Path) -> None:
    # the bind-fail lesson (2026-09-06, live): a spawn that acquires,
    # fails to bind the taken port, and shuts down MUST NOT release
    # another live holder lock — a blind unlink freed the next spawn
    # to steal + boot-sweep LIVE runs. Release frees only OUR pid.
    _lock(scratch).write_text("999999")          # a foreign holder
    gw_mod.release_lock(pid=4242)                # not ours
    assert _lock(scratch).read_text().strip() == "999999"
    gw_mod.release_lock(pid=999999)              # ours
    assert not _lock(scratch).exists()


def test_main_acquires_before_boot_side_effects() -> None:
    src = (REPO / "py" / "gateway.py").read_text()
    m = src.index("async def main(port: int)")
    assert src.index("acquire_lock()", m) < src.index("Gateway()", m)
    assert src.index("acquire_lock()", m) < \
        src.index("boot_resurrect(gw)", m)
    assert "REFUSING TO START" in src
    assert src.index("yield\n        release_lock()", m) > 0