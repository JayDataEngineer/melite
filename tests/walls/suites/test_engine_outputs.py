"""Engine-outputs mapping (2026-09-06, character-pipeline.md §3).

The comfyui engine returned outputs={prompt_id} only, so a FromStage
mesh wire died at resolve_inputs post-claim. Now: the runner hands
the stage\u2019s DECLARED output channels to the engine ABI NodeRow,
and native.py publishes the first unmatched harvested file per
FILE-kind channel (declaration order). No GPU, no server: pure
channel mapping + a stub-engine two-stage handoff through the real
Gateway.execute.
"""

from __future__ import annotations

import asyncio
import importlib.util
import os
import sys
import tempfile
import time
from collections.abc import Callable
from pathlib import Path
from types import ModuleType
from typing import TYPE_CHECKING

from _anchor import REPO

if TYPE_CHECKING:
    # python/ joins sys.path inside the tests — never at module scope.
    from flow_graph import NodeRow

# Resolved run inputs are JSON values (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def _native() -> ModuleType:
    p = os.path.join(REPO, "packages", "engines", "comfyui", "compose")
    if p not in sys.path:
        sys.path.insert(0, p)
    spec = importlib.util.spec_from_file_location(
        "native_channels_w", os.path.join(p, "native.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["native_channels_w"] = mod
    spec.loader.exec_module(mod)
    return mod

_NATIVE = _native()

ARTS = [
    "/r/skin_body_001.glb",
    "/r/skin_detail_albedo.png",
    "/r/skin_detail_normal.png",
    "/r/turnaround.mp4",
    "/r/voiceover.wav",
    "/r/kind.json",
]


class TestPublishChannels:
    def test_mesh_image_video_audio_map(self) -> None:
        got = _NATIVE.publish_output_channels(
            {"glb": "mesh", "albedo": "image", "clip": "video",
             "voice": "audio"},
            ARTS)
        assert got == {"glb": "/r/skin_body_001.glb",
                        "albedo": "/r/skin_detail_albedo.png",
                        "clip": "/r/turnaround.mp4",
                        "voice": "/r/voiceover.wav"}

    def test_first_unmatched_wins_per_channel(self) -> None:
        got = _NATIVE.publish_output_channels(
            {"first": "image", "second": "image"}, ARTS)
        assert got == {"first": "/r/skin_detail_albedo.png",
                        "second": "/r/skin_detail_normal.png"}

    def test_non_file_kinds_publish_nothing(self) -> None:
        got = _NATIVE.publish_output_channels(
            {"prompt": "text", "seed": "num", "side": "seg",
             "weights": "lora", "glb": "mesh"},
            ARTS)
        assert got == {"glb": "/r/skin_body_001.glb"}

    def test_unmatched_channel_stays_unpublished(self) -> None:
        got = _NATIVE.publish_output_channels(
            {"glb": "mesh", "clip": "video"}, ["/r/kind.json"])
        assert got == {}

    def test_uppercase_suffix_matches(self) -> None:
        got = _NATIVE.publish_output_channels(
            {"shot": "image"}, ["/r/FRONT.PNG"])
        assert got == {"shot": "/r/FRONT.PNG"}


SEEN_ROWS = {}
SEEN_INPUTS = {}


async def _stub_execute(node: NodeRow, run_dir: str, inputs: dict[str, JsonValue],
                        stop_event: asyncio.Event,
                        report: Callable[[dict[str, JsonValue]], None] | None = None
                        ) -> dict[str, dict[str, str] | list[str]]:
    SEEN_ROWS[node.node_id] = dict(getattr(node, "outputs", None) or {})
    SEEN_INPUTS[node.node_id] = dict(inputs)
    if node.node_id == "rig":
        return {"outputs": {"glb": "/tmp/stub_body.glb"}, "artifacts": []}
    return {"outputs": {}, "artifacts": []}


class TestInitialRefAliases:
    """A present-prune rewrite (FromStage → FromInitial) must feed the
    donor's $channels under the RECEIVING name — starter-branch incident
    2026-09-06 (run-97f432846495): "$photo" rode the anny workflow
    verbatim into LoadImage because initial refs published only under
    the initial's own key."""

    def test_initial_ref_publishes_receiving_name(self) -> None:
        sys.path.insert(0, os.path.join(str(REPO), "python"))
        import flow_graph
        import gateway

        node = flow_graph.NodeRow(
            id="body", type="stub",
            input_from=("__initial__.starter_image",),
            input_names={"photo": "__initial__.starter_image"},
        )
        out = gateway.resolve_inputs(
            node, {"starter_image": "/estate/starter.png"})
        assert out["starter_image"] == "/estate/starter.png"
        assert out["photo"] == "/estate/starter.png"

    def test_initial_ref_without_alias_keeps_tensor_only(self) -> None:
        sys.path.insert(0, os.path.join(str(REPO), "python"))
        import flow_graph
        import gateway

        node = flow_graph.NodeRow(
            id="coat", type="stub",
            input_from=("__initial__.kind",),
            input_names={"kind": "__initial__.kind"},
        )
        out = gateway.resolve_inputs(node, {"kind": "keeper"})
        assert out["kind"] == "keeper"
        assert sorted(out) == ["kind"]


class TestMeshHandoff:
    def test_from_stage_mesh_chains(self) -> None:
        sys.path.insert(0, os.path.join(str(REPO), "python"))
        import flow_graph
        import gateway as gw_mod
        import gateway

        class _Run:
            def __init__(self) -> None:
                self.run_id = "wall-handoff"
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
                    name="wall-handoff",
                    nodes=(flow_graph.NodeRow(
                        node_id="rig", node_type="stub", params={},
                        outputs={"glb": "mesh"}),
                    flow_graph.NodeRow(
                        node_id="use", node_type="stub", params={},
                        input_from=("rig.glb",),
                        input_names={"body": "rig.glb"},
                        expected={"body": "mesh"}),))
                self.artifacts = []
                self.skipped_stages = []
                self.error = None
                self.dir = Path(tempfile.mkdtemp())
                self.draft_id = None
                self.card_extra_inputs = {}

        run = _Run()
        gw = gw_mod.Gateway()
        gw.runs[run.run_id] = run
        engine = type("M", (), {
            "execute": staticmethod(_stub_execute)})()
        import unittest.mock as _mock
        with _mock.patch.object(gateway, "load_engine",
                                lambda t: engine):
            asyncio.run(gw.execute(run))
        assert run.stages[0]["status"] == "completed"
        assert run.stages[1]["status"] == "completed"
        # the ABI row carried the declared channels (runner half)
        assert SEEN_ROWS["rig"] == {"glb": "mesh"}
        # the posted channel rode carry into the next stage (carry half:
        # FromStage values arrive under their ref AND their receiving
        # name — the 2026-09-06 incident: $channels speak names, so a
        # chained "$body" rode the workflow verbatim and died).
        assert SEEN_INPUTS["use"]["rig.glb"] == "/tmp/stub_body.glb"
        assert SEEN_INPUTS["use"]["body"] == "/tmp/stub_body.glb"
        # ... and the $channel the receiving workflow actually uses
        # substitutes end to end (expand_inject over resolved inputs).
        expanded = gw_mod.expand_inject(
            {"workflow": {"apply": {"inputs": {
                "body_glb_path": "$body"}}}},
            SEEN_INPUTS["use"])
        assert expanded["workflow"]["apply"]["inputs"][
            "body_glb_path"] == "/tmp/stub_body.glb"
