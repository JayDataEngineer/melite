"""$channel resolution — the compile-time twin of the runtime pool.

Incident class (character flow, 2026-09-06, three queued GPU runs):
  a stage's params reference "$name"; nothing resolves it; the
  runtime substitution (gateway._deep_expand) passes unknown $-strings
  through SILENTLY ("$100 bill" is legitimate prompt text), so the
  bug surfaced only as a downstream engine refusal — "Invalid image
  file: $photo" / "invalid literal for int(): '$seed'".

The door: FlowGraph.unresolved_channels() judges every whole-string
$name in a node's params against the pool the executor would publish
for that node; Flow.compile refuses (4xx at BOTH doors) before any
queue slot or GPU claim.

Walls here:
  - a dangling token is reported with its stage and the true pool
  - the incident shape resolves: receiving name AND tensor key
  - THE MIRROR PIN — the static pool equals resolve_inputs' keys
    exactly, so the check and the executor cannot drift apart
  - Flow.compile raises FlowError; resolve_request 4xxes
  - every flow on disk compiles with zero unresolved channels
"""
from __future__ import annotations

import sys

import pytest

from _anchor import REPO

# Node params are JSON values (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

sys.path.insert(0, str(REPO / "py"))

import flow as flow_mod
import flow_graph
import gateway as gw_mod

FLOWS_DIR = REPO / "flows"


def _row(**kw: str | tuple[str, ...] | dict[str, JsonValue]) -> flow_graph.NodeRow:
    base = dict(id="use", type="comfyui", params={
        "workflow": {"n": {"class_type": "LoadImage",
                           "inputs": {"image": "$photo"}}}})
    base.update(kw)
    return flow_graph.NodeRow(**base)


class TestUnresolvedChannels:
    def test_dangling_token_reported_with_stage_and_pool(self) -> None:
        g = flow_graph.FlowGraph(
            name="w", nodes=(_row(input_from=("__initial__.other",),),))
        bad = g.unresolved_channels()
        assert bad == (("use", "photo", ("other",)),)

    def test_incident_shape_resolves_both_spellings(self) -> None:
        row = _row(
            params={"workflow": {"n": {"class_type": "LoadImage",
                                  "inputs": {"image": "$photo",
                                             "backup": "$starter_image"}}}},
            input_from=("__initial__.starter_image",),
            input_names={"photo": "__initial__.starter_image"},
        )
        g = flow_graph.FlowGraph(name="w", nodes=(row,))
        assert g.unresolved_channels() == ()

    def test_prompt_prose_is_not_a_channel(self) -> None:
        # embedded $ ("x$seed y") is prose at runtime — only whole
        # strings starting with $ are tokens; the tokenizer mirrors
        # _deep_expand exactly.
        row = _row(params={"prompt": "a $100 bill and x$seed y"})
        g = flow_graph.FlowGraph(name="w", nodes=(row,))
        assert g.unresolved_channels() == ()

    def test_pool_mirrors_resolve_inputs_exactly(self) -> None:
        # THE MIRROR PIN: what the static check accepts is exactly
        # what the executor publishes — keys, no more, no less.
        row = _row(
            input_from=("__initial__.starter_image", "rig.body"),
            input_names={"photo": "__initial__.starter_image",
                         "body": "rig.body"},
        )
        g = flow_graph.FlowGraph(name="w", nodes=(row,))
        pool = g._channel_pool(row)
        resolved = gw_mod.resolve_inputs(
            row, {"starter_image": "/s.png", "rig.body": "/b.glb"})
        assert pool == set(resolved)

    def test_compile_refuses_with_stage_and_token(self) -> None:
        body = {
            "id": "w-dangle",
            "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": {"n": {
                     "class_type": "LoadImage",
                     "inputs": {"image": "$photo"}}}}},
            ],
        }
        fl = flow_mod.flow_from_body(body)
        with pytest.raises(flow_mod.FlowError) as ei:
            fl.compile({})
        msg = str(ei.value)
        assert "unresolved $channel" in msg
        assert "'gen'" in msg and "$photo" in msg

    def test_validate_door_refuses_inline_dangle(self) -> None:
        body = {
            "id": "w-dangle-door",
            "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": {"n": {
                     "class_type": "LoadImage",
                     "inputs": {"image": "$nope"}}}}},
            ],
        }
        with pytest.raises(gw_mod.ValidationError) as ei:
            gw_mod.resolve_request({"flow_inline": body})
        assert "unresolved $channel" in str(ei.value)


class TestEstateSweep:
    def test_every_flow_on_disk_resolves_clean(self) -> None:
        names = sorted(p.parent.name for p in
                       FLOWS_DIR.glob("*/flow.py"))
        assert names, "no flows found — the sweep went blind"
        for name in names:
            g = flow_mod.load_flow(name).to_graph()
            bad = g.unresolved_channels()
            assert bad == (), "%s: %s" % (name, bad)
