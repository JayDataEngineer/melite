"""test_metrics_door.py — the /v1/metrics wall (R2 observability,
2026-09-06; design record docs/design/production-architecture-review.md
R2 — "no metrics door" was the named gap).

Pinned, all offline (no gateway boot, no GPU):
  1. SHAPE: the door answers one JSON object with exactly the
     observability keys (depth, queued order, active row or None,
     registry counts, subscriber fan-out, boot/uptime, recent ring).
  2. TRUTH: the numbers derive from the LIVE registry — counts sum
     to runs_registered, queued mirrors Gateway.order, active is
     the active Run with its queue-wait stamp.
  3. TIMINGS: _recent_row reads the worker stamps; absent stamps
     (a run settled outside the worker) report None, never a lie.
  4. ROUTE TRUTH: the door is in the ROUTES table (docs/gateway/
     endpoints.md is generated from it — api-doc parity owns that).
"""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

# Test doubles speak real rows (PYTHON SHAPE LAW).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _run(run_id: str, status: str, age: float = 0.0) -> gw_mod.Run:
    graph = FlowGraph(name="metrics-wall", nodes=(
        NodeRow(**{"id": "n", "type": "comfyui", "params": {}}),))
    run = gw_mod.Run(run_id=run_id, graph=graph,
                     request={"flow": "metrics-wall"},
                     draft_id="d" * 96)
    run.status = status
    run.created_at = time.time() - age
    return run


def _ctx(gw: gw_mod.Gateway) -> gw_mod._Ctx:
    return gw_mod._Ctx(gw, "GET", "/v1/metrics", "/v1/metrics", {}, b"")


def test_route_registered() -> None:
    paths = {(r.method, r.path) for r in gw_mod.ROUTES}
    assert ("GET", "/v1/metrics") in paths


def test_shape_and_truth() -> None:
    gw = gw_mod.Gateway()
    queued = _run("run-q", "queued")
    done = _run("run-done", "completed", age=90.0)
    gw.runs = {"run-q": queued, "run-done": done}
    gw.order = ["run-q"]
    gw.active = None
    gw.subscribe("run-q")  # one live subscriber
    code, payload = asyncio.run(gw_mod._h_metrics(_ctx(gw)))
    assert code == 200
    assert payload["queue_depth"] == 1
    assert payload["queued"] == ["run-q"]
    assert payload["active"] is None
    assert payload["runs_registered"] == 2
    assert payload["runs_by_status"] == {"queued": 1, "completed": 1}
    assert payload["subscribers"] == {"run-q": 1}
    assert payload["recent"] == []
    assert payload["uptime_s"] >= 0.0
    assert set(payload) == {
        "boot_at", "uptime_s", "queue_depth", "queued", "active",
        "runs_registered", "runs_by_status", "subscribers", "recent"}


def test_active_row_carries_queue_wait() -> None:
    gw = gw_mod.Gateway()
    run = _run("run-a", "running", age=7.5)
    run._started_at = run.created_at + 2.5
    gw.runs = {"run-a": run}
    gw.active = run
    code, payload = asyncio.run(gw_mod._h_metrics(_ctx(gw)))
    assert code == 200
    row = payload["active"]
    assert row is not None and row["run_id"] == "run-a"
    assert row["pipeline"] == "metrics-wall"
    assert row["status"] == "running"
    assert row["queue_wait_s"] == 2.5


def test_recent_row_timings_honest_without_stamps() -> None:
    unstamped = _run("run-x", "failed")
    row = gw_mod._recent_row(unstamped)
    assert row == {"run_id": "run-x", "pipeline": "metrics-wall",
                   "status": "failed", "wait_s": None, "total_s": None}
    stamped = _run("run-y", "completed")
    stamped._started_at = stamped.created_at + 3.0
    stamped._finished_at = stamped._started_at + 11.0
    row2 = gw_mod._recent_row(stamped)
    assert row2["wait_s"] == 3.0 and row2["total_s"] == 11.0


def test_recent_ring_is_bounded() -> None:
    gw = gw_mod.Gateway()
    for i in range(120):
        gw.recent.append(gw_mod._recent_row(_run("run-%d" % i, "completed")))
    code, payload = asyncio.run(gw_mod._h_metrics(_ctx(gw)))
    assert code == 200
    assert len(payload["recent"]) == 50  # the deque cap, not 120
    assert payload["recent"][0]["run_id"] == "run-70"
    assert payload["recent"][-1]["run_id"] == "run-119"
