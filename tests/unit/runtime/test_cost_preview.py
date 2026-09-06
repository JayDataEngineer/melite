"""test_cost_preview.py - the R4.3 cost/preview wall (2026-09-06;
design record docs/design/production-architecture-review.md
R4 item 3: an agent that can see "45 min queued" can choose
differently). The validate door answers queue_depth, a rough
eta_queue_s (median of the last 128 settled run totals × depth),
and per-engine stage medians with sample counts - every unknown
is None/0, never a guess. All offline (stub engine).
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
DRAFT = "c" * 96


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


class _FastEngine:
    async def execute(self, abi: NodeRow, run_dir: str,
                      inputs: dict[str, JsonValue],
                      stop: asyncio.Event,
                      report: "type[object] | None" = None,
                      ) -> dict[str, JsonValue]:
        return {"outputs": {"images": "ok.png"}, "artifacts": []}


def _run(scratch: Path, run_id: str) -> gw_mod.Run:
    row = NodeRow(**{"id": "gen", "type": "faststub",
                     "params": {"prompt": {"initial": "p"}}})
    run = gw_mod.Run(
        run_id=run_id,
        graph=FlowGraph(name="cost-wall", nodes=(row,)),
        request={"flow_inline": {}}, draft_id=DRAFT)
    run.stages = [{"id": "gen", "name": "gen", "index": 0,
                   "status": "pending", "outputs": {}, "expected": {}}]
    (scratch / run_id).mkdir(exist_ok=True)
    return run


def test_execute_records_stage_duration(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(gw_mod, "load_engine",
                        lambda t: _FastEngine())
    gw = gw_mod.Gateway()
    run = _run(scratch, "run-cost1")
    asyncio.run(gw.execute(run))
    assert run.stages[0]["duration_s"] >= 0
    assert gw._stage_hist["faststub"][-1] == run.stages[0]["duration_s"]


def test_cost_preview_honest_without_history() -> None:
    gw = gw_mod.Gateway()
    cost = gw.cost_preview(["comfyui"])
    assert cost["queue_depth"] == 0
    assert cost["eta_queue_s"] is None      # no data, no guess
    assert cost["stages"] == [{"engine": "comfyui",
                               "median_s": None, "samples": 0}]


def test_cost_preview_medians_and_eta() -> None:
    gw = gw_mod.Gateway()
    gw._stage_hist["comfyui"] = [10.0, 20.0, 30.0]
    gw._run_totals = [100.0, 200.0, 300.0]   # median 200
    gw.order += ["run-a", "run-b"]
    cost = gw.cost_preview(["comfyui"])
    assert cost["queue_depth"] == 2
    assert cost["eta_queue_s"] == 400.0      # 200 x 2
    assert cost["stages"][0]["median_s"] == 20.0
    assert cost["stages"][0]["samples"] == 3


def test_validate_answers_cost_block(
        scratch: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(gw_mod, "load_engine",
                        lambda t: _FastEngine())
    gw = gw_mod.Gateway()
    run = _run(scratch, "run-cost2")
    asyncio.run(gw.execute(run))            # seed the history
    body = {"flow_inline": {
        "id": "cost-wall",
        "stages": [{"id": "gen", "engine": "comfyui",
                    "params": {"server_url": "http://127.0.0.1:1",
                               "prompt": "x", "width": 64,
                               "height": 64, "steps": 1,
                               "seed": 1}}]}}
    status, payload = asyncio.run(
        gw_mod.route(gw, "POST", "/v1/flows/validate",
                     json.dumps(body).encode()))
    assert status == 200, payload
    assert isinstance(payload, dict)
    cost = payload["cost"]
    assert cost["queue_depth"] == 0
    assert isinstance(cost["stages"], list) and cost["stages"]


def test_duration_ring_is_bounded() -> None:
    gw = gw_mod.Gateway()
    for i in range(100):
        gw._record_stage_duration("x", float(i))
    assert len(gw._stage_hist["x"]) == 64
    assert gw._stage_hist["x"][-1] == 99.0