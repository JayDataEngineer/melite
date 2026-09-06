"""test_queue_bounds.py — the R2 memory-bound wall (2026-09-06;
design record docs/design/production-architecture-review.md R2 —
"unbounded memory: runs registry never evicted; WS subscriber
queues unbounded put_nowait" was the named gap).

Pinned, all offline:
  1. BOUNDED BUS: every subscriber queue is born with maxsize
     (SUBSCRIBER_Q_MAX); publish past the cap drops the OLDEST
     frame and delivers the newest — a stalled subscriber can
     neither grow without end nor miss a terminal frame.
  2. TERMINAL SURVIVES: after a full queue, a terminal run frame
     is the newest delivered frame (the WS door releases).
  3. REGISTRY CAP: _evict_settled caps settled rows at
     MAX_SETTLED_RUNS, oldest created_at first; queued/running
     rows are NEVER evicted (live ids stay live).
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

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _run(run_id: str, status: str, age: float = 0.0) -> gw_mod.Run:
    graph = FlowGraph(name="bounds-wall", nodes=(
        NodeRow(**{"id": "n", "type": "comfyui", "params": {}}),))
    run = gw_mod.Run(run_id=run_id, graph=graph, request={},
                     draft_id="d" * 96)
    run.status = status
    run.created_at = time.time() - age
    return run


def test_subscriber_queues_are_born_bounded() -> None:
    gw = gw_mod.Gateway()
    q = gw.subscribe("run-b")
    assert q.maxsize == gw_mod.SUBSCRIBER_Q_MAX
    assert q.maxsize > 0  # 0 would mean unbounded — the R2 gap itself


def test_publish_past_cap_drops_oldest_keeps_newest() -> None:
    gw = gw_mod.Gateway()
    q = gw.subscribe("run-b")
    for i in range(gw_mod.SUBSCRIBER_Q_MAX + 44):
        gw.publish("run-b", {"type": "stage", "step": i})
    assert q.qsize() == gw_mod.SUBSCRIBER_Q_MAX
    # the 44 OLDEST ticks were dropped; the newest is delivered
    drained = [q.get_nowait() for _ in range(gw_mod.SUBSCRIBER_Q_MAX)]
    assert drained[0]["step"] == 44
    assert drained[-1]["step"] == gw_mod.SUBSCRIBER_Q_MAX + 43


def test_terminal_frame_survives_a_full_queue() -> None:
    gw = gw_mod.Gateway()
    q = gw.subscribe("run-b")
    for i in range(gw_mod.SUBSCRIBER_Q_MAX):
        gw.publish("run-b", {"type": "stage", "step": i})
    terminal = {"type": "run", "status": "completed"}
    gw.publish("run-b", terminal)
    last = None
    while not q.empty():
        last = q.get_nowait()
    assert last == terminal


def test_evict_settled_caps_at_max_never_touches_live() -> None:
    gw = gw_mod.Gateway()
    n = gw_mod.MAX_SETTLED_RUNS + 5
    for i in range(n):
        r = _run("run-done-%d" % i, "completed", age=float(n - i))
        gw.runs[r.run_id] = r
    live = _run("run-live", "running", age=1.0)
    queued = _run("run-q", "queued", age=0.5)
    gw.runs[live.run_id] = live
    gw.runs[queued.run_id] = queued
    gw._evict_settled()
    settled = [k for k, v in gw.runs.items()
               if v.status in ("completed", "failed")]
    assert len(settled) == gw_mod.MAX_SETTLED_RUNS
    # oldest left first
    assert "run-done-0" not in gw.runs
    assert "run-done-%d" % (n - gw_mod.MAX_SETTLED_RUNS - 1) not in gw.runs
    # live rows never evicted
    assert "run-live" in gw.runs and "run-q" in gw.runs


def test_evict_noop_under_cap() -> None:
    gw = gw_mod.Gateway()
    for i in range(3):
        gw.runs["run-%d" % i] = _run("run-%d" % i, "completed")
    gw._evict_settled()
    assert len(gw.runs) == 3
