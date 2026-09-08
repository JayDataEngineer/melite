"""Character-flow walls (2026-09-06, docs/design/character-pipeline.md).

No GPU, no server: from_flow fidelity (the reused rows ARE the donor
rows — every field except id/inputs identical), from_flow refusals,
the z-image builder replayed against the lane template, the garment
workflow replayed against the pixal_t1 renderer, and the branch
compile matrix (full-gen vs starter-supplied).
"""

import importlib.util
import json
import os
import sys

import pytest

from _anchor import REPO

PY = os.path.join(str(REPO), "py")
if PY not in sys.path:
    sys.path.insert(0, PY)
for _p in (os.path.join(str(REPO), "packages", "engines", "comfyui"),
           os.path.join(str(REPO), "packages", "engines", "comfyui",
                        "compose")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from flow import FlowError, FromInitial, FromStage, Stage, load_flow

# Loaded workflows/templates are JSON documents (no future-import in
# this module, so the alias uses the string-forward-ref form).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

CHAR = load_flow("character")


def _donor(flow_id: str, stage_id: str) -> Stage:
    donor = load_flow(flow_id)
    return next(s for s in donor.stages if s.id == stage_id)


def _mine(stage_id: str) -> Stage:
    return next(s for s in CHAR.stages if s.id == stage_id)


class TestFromFlowFidelity:
    @pytest.mark.parametrize("flow_id,stage_id,mine", [
        ("anny-hmr-commercial", "estimate", "body"),
        ("body-to-somax", "rig", "rig"),
        ("skin-apply", "coat", "coat"),
        ("fit-seat", "seat", "seat"),
    ])
    def test_reused_row_is_the_donor_row(self, flow_id: str, stage_id: str, mine: str) -> None:
        donor = _donor(flow_id, stage_id)
        got = _mine(mine)
        assert got.engine == donor.engine
        assert got.params == donor.params
        assert got.expected == donor.expected
        assert got.outputs == donor.outputs
        assert got.description == donor.description

    def test_rewired_inputs(self) -> None:
        body = _mine("body")
        assert body.inputs == {"photo": FromStage(stage="img",
                                                    output="photo")}
        rig = _mine("rig")
        assert rig.inputs == {"glb": FromStage(stage="body",
                                                 output="body")}
        coat = _mine("coat")
        assert coat.inputs["body"] == FromStage(stage="rig",
                                                  output="body")
        assert coat.inputs["kind"] == FromInitial(key="kind")
        seat = _mine("seat")
        assert seat.inputs["body"] == FromStage(stage="coat",
                                                  output="skin")
        assert seat.inputs["prop"] == FromStage(stage="garment",
                                                  output="garment")

    def test_unknown_donor_refuses(self) -> None:
        with pytest.raises(FlowError, match="no such stage"):
            Stage.from_flow("skin-apply", "nope")
        with pytest.raises(FlowError, match="no flow at"):
            Stage.from_flow("no-such-flow", "coat")

    def test_unknown_input_name_refuses(self) -> None:
        with pytest.raises(FlowError, match="unknown input"):
            Stage.from_flow("skin-apply", "coat",
                            inputs={"sidecar": FromInitial(key="x")})


def _template() -> dict[str, JsonValue]:
    p = os.path.join(str(REPO), "packages", "engines", "comfyui",
                     "models", "image", "z-image",
                     "generate_t2i.json")
    with open(p) as fh:
        return json.load(fh)


class TestZImageBuilder:
    @pytest.mark.parametrize("mine,text,seed,prefix", [
        ("img", "$character_prompt", 20260906, "character_img"),
        ("gimg", "$garment_prompt", 20260907, "character_gimg"),
    ])
    def test_builder_is_the_template_plus_swaps(self, mine: str, text: str,
                                                 seed: int, prefix: str) -> None:
        want = _template()
        want["CLIPTextEncode.0"]["inputs"]["text"] = text
        want["KSampler.0"]["inputs"]["seed"] = seed
        want["SaveImage.0"]["inputs"]["filename_prefix"] = prefix
        assert _mine(mine).params["workflow"] == want


def _render_pixal_canonical() -> dict[str, JsonValue]:
    img_py = os.path.join(str(REPO), "packages", "engines", "comfyui",
                          "action_cards", "3d", "img_to_mesh", "py")
    spec = importlib.util.spec_from_file_location(
        "i2m_rend_char_w", os.path.join(img_py, "renderer.py"))
    rend = importlib.util.module_from_spec(spec)
    sys.modules["i2m_rend_char_w"] = rend
    spec.loader.exec_module(rend)
    mdir = os.path.join(str(REPO), "packages", "engines", "comfyui",
                        "models", "3d", "pixal3d", "model.py")
    spec2 = importlib.util.spec_from_file_location(
        "pixal3d_model_char_w", mdir)
    model = importlib.util.module_from_spec(spec2)
    sys.modules["pixal3d_model_char_w"] = model
    spec2.loader.exec_module(model)
    pm = [v for v in vars(model).values()
          if isinstance(v, type) and getattr(v, "id", "") == "pixal3d"][0]
    return rend.render_pixal_t1(
        rend.PixalT1Doc(input_image="$garment_image", seed=42), pm)


class TestGarmentWorkflow:
    def test_workflow_is_the_renderer_output(self) -> None:
        assert (_mine("garment").params["workflow"]
                == _render_pixal_canonical())

    def test_remesh_tail_folded_in_chain(self) -> None:
        wf = _mine("garment").params["workflow"]
        kinds = [v.get("class_type") for v in wf.values()]
        assert "RemeshMesh" in kinds and "DecimateMesh" in kinds


def _full_initials() -> dict[str, str | int | float]:
    return {
        "character_prompt": "a keeper of the caravan, full body",
        "garment_prompt": "a weathered leather duster coat",
        "kind": "keeper",
        "map_size": 512,
        "seed": 20260906,
        "model_name": "keeper_duster",
        "bone": "mixamorig:Hips",
        "align": "grip",
        "position": "0,0,0",
        "rotation": "0,0,0",
        "fit_ratio": 1.0,
        "fit_ref_bone": "mixamorig:Hips",
        "fit_ref_bone2": "mixamorig:Spine",
        "seat_ratio": 1.0,
        "finger_bone": "Finger",
        "thumb_bone": "Thumb",
        "target_width": 0.25,
    }


class TestGraphNames:
    def test_compiled_rows_carry_the_name_map(self) -> None:
        graph = CHAR.to_graph()
        by_id = {n.node_id: n for n in graph.nodes}
        assert by_id["body"].input_names == {"photo": "img.photo"}
        assert by_id["coat"].input_names["body"] == "rig.body"
        assert by_id["coat"].input_names["kind"] == "__initial__.kind"
        assert by_id["seat"].input_names == {
            "body": "coat.skin", "prop": "garment.garment",
            "model_name": "__initial__.model_name",
            "bone": "__initial__.bone",
            "align": "__initial__.align",
            "position": "__initial__.position",
            "rotation": "__initial__.rotation",
            "fit_ratio": "__initial__.fit_ratio",
            "fit_ref_bone": "__initial__.fit_ref_bone",
            "fit_ref_bone2": "__initial__.fit_ref_bone2",
            "seat_ratio": "__initial__.seat_ratio",
            "finger_bone": "__initial__.finger_bone",
            "thumb_bone": "__initial__.thumb_bone",
            "target_width": "__initial__.target_width"}


class TestBranchCompile:
    def test_full_gen_prunes_nothing(self) -> None:
        pruned, skipped = CHAR.pruned_for(_full_initials())
        assert skipped == ()
        assert [s.id for s in pruned.stages] == [
            "img", "gimg", "body", "rig", "garment", "coat",
            "seat"]

    def test_starter_branches_rewrite(self) -> None:
        body = dict(_full_initials(), starter_image="s.png",
                    garment_image_1="g.png")
        pruned, skipped = CHAR.pruned_for(body)
        assert sorted(skipped) == ["gimg", "img"]
        ids = [s.id for s in pruned.stages]
        assert ids == ["body", "rig", "garment", "coat", "seat"]
        by_id = {s.id: s for s in pruned.stages}
        assert by_id["body"].inputs == {
            "photo": FromInitial(key="starter_image")}
        assert by_id["garment"].inputs == {
            "garment_image": FromInitial(key="garment_image_1")}

    def test_single_branch(self) -> None:
        body = dict(_full_initials(), starter_image="s.png")
        pruned, skipped = CHAR.pruned_for(body)
        assert skipped == ("img",)
        by_id = {s.id: s for s in pruned.stages}
        assert by_id["body"].inputs == {
            "photo": FromInitial(key="starter_image")}
        assert by_id["garment"].inputs["garment_image"] == FromStage(
            stage="gimg", output="gimg")
