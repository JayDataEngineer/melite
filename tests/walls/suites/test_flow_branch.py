"""The BRANCH system (2026-09-06, docs/design/character-pipeline.md §2).

Starter-image branches: a stage declares skip_when (an initial + a
present|absent condition); the start/validate doors prune before
registration, and a remaining FromStage edge into a present-pruned
stage rewrites to FromInitial (the trigger key — present by
construction). No new edge kind, no runtime conditional, no silent
dangle.
"""

import copy

import pytest

from _anchor import REPO  # noqa: F401  (wall-suite import contract)

import flow as flow_mod
from flow import (Flow, FlowError, FromInitial, FromStage, Kind, Stage,
                  StageSkip, SkipWhen)
from flow import flow_from_body

# Request bodies are decoded JSON (annotations only; no future-import
# in this module, so the alias uses the string-forward-ref form).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _branch() -> Flow:
    return Flow(
        id="wall-branch",
        stages=(
            Stage(id="img", engine="comfyui",
                  outputs={"photo": Kind.image},
                  skip_when=StageSkip(initial="starter_image",
                                      when=SkipWhen.present)),
            Stage(id="body", engine="comfyui",
                  inputs={"photo": FromStage(stage="img", output="photo")},
                  expected={"photo": Kind.image},
                  outputs={"default": Kind.mesh}),
        ))


class TestBranchRows:
    def test_closed_condition_vocabulary(self) -> None:
        with pytest.raises(ValueError):
            StageSkip(initial="starter_image", when="sometimes")

    def test_empty_initial_refuses(self) -> None:
        with pytest.raises(ValueError):
            StageSkip(initial="", when=SkipWhen.present)

    def test_unset_branch_runs(self) -> None:
        assert Stage(id="a", engine="comfyui").skip_when is None

    def test_keys_mirror_the_row(self) -> None:
        assert flow_mod.STAGE_KEYS == set(Stage.model_fields)


class TestPrune:
    def test_no_branch_returns_self(self) -> None:
        fl = Flow(id="plain", stages=(Stage(id="a", engine="comfyui"),))
        kept, skipped = fl.pruned_for({})
        assert kept is fl and skipped == ()

    def test_present_fires_and_merges(self) -> None:
        kept, skipped = _branch().pruned_for({"starter_image": "s.png"})
        assert skipped == ("img",)
        assert [s.id for s in kept.stages] == ["body"]
        edge = kept.stages[0].inputs["photo"]
        assert edge == FromInitial(key="starter_image")

    def test_absent_key_keeps_both(self) -> None:
        kept, skipped = _branch().pruned_for({})
        assert skipped == ()
        assert [s.id for s in kept.stages] == ["img", "body"]

    def test_absent_trigger_prunes_clean(self) -> None:
        fl = Flow(
            id="opt",
            stages=(Stage(id="main", engine="comfyui"),
                    Stage(id="extra", engine="comfyui",
                          skip_when=StageSkip(initial="opt_in",
                                              when=SkipWhen.absent)),))
        kept, skipped = fl.pruned_for({})
        assert skipped == ("extra",)
        assert [s.id for s in kept.stages] == ["main"]

    def test_dangle_into_absent_prune_is_loud(self) -> None:
        fl = Flow(
            id="dangle",
            stages=(Stage(id="gen", engine="comfyui",
                          outputs={"photo": Kind.image},
                          skip_when=StageSkip(initial="opt_in",
                                              when=SkipWhen.absent)),
                    Stage(id="use", engine="comfyui",
                          inputs={"p": FromStage(stage="gen",
                                                output="photo")},
                          expected={"p": Kind.image}),))
        with pytest.raises(FlowError) as ei:
            fl.pruned_for({})
        msg = str(ei.value)
        assert "use" in msg and "gen" in msg

    def test_fully_pruned_never_registers(self) -> None:
        fl = Flow(
            id="gone",
            stages=(Stage(id="only", engine="comfyui",
                          skip_when=StageSkip(initial="k",
                                              when=SkipWhen.present)),))
        with pytest.raises(FlowError) as ei:
            fl.pruned_for({"k": 1})
        assert "every stage" in str(ei.value)


_INLINE_BRANCH = {
    "id": "wall-inline-branch",
    "description": "starter image skips generation",
    "stages": [
        {"id": "img", "engine": "comfyui",
         "outputs": {"photo": "image"},
         "skip_when": {"initial": "starter_image", "when": "present"}},
        {"id": "body", "engine": "comfyui",
         "inputs": {"photo": {"stage": "img", "output": "photo"}},
         "expected": {"photo": "image"},
         "outputs": {"default": "mesh"}},
    ],
}


class TestInlineBranch:
    def test_skip_shape_parses(self) -> None:
        fl = flow_from_body(copy.deepcopy(_INLINE_BRANCH))
        assert fl.stages[0].skip_when == StageSkip(
            initial="starter_image", when=SkipWhen.present)

    def test_bad_condition_names_vocabulary(self) -> None:
        bad = copy.deepcopy(_INLINE_BRANCH)
        bad["stages"][0]["skip_when"]["when"] = "sometimes"
        with pytest.raises(FlowError) as ei:
            flow_from_body(bad)
        assert "sometimes" in str(ei.value)

    def test_bad_shape_refuses(self) -> None:
        bad = copy.deepcopy(_INLINE_BRANCH)
        bad["stages"][0]["skip_when"] = {"initial": "starter_image"}
        with pytest.raises(FlowError) as ei:
            flow_from_body(bad)
        assert "skip_when" in str(ei.value)


class TestBranchDoors:
    def test_resolve_prunes_and_stamps(self) -> None:
        from gateway import resolve_request
        graph = resolve_request({"flow_inline": copy.deepcopy(_INLINE_BRANCH),
                                 "starter_image": "estate/starter.png"})
        assert graph.skipped == ("img",)
        assert [n.node_id for n in graph.nodes] == ["body"]
        assert graph.nodes[0].input_from == ("__initial__.starter_image",)

    def test_resolve_without_key_runs_both(self) -> None:
        from gateway import resolve_request
        graph = resolve_request(
            {"flow_inline": copy.deepcopy(_INLINE_BRANCH)})
        assert graph.skipped == ()
        assert [n.node_id for n in graph.nodes] == ["img", "body"]

    def test_validate_reports_skipped(self) -> None:
        import asyncio
        import gateway as gw_mod

        class _Ctx:
            # the door reads ctx.json (the request) and ctx.gw (the
            # R4.3 cost_preview — added after this stub was written;
            # a minimal gw whose preview answers "no data" honestly)
            def __init__(self, j: dict[str, JsonValue]) -> None:
                self.json = j
                self.gw = _NoHistoryGw()

        class _NoHistoryGw:
            @staticmethod
            def cost_preview(engine_types=None) -> dict:
                return {}

        code, body = asyncio.run(gw_mod._h_flows_validate(_Ctx({
            "flow_inline": copy.deepcopy(_INLINE_BRANCH),
            "starter_image": "estate/starter.png"})))
        assert code == 200 and body["ok"] is True
        assert body["skipped"] == ["img"]
        assert [s["id"] for s in body["stages"]] == ["body"]

        code, body = asyncio.run(gw_mod._h_flows_validate(_Ctx(
            copy.deepcopy(_INLINE_BRANCH))))
        assert code == 200 and body["skipped"] == []

    def test_branch_survives_estate_load(self) -> None:
        for name in flow_mod.scan_flow_ids():
            fl = flow_mod.load_flow(name)
            assert fl.pruned_for({})[1] == ()
