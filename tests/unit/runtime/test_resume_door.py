"""test_resume_door.py - the R3.2 resume-from-stage wall
(2026-09-06; design record docs/queue/run-registry.md). A failed or
stopped run re-enters the queue under the SAME run id: completed
stages stay completed, the per-stage loop skips them and re-seeds
the carry pool from the durable result_outputs record, execution
resumes at the first non-green stage. Merged single-graph runs
restart whole (one submit cannot honor a prefix).

Pinned, all offline (scratch roots; no gateway boot, no GPU):
  1. THE DOOR: a failed 2-stage record with stage 0 green (and its
     result_outputs) resumes -> queued, from stage 1, registry row
     replaced, order appended, sidecar updated on disk.
  2. THE PREFIX: execute() runs ONLY the pending stage; its inputs
     carry the green stage's recorded channels; engine transitions
     never fire for skipped stages.
  3. THE MERGED GATE: any completed stage refuses the single-graph
     fast path (behavioral) - a resumed run walks the per-stage
     loop; merged-marked records resume from stage 0 (merged_restart).
  4. REFUSALS: unknown run, live queued/running, completed, orphan
     record - all ValidationError BEFORE any re-register.
  5. THE DURABLE RECORD: both harvest paths stamp result_outputs
     (source pin).
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

DRAFT = "d" * 96


def _record(root: Path, run_id: str, *, stage0: str,
             result_outputs: dict[str, JsonValue] | None = None,
             merged: bool = False) -> None:
    d = root / run_id
    d.mkdir(parents=True)
    (d / "_request.json").write_text(json.dumps(
        {"flow_inline": {}, "draft_id": DRAFT}))
    (d / "_flow.json").write_text(json.dumps({
        "run_id": run_id, "status": "failed", "error": "boom",
        "stages": [
            {"id": "gen", "name": "gen", "index": 0, "status": stage0,
             "outputs": {}, "expected": {},
             "result_outputs": result_outputs or {},
             **({"merged": True} if merged else {})},
            {"id": "upscale", "name": "upscale", "index": 1,
             "status": "failed", "outputs": {}, "expected": {},
             "error": "engine died"}],
        "skipped_stages": [], "artifacts": [],
        "created_at": 100.0, "test": False, "draft_id": DRAFT,
        "pipeline": "resume-wall",
        "graph": [
            {"id": "gen", "type": "stub", "input_from": [],
             "input_names": {}, "outputs": {},
             "params": {"prompt": {"initial": "p"}}},
            {"id": "upscale", "type": "stub2",
             "input_from": ["gen.images"],
             "input_names": {"image": "gen.images"},
             "outputs": {}, "params": {}}]}))


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    out = tmp_path / "output"
    out.mkdir()
    state = tmp_path / "state"
    (state / "drafts").mkdir(parents=True)
    (state / "drafts" / (DRAFT + ".json")).write_text("{}")
    monkeypatch.setattr(gw_mod, "OUT_ROOT", out)
    monkeypatch.setattr(gw_mod, "STATE_ROOT", state)
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    return out


def test_resume_door_requeues_from_last_green(scratch: Path) -> None:
    _record(scratch, "run-r1", stage0="completed",
            result_outputs={"images": "/abs/gen.png"})
    gw = gw_mod.Gateway()
    res = asyncio.run(gw.resume("run-r1"))
    assert res["status"] == "queued"
    assert res["resumed_from_stage"] == 1
    assert res["completed_stages"] == 1
    assert res["merged_restart"] is False
    assert gw.order == ["run-r1"]
    run = gw.runs["run-r1"]
    assert run.status == "queued"
    assert [s["status"] for s in run.stages] == ["completed", "pending"]
    assert "error" not in run.stages[1]
    doc = json.loads((scratch / "run-r1" / "_flow.json").read_text())
    assert doc["status"] == "queued"
    events = [json.loads(l) for l in
              gw_mod.LEDGER_PATH.read_text().splitlines()]
    assert any(e["event"] == "run.resume" and
               e["data"]["from_stage"] == 1 for e in events)


class _StubEngine:
    calls: list[str] = []
    seen_inputs: list[dict[str, JsonValue]] = []

    async def execute(self, node: NodeRow, run_dir: str,
                      inputs: dict[str, JsonValue],
                      stop: asyncio.Event,
                      report: "type[object] | None" = None,
                      ) -> dict[str, JsonValue]:
        _StubEngine.calls.append(str(getattr(node, "node_id")))
        _StubEngine.seen_inputs.append(dict(inputs))
        return {"outputs": {"images": "done.png"}, "artifacts": []}


def test_execute_prefix_skips_green_and_reseeds_carry(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _record(scratch, "run-r2", stage0="completed",
            result_outputs={"images": "/abs/gen.png"})
    run = gw_mod._rebuild_run_from_record("run-r2")
    assert run is not None
    _StubEngine.calls = []
    _StubEngine.seen_inputs = []
    monkeypatch.setattr(gw_mod, "load_engine",
                        lambda t: _StubEngine())
    gw = gw_mod.Gateway()
    asyncio.run(gw.execute(run))
    assert _StubEngine.calls == ["upscale"]   # gen was skipped
    assert _StubEngine.seen_inputs[0]["image"] == "/abs/gen.png"
    assert [s["status"] for s in run.stages] == ["completed", "completed"]
    assert run.stages[1]["result_outputs"] == {"images": "done.png"}


def test_any_green_stage_refuses_merged_path(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _record(scratch, "run-r3", stage0="completed",
            result_outputs={"images": "x.png"})
    run = gw_mod._rebuild_run_from_record("run-r3")
    assert run is not None
    fired: list[str] = []

    async def _never(run: gw_mod.Run, initial: dict[str, JsonValue]) -> bool:
        fired.append("merged")
        return True

    monkeypatch.setattr(gw_mod.Gateway, "_try_merged", _never)
    gw = gw_mod.Gateway()
    # execute() must NOT take the merged path when a stage is green
    _StubEngine.calls = []
    monkeypatch.setattr(gw_mod, "load_engine", lambda t: _StubEngine())
    asyncio.run(gw.execute(run))
    assert fired == []


def test_merged_record_restarts_whole(scratch: Path) -> None:
    _record(scratch, "run-r4", stage0="completed", merged=True,
            result_outputs={"images": "/abs/gen.png"})
    gw = gw_mod.Gateway()
    res = asyncio.run(gw.resume("run-r4"))
    assert res["merged_restart"] is True
    assert res["resumed_from_stage"] == 0
    assert res["completed_stages"] == 0
    assert [s["status"] for s in gw.runs["run-r4"].stages] == \
        ["pending", "pending"]


def test_refusals_before_any_reregister(scratch: Path) -> None:
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.resume("run-ghost"))
    _record(scratch, "run-done", stage0="completed")
    (scratch / "run-done" / "_flow.json").write_text(json.dumps(
        {"run_id": "run-done", "status": "completed", "error": "",
         "stages": [], "skipped_stages": [], "artifacts": [],
         "created_at": 1.0, "draft_id": DRAFT, "pipeline": "x",
         "graph": []}))
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.resume("run-done"))
    _record(scratch, "run-live", stage0="pending")
    live = gw_mod._rebuild_run_from_record("run-live")
    assert live is not None
    live.status = "running"
    gw.runs["run-live"] = live
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.resume("run-live"))
    assert gw.order == [] and "run-done" not in gw.runs


def test_orphan_record_refuses(scratch: Path) -> None:
    _record(scratch, "run-orph", stage0="pending")
    # kill the draft doc — CARD BIRTH LAW
    for p in (gw_mod.STATE_ROOT / "drafts").iterdir():
        p.unlink()
    gw = gw_mod.Gateway()
    with pytest.raises(gw_mod.ValidationError):
        asyncio.run(gw.resume("run-orph"))
    assert gw.order == []


def test_both_harvests_stamp_result_outputs() -> None:
    src = (REPO / "py" / "gateway.py").read_text()
    assert src.count('stage["result_outputs"]') >= 2
    assert "resumed_from_stage" in src
