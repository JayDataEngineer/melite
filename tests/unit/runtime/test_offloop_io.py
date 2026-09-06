"""test_offloop_io.py - the R2 off-loop I/O wall (2026-09-06;
design record docs/design/production-architecture-review.md R2 -
"blocking sync I/O on the asyncio loop" was the named gap; the
sidecar rewrite is the hot path: a 30-step video rewrites the FULL
JSON hundreds of times per run).

Pinned, all offline (no gateway boot, no GPU):
  1. OFF THE LOOP: _sidecar_offloop executes sidecar() on a WORKER
     thread - never the event-loop thread that awaits it.
  2. SERIALIZED: two concurrent off-loop writes never interleave
     (the per-gateway _io_lock is the writer contract - atomic_write
     tmp path is per-file).
  3. SYNC CALLERS UNCHANGED: the module-level sidecar() stays a
     plain sync function (boot sweep + engine report callbacks).
"""

from __future__ import annotations

import asyncio
import inspect
import sys
import threading
import time
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402
from flow_graph import FlowGraph, NodeRow  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _run(run_id: str) -> gw_mod.Run:
    graph = FlowGraph(name="offloop-wall", nodes=(
        NodeRow(**{"id": "n", "type": "comfyui", "params": {}}),))
    return gw_mod.Run(run_id=run_id, graph=graph, request={},
                      draft_id="d" * 96)


def test_sidecar_write_runs_off_the_loop_thread(
        monkeypatch: pytest.MonkeyPatch) -> None:
    gw = gw_mod.Gateway()
    threads: list[int] = []

    def fake_sidecar(run: gw_mod.Run) -> None:
        threads.append(threading.get_ident())

    monkeypatch.setattr(gw_mod, "sidecar", fake_sidecar)
    loop_thread = threading.get_ident()
    asyncio.run(gw._sidecar_offloop(_run("run-o")))
    assert threads and threads[0] != loop_thread


def test_offloop_writes_serialize_per_gateway(
        monkeypatch: pytest.MonkeyPatch) -> None:
    gw = gw_mod.Gateway()
    order: list[str] = []

    def fake_sidecar(run: gw_mod.Run) -> None:
        order.append("enter:%s" % run.run_id)
        time.sleep(0.02)
        order.append("exit:%s" % run.run_id)

    monkeypatch.setattr(gw_mod, "sidecar", fake_sidecar)

    async def two() -> None:
        await asyncio.gather(
            gw._sidecar_offloop(_run("run-a")),
            gw._sidecar_offloop(_run("run-b")))

    asyncio.run(two())
    # a writer fully exits before the next enters - never two
    # threads mid-write on the same tmp path
    for i, ev in enumerate(order):
        if ev.startswith("enter"):
            assert order[i + 1] == "exit:" + ev[6:], order
    assert len(order) == 4


def test_sync_sidecar_still_a_plain_function() -> None:
    assert not inspect.iscoroutinefunction(gw_mod.sidecar)
    assert inspect.iscoroutinefunction(gw_mod.Gateway._sidecar_offloop)
