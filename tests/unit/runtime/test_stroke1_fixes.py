"""STROKE-1 WALL — three latent gateway bugs, fixed 2026-09-06
(docs/design/production-architecture-review.md stroke 1).

Each test pins ONE fix at the unit rim (no GPU, no server):

  * shutdown's engine-stop path indexed pydantic NodeRow objects as
    dicts (n["type"]) OUTSIDE its try — TypeError killed shutdown()
    before the sidecar flush, the ledger write, and os._exit(0): a
    deliberate SIGTERM manufactured the zombie the docstring forbids.
    Mirror of stop(): attribute access, params passed UNwrapped.
  * boot_sweep/read-time sweeps failed QUEUED runs with a
    crash-mid-run story — a queued run never executed any work.
    queued_why names the honest failure ("gateway restarted before
    the run started — resubmit") and the boot ledger records
    state=queued_lost.
  * _h_runs_list never passed live_run_ids, so a LIVE running run
    read as a zombie and the runs list served "failed" for work
    still executing (editor_runs.runs:490).
"""

import asyncio
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

# Sidecar documents are JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


# ── 1. shutdown reaches the engine stop hook on pydantic rows ─────

def test_shutdown_stop_path_uses_row_attributes(monkeypatch: pytest.MonkeyPatch,
                                                tmp_path: Path) -> None:
    calls: list[tuple[object, str]] = []

    class _Boom(Exception):
        pass

    async def _fake_sleep(_delay: float) -> None:
        raise _Boom            # exit the wait loop before os._exit

    stub = ModuleType("fake_engine")
    stub.stop_params = None

    async def _stop(params: dict[str, JsonValue], run_dir: str) -> None:
        stub.stop_params = params
        calls.append((params, run_dir))

    stub.stop = _stop
    monkeypatch.setattr(gateway, "load_engine", lambda _t: stub)
    monkeypatch.setattr(gateway.asyncio, "sleep", _fake_sleep)
    monkeypatch.setattr(gateway.os, "_exit", lambda _c: None)

    node = NodeRow(id="n0", type="fake_engine", params={"k": "v"})
    run = gateway.Run(
        run_id="run-x", graph=FlowGraph(name="t", nodes=(node,)),
        request={},
        # CARD BIRTH LAW (2026-09-06): draft_id required at
        # CONSTRUCTION — harnesses state their own id (gateway.py
        # Run.draft_id comment).
        draft_id="d" * 96,
        stages=[{"id": "n0", "index": 0, "status": "running"}],
        out_root=tmp_path)   # .dir derives: out_root / run_id
    gw = gateway.Gateway()
    gw.active = run

    with pytest.raises(_Boom):
        asyncio.run(gw.shutdown())

    assert calls, "engine.stop never reached — shutdown died before the hook"
    params, run_dir = calls[0]
    # params ride the ABI UNwrapped (stop()'s shape), never {"params": ...}
    assert params == {"k": "v"}
    assert run_dir == str(run.dir)


# ── 2. sweeps distinguish queued (never ran) from running ─────────

def _write(path: Path, obj: dict[str, JsonValue]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj))


def test_sweep_queued_uses_queued_why_and_sets_error(tmp_path: Path) -> None:
    p = tmp_path / "run-q" / "_flow.json"
    _write(p, {"status": "queued",
               "stages": [{"id": "a", "status": "pending"}]})
    assert gateway.sweep_sidecar(
        p, "crash why", queued_why="gateway restarted before the run "
        "started (never executed) — resubmit")
    obj = json.loads(p.read_text())
    assert obj["status"] == "failed"
    assert "never executed" in obj["sweep"]
    assert "never executed" in obj["error"]
    assert obj["stages"][0]["status"] == "pending"   # untouched
    assert not gateway.sweep_sidecar(p, "crash why")  # idempotent


def test_sweep_running_keeps_crash_story_no_error(tmp_path: Path) -> None:
    p = tmp_path / "run-r" / "_flow.json"
    _write(p, {"status": "running",
               "stages": [{"id": "a", "status": "running"}]})
    assert gateway.sweep_sidecar(p, "crash why")
    obj = json.loads(p.read_text())
    assert obj["status"] == "failed"
    assert obj["sweep"] == "crash why"
    assert obj.get("error", "") == ""
    assert obj["stages"][0]["status"] == "failed"


def test_boot_sweep_ledger_separates_queued_lost(
        monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(gateway, "OUT_ROOT", tmp_path)
    monkeypatch.setattr(gateway, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    for name, status in (("run-q", "queued"), ("run-r", "running")):
        d = tmp_path / name
        d.mkdir()
        _write(d / "_flow.json", {"status": status, "stages": []})
    assert gateway.boot_sweep() == 2
    states = {}
    for line in (tmp_path / "_ledger.jsonl").read_text().splitlines():
        row = json.loads(line)
        if row["event"] == "run.swept":
            states[row["data"]["run_id"]] = row["data"]["state"]
    assert states == {"run-q": "queued_lost", "run-r": "failed"}


# ── 3. the runs list passes the live registry ──────────────────────

def test_runs_list_passes_live_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    import editor_runs
    seen: dict[str, object] = {}

    def _capture(server_root: str, limit: int = 200,
                   live_run_ids: tuple[str, ...] = ()) -> dict[str, JsonValue]:
        seen["live_run_ids"] = live_run_ids
        seen["limit"] = limit
        return {"runs": []}

    monkeypatch.setattr(editor_runs, "runs", _capture)
    gw = SimpleNamespace(runs={"run-live-1": object(), "run-live-2": object()})
    ctx = gateway._Ctx(gw, "GET", "/v1/flows/runs",
                       "/v1/flows/runs?limit=5", {"limit": ["5"]}, b"")
    status, _body = asyncio.run(gateway._h_runs_list(ctx))
    assert status == 200
    # WITHOUT this kwarg editor_runs.runs:490 reads every live running
    # run as a zombie and serves "failed" for in-flight work.
    assert tuple(seen.get("live_run_ids", ())) == ("run-live-1", "run-live-2")
    assert seen.get("limit") == 5
