"""Engine-outputs mapping (2026-09-06, character-pipeline.md §3).

The comfyui engine returned outputs={prompt_id} only, so a FromStage
mesh wire died at resolve_inputs post-claim. Now: the runner hands
the stage\u2019s DECLARED output channels to the engine ABI NodeRow,
and native.py publishes the first unmatched harvested file per
FILE-kind channel (declaration order). No GPU, no server: pure
channel mapping.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the
TestInitialRefAliases legs (py resolve_inputs units) and the
TestMeshHandoff leg (py Gateway.execute stub harness) died with
the py serving oracle — retired with cause below. The publish
mapping legs (compose/native.py, a keeper) stay.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
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


# ORACLE DEATH 2026-09-08: TestInitialRefAliases (two py
# resolve_inputs unit legs) + TestMeshHandoff (the py
# Gateway.execute stub-engine handoff) + the _stub_execute harness
# above RETIRED WITH CAUSE — all three drove the py serving
# oracle's in-process runtime (gateway.resolve_inputs /
# Gateway.execute / expand_inject), which died with the oracle per
# the operator order "we do not need parity, we need to migrate,
# not keep the old machinery". Coverage now:
#   - the static half (receiving-name $channels resolve when wired)
#     is pinned TS-HTTP by tests/walls/suites/test_channel_resolution.py
#     TestTsChannelPin (dangling 400s, resolved 200s);
#   - the runtime half (stub-engine two-stage handoff end to end)
#     is pinned TS-ONLY by tests/walls/suites/test_gateway_e2e_tsboot.py
#     (D-phase terminal golden + S-phase replay).
# Date: 2026-09-08. Status: landed (oracle-death re-derivation).
