"""The sidecar witness — _flow.json records WHAT WAS POSTED.

Rework order 2026-09-06 (the 11-attempt character proof's third
bill): a failed run's sidecar carried statuses and errors but NOT the
compiled graph or each stage's resolved input pool — three failures
were unresolvable $channels that a one-look sidecar read would have
named (the exact strings "$photo" / "$seed" rode LoadImage/seed
inputs verbatim into the engine).

Walls:
  - the sidecar carries the compiled graph verbatim (params included)
  - every executed stage records its resolved input pool
  - RESILIENCE LAW intact: atomic write, all stages present
"""
from __future__ import annotations

import asyncio
import json
import sys
import tempfile
import time
from pathlib import Path

from collections.abc import Callable

from _anchor import REPO

# Resolved input pools are JSON values (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

sys.path.insert(0, str(REPO / "python"))

import flow_graph
import gateway as gw_mod


async def _stub_execute(node: flow_graph.NodeRow, run_dir: str, inputs: dict[str, JsonValue],
                        stop_event: asyncio.Event,
                        report: Callable[[dict[str, JsonValue]], None] | None = None
                        ) -> dict[str, dict[str, str] | list[str]]:
    if node.node_id == "rig":
        return {"outputs": {"glb": "/tmp/stub_body.glb"},
                "artifacts": []}
    return {"outputs": {}, "artifacts": []}


class _Run:
    def __init__(self, tmp: Path) -> None:
        self.run_id = "wall-witness"
        self.status = "running"
        self.request = {}
        self.created_at = time.time()
        self.stop_event = asyncio.Event()
        self.stages = [
            {"id": "rig", "name": "rig", "index": 0,
             "status": "pending"},
            {"id": "use", "name": "use", "index": 1,
             "status": "pending"},
        ]
        self.graph = flow_graph.FlowGraph(
            name="wall-witness",
            nodes=(
                flow_graph.NodeRow(
                    node_id="rig", node_type="stub",
                    params={"workflow": {"n": {"class_type": "LoadImage",
                                               "inputs": {
                                                   "image": "$photo"}}}},
                    outputs={"glb": "mesh"}),
                flow_graph.NodeRow(
                    node_id="use", node_type="stub",
                    params={},
                    input_from=("rig.glb",),
                    input_names={"body": "rig.glb"}),
            ))
        self.artifacts = []
        self.skipped_stages = []
        self.error = None
        self.dir = tmp
        self.draft_id = None
        self.card_extra_inputs = {}


class TestSidecarWitness:
    def test_graph_and_inputs_ride_the_sidecar(self) -> None:
        import unittest.mock as _mock
        with tempfile.TemporaryDirectory() as td:
            run = _Run(Path(td))
            gw = gw_mod.Gateway()
            gw.runs[run.run_id] = run
            engine = type("M", (), {
                "execute": staticmethod(_stub_execute)})()
            with _mock.patch.object(gw_mod, "load_engine",
                                    lambda t: engine):
                asyncio.run(gw.execute(run))

            doc = json.loads((run.dir / "_flow.json").read_text())

            # the compiled graph rides verbatim — params INCLUDED
            # (the inline workflow is the thing a post-mortem needs)
            rows = doc["graph"]
            assert [r["id"] for r in rows] == ["rig", "use"]
            assert rows[0]["type"] == "stub"
            assert rows[0]["params"]["workflow"]["n"]["class_type"] \
                == "LoadImage"
            assert rows[1]["input_names"] == {"body": "rig.glb"}
            assert rows[1]["input_from"] == ["rig.glb"]
            assert rows[0]["outputs"] == {"glb": "mesh"}

            # every EXECUTED stage records its resolved input pool —
            # stage 2 received the handoff under ref AND name
            stages = {s["id"]: s for s in doc["stages"]}
            assert stages["rig"]["status"] == "completed"
            assert stages["use"]["status"] == "completed"
            assert stages["use"]["inputs"]["rig.glb"] == \
                "/tmp/stub_body.glb"
            assert stages["use"]["inputs"]["body"] == \
                "/tmp/stub_body.glb"
            assert "inputs" in stages["rig"]

            # atomic write shape intact: the whole doc parsed, run_id
            # present, skipped_stages recorded
            assert doc["run_id"] == "wall-witness"
            assert doc["skipped_stages"] == []
