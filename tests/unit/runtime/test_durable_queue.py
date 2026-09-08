"""test_durable_queue.py - the R3 durable-queue wall (2026-09-06;
design record docs/design/production-architecture-review.md R3:
"persist queue order ... resurrect on boot instead of sweeping to
failed" - the review called gpu-fifo.md's resurrection sketch the
better design; this stroke makes it the code).

Pinned, all offline (scratch roots; no gateway boot, no GPU):
  1. RESURRECT: a queued sidecar + _request.json + a live draft doc
     rebuilds the Run (graph rows, request, stages, skipped) and
     re-queues it under the SAME run id, status queued.
  2. FIFO SURVIVES: two queued runs resurrect in created_at order.
  3. BIRTH CERTIFICATE: a queued run whose draft doc is gone does
     NOT resurrect - boot_sweep settles it (queued_lost).
  4. LIVE IDS SHIELDED: boot_sweep(live_run_ids=...) never touches
     a resurrected run's sidecar; a crashed-mid-run sidecar still
     sweeps.
  5. THE RECORD: submit() appends run.queued to the ledger; main()
     resurrects BEFORE sweeping (source-order pin).
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

DRAFT = "d" * 96


def _queued_dir(root: Path, run_id: str, created_at: float,
                draft_id: str = DRAFT) -> None:
    d = root / run_id
    d.mkdir(parents=True)
    (d / "_request.json").write_text(json.dumps(
        {"flow": "durable-wall", "draft_id": draft_id}))
    (d / "_flow.json").write_text(json.dumps({
        "run_id": run_id, "status": "queued", "error": "",
        "stages": [{"id": "n", "name": "n", "index": 0,
                    "status": "pending", "outputs": {},
                    "expected": {}}],
        "skipped_stages": [], "artifacts": [],
        "created_at": created_at, "test": False,
        "draft_id": draft_id, "pipeline": "durable-wall",
        "graph": [{"id": "n", "type": "comfyui", "input_from": [],
                   "input_names": {}, "outputs": {},
                   "params": {"prompt": {"initial": "p"}}}]}))


def _running_dir(root: Path, run_id: str) -> None:
    d = root / run_id
    d.mkdir(parents=True)
    (d / "_flow.json").write_text(json.dumps({
        "run_id": run_id, "status": "running", "error": "",
        "stages": [{"id": "n", "name": "n", "index": 0,
                    "status": "running", "outputs": {},
                    "expected": {}}],
        "skipped_stages": [], "artifacts": [],
        "created_at": time.time(), "test": False,
        "draft_id": DRAFT, "pipeline": "durable-wall",
        "graph": [{"id": "n", "type": "comfyui", "input_from": [],
                   "input_names": {}, "outputs": {},
                   "params": {}}]}))


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    out = tmp_path / "output"
    out.mkdir()
    state = tmp_path / "state"
    (state / "drafts").mkdir(parents=True)
    (state / "drafts" / (DRAFT + ".json")).write_text("{}")
    monkeypatch.setattr(gw_mod, "OUT_ROOT", out)
    monkeypatch.setattr(gw_mod, "TEST_OUT_ROOT", tmp_path / "test-output")
    monkeypatch.setattr(gw_mod, "STATE_ROOT", state)
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")
    return out


def test_queued_run_resurrects_with_same_id(scratch: Path) -> None:
    _queued_dir(scratch, "run-kept", created_at=100.0)
    gw = gw_mod.Gateway()
    assert gw_mod.boot_resurrect(gw) == 1
    assert gw.order == ["run-kept"]
    run = gw.runs["run-kept"]
    assert run.status == "queued"
    assert run.draft_id == DRAFT
    assert run.request == {"flow": "durable-wall", "draft_id": DRAFT}
    assert [s["id"] for s in run.stages] == ["n"]
    assert [n.node_id for n in run.graph.nodes] == ["n"]
    assert run.graph.nodes[0].params["prompt"] == {"initial": "p"}
    assert run.created_at == 100.0
    # the sidecar stays queued on disk - it is the resurrected work
    assert json.loads(
        (scratch / "run-kept" / "_flow.json").read_text())["status"] == "queued"


def test_fifo_order_survives_the_restart(scratch: Path) -> None:
    _queued_dir(scratch, "run-late", created_at=200.0)
    _queued_dir(scratch, "run-early", created_at=100.0)
    gw = gw_mod.Gateway()
    assert gw_mod.boot_resurrect(gw) == 2
    assert gw.order == ["run-early", "run-late"]


def test_missing_draft_sweeps_never_resurrects(scratch: Path) -> None:
    _queued_dir(scratch, "run-orphan", created_at=100.0, draft_id="x" * 96)
    gw = gw_mod.Gateway()
    assert gw_mod.boot_resurrect(gw) == 0
    assert gw.order == []
    assert gw_mod.boot_sweep(live_run_ids=tuple(gw.runs.keys())) == 1
    doc = json.loads((scratch / "run-orphan" / "_flow.json").read_text())
    assert doc["status"] == "failed"
    assert "never executed" in doc["error"]


def test_sweep_shields_live_ids_settles_crashed(scratch: Path) -> None:
    _queued_dir(scratch, "run-live", created_at=100.0)
    _running_dir(scratch, "run-crashed")
    gw = gw_mod.Gateway()
    assert gw_mod.boot_resurrect(gw) == 1
    swept = gw_mod.boot_sweep(live_run_ids=tuple(gw.runs.keys()))
    assert swept == 1  # only the crashed one
    live_doc = json.loads((scratch / "run-live" / "_flow.json").read_text())
    crashed = json.loads((scratch / "run-crashed" / "_flow.json").read_text())
    assert live_doc["status"] == "queued"
    assert crashed["status"] == "failed"


def test_submit_records_run_queued_in_the_ledger(scratch: Path) -> None:
    body = {"flow_inline": {"id": "dur", "stages": [
        {"id": "gen", "engine": "comfyui",
         "inputs": {"prompt": {"initial": "p"}},
         "expected": {"prompt": "text"}}]},
        "draft_id": DRAFT}
    gw = gw_mod.Gateway()
    run = asyncio.run(gw.submit(body))
    assert run.status == "queued"
    lines = gw_mod.LEDGER_PATH.read_text().strip().splitlines()
    events = [json.loads(l) for l in lines]
    queued = [e for e in events if e["event"] == "run.queued"]
    assert len(queued) == 1
    assert queued[0]["data"]["run_id"] == run.run_id
    assert queued[0]["data"]["draft_id"] == DRAFT
    assert queued[0]["data"]["pipeline"] == "dur"


def test_main_resurrects_before_sweeping() -> None:
    src = (REPO / "python" / "gateway.py").read_text()
    main_at = src.index("async def main(")
    assert src.index("boot_resurrect(gw)", main_at) \
        < src.index("boot_sweep(", main_at)
