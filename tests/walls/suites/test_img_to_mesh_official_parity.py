"""img-to-mesh official-template parity — the lane renders the
Comfy-Org 3d_pixal3d_trellis2 reference topology, not an approximation.

Born 2026-09-06: the default render sampled structure at cfg 3.0,
skipped the upsample + first texture pass below the 1536 variant,
ran one RescaleCFG(0.7) for every stage, decoded the mesh with no
remesh, and baked at 2048 — blobby trash out of the box. Every
load-bearing value below is the template's (see the renderer module
docstring for the deliberate deviations: single card seed, no
preview branches, core-default remesh band/project_back/fix_poles).
"""

import base64
import os
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

from _anchor import REPO

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None
type WorkflowNode = dict[str, JsonValue]
type Workflow = dict[str, WorkflowNode]
type NodesByClass = dict[str, list[tuple[str, WorkflowNode]]]


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    # The writable comfy_script shadow (read-only site-packages
    # mounts) is owned by tests/conftest.py — the ONE place for path
    # setup — so import order can never unseat it.
    for p in (os.path.join(REPO, "python"),
              os.path.join(REPO, "packages", "engines", "comfyui"),
              os.path.join(
                  REPO, "packages", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)
    import compose
    globals()["_compose_pkg"] = compose
    yield


_PNG = ("data:image/png;base64," + base64.b64encode(
    b"\x89PNG\r\n\x1a\n" + b"\x00" * 32).decode())


def _render(model: str, params: dict[str, JsonValue]) -> Workflow:
    rc, y, _extra, err = globals()["_compose_pkg"].card_compose(
        {"model": model, "params": params}, model, "wall-parity", None)
    assert rc == 0, err
    nodes = y["nodes"] if isinstance(y, dict) else y.nodes
    n0 = nodes[0]
    params = n0["params"] if isinstance(n0, dict) else n0.params
    return params["workflow"]


def _by_class(wf: Workflow) -> NodesByClass:
    out: dict = {}
    for nid, n in wf.items():
        out.setdefault(n["class_type"], []).append((str(nid), n))
    return out


def _src(wf: Workflow, node: WorkflowNode, key: str) -> tuple[str, WorkflowNode]:
    v = node["inputs"][key]
    assert isinstance(v, list), (key, v)
    return str(v[0]), wf[str(v[0])]


def _samplers_by_stage(wf: Workflow, byc: NodesByClass) -> dict[str, str]:
    """KSampler node id -> stage, resolved by latent/conditioning wiring."""
    stages = {}
    for nid, n in byc["KSampler"]:
        lat_id, _lat = _src(wf, n, "latent_image")
        lat_cls = wf[lat_id]["class_type"]
        if lat_cls == "EmptyTrellis2LatentStructure":
            stages[nid] = "structure"
        elif lat_cls == "Trellis2ShapeStage":
            stages[nid] = "shape"
        elif lat_cls == "Trellis2UpsampleStage":
            stages[nid] = "texture1"
        elif lat_cls == "Trellis2TextureStage":
            stages[nid] = "texture2"
        else:
            raise AssertionError("sampler feeds unknown stage: %s" % lat_cls)
    return stages


def _chain(model: str, params: dict[str, JsonValue]) -> tuple[Workflow, NodesByClass]:
    wf = _render(model, params)
    return wf, _by_class(wf)


def test_four_samplers_official_values() -> None:
    for model in ("trellis2-native", "pixal3d"):
        wf, byc = _chain(model, {"input_image": _PNG})
        assert len(byc.get("KSampler", [])) == 4, model
        got = {}
        for nid, n in byc["KSampler"]:
            lat_id, _lat = _src(wf, n, "latent_image")
            lat_cls = wf[lat_id]["class_type"]
            i = n["inputs"]
            got[lat_cls] = (i["steps"], i["cfg"], i["sampler_name"],
                            i["scheduler"])
        assert got["EmptyTrellis2LatentStructure"] == (12, 7.5, "euler", "normal"), got
        assert got["Trellis2ShapeStage"] == (20, 7.5, "euler", "normal"), got
        assert got["Trellis2UpsampleStage"] == (12, 7.5, "euler", "simple"), got
        assert got["Trellis2TextureStage"] == (12, 1.0, "euler", "normal"), got


def test_guided_arms_match_template() -> None:
    wf, byc = _chain("trellis2-native", {"input_image": _PNG})
    assert len(byc.get("CFGOverride", [])) == 2
    assert len(byc.get("RescaleCFG", [])) == 2
    assert len(byc.get("ModelSamplingSD3", [])) == 1
    percents = sorted(n["inputs"]["start_percent"] for _, n in byc["CFGOverride"])
    assert percents == [0.667, 0.769], percents
    for _, n in byc["CFGOverride"]:
        assert (n["inputs"]["cfg"], n["inputs"]["end_percent"]) == (1.0, 1.0)
        src_id, _s = _src(wf, n, "model")
        assert wf[src_id]["class_type"] == "UNETLoader"
    mults = {}
    for nid, n in byc["RescaleCFG"]:
        o_id, _o = _src(wf, n, "model")
        mults[n["inputs"]["multiplier"]] = wf[o_id]["inputs"]["start_percent"]
    assert mults == {0.7: 0.667, 0.5: 0.769}, mults
    (shift_id, shift), = byc["ModelSamplingSD3"]
    assert shift["inputs"]["shift"] == 5.0
    r_id, _r = _src(wf, shift, "model")
    assert wf[r_id]["inputs"]["multiplier"] == 0.7
    stages = _samplers_by_stage(wf, byc)
    for nid, n in byc["KSampler"]:
        m_id, _m = _src(wf, n, "model")
        m_cls = wf[m_id]["class_type"]
        if stages[nid] in ("shape", "texture1"):
            assert m_cls == "RescaleCFG"
            assert wf[m_id]["inputs"]["multiplier"] == 0.5
        elif stages[nid] == "texture2":
            assert m_cls == "UNETLoader", m_cls
        elif stages[nid] == "structure":
            assert m_id == shift_id


def test_upsample_unconditional_and_variant_target() -> None:
    for model in ("trellis2-native", "pixal3d"):
        for res, want in ((1024, 1024), (1536, 1536), (512, 1024)):
            wf, byc = _chain(model, {"input_image": _PNG, "resolution": res})
            assert len(byc.get("Trellis2UpsampleStage", [])) == 1, (model, res)
            (_uid, up), = byc["Trellis2UpsampleStage"]
            assert up["inputs"]["target_resolution"] == want, (model, res)
            s_id, _s = _src(wf, up, "shape_latent")
            assert wf[s_id]["class_type"] == "KSampler"


def test_mesh_lineage_through_remesh() -> None:
    wf, byc = _chain("trellis2-native", {"input_image": _PNG})
    assert len(byc.get("GetMeshInfo", [])) == 1
    assert len(byc.get("RemeshMesh", [])) == 1
    assert len(byc.get("PaintMesh", [])) == 0
    (_rid, remesh), = byc["RemeshMesh"]
    assert remesh["inputs"]["resolution"] == 768
    assert remesh["inputs"]["sign_mode"] == "udf"
    g_id, _g = _src(wf, remesh, "mesh")
    assert wf[g_id]["class_type"] == "GetMeshInfo"
    (_did, dec), = byc["DecimateMesh"]
    assert dec["inputs"]["target_face_count"] == 700000
    d_id, _d = _src(wf, dec, "mesh")
    assert d_id == _rid
    (_vid, vdec), = byc["VaeDecodeShapeTrellis"]
    s_id, _s = _src(wf, vdec, "samples")
    s_lat_id, _sl = _src(wf, wf[s_id], "latent_image")
    assert wf[s_lat_id]["class_type"] == "Trellis2UpsampleStage"


def test_bake_tail_values() -> None:
    wf, byc = _chain("pixal3d", {"input_image": _PNG})
    (_wid, unwr), = byc["UnwrapMesh"]
    assert (unwr["inputs"]["segmenter"], unwr["inputs"]["resolution"]) == ("pec", 4096)
    (_bid, bake), = byc["BakeTextureFromVoxel"]
    assert bake["inputs"]["texture_size"] == 4096
    r_id, _r = _src(wf, bake, "reference_mesh")
    assert wf[r_id]["class_type"] == "VaeDecodeShapeTrellis"
    (_aid, ao), = byc["BakeAmbientOcclusion"]
    assert (ao["inputs"]["resolution"], ao["inputs"]["samples"],
            ao["inputs"]["max_distance"]) == (1024, 64, 0.71)
    (_nid, nm), = byc["BakeNormalMapFromMesh"]
    assert (nm["inputs"]["resolution"], nm["inputs"]["cage_distance"],
            nm["inputs"]["ignore_backfaces"]) == (2048, 0.05, True)
    (_tid, tex), = byc["ApplyTextureToMesh"]
    for k in ("occlusion", "normal_map"):
        assert k in tex["inputs"], k


def test_loaders_match_template() -> None:
    wf, byc = _chain("trellis2-native", {"input_image": _PNG})
    (_cid, clip), = byc["CLIPVisionLoader"]
    assert clip["inputs"]["clip_name"] == "dino_v3_L_naf_fp32.safetensors"
    (_uid, unet), = byc["UNETLoader"]
    assert unet["inputs"]["unet_name"] == "trellis_2_int8_convrot.safetensors"
    wf2, byc2 = _chain("pixal3d", {"input_image": _PNG})
    (_u2, unet2), = byc2["UNETLoader"]
    assert unet2["inputs"]["unet_name"] == "pixal3d_int8_convrot.safetensors"
    (_m2, moge), = byc2["LoadMoGeModel"]
    assert moge["inputs"]["model_name"] == "moge_2_vitl_normal_fp16.safetensors"


def test_structure_cfg_follows_knob() -> None:
    wf, byc = _chain("trellis2-native", {"input_image": _PNG, "cfg": 5.0})
    stages = _samplers_by_stage(wf, byc)
    got = {stages[nid]: n["inputs"]["cfg"] for nid, n in byc["KSampler"]}
    assert got == {"structure": 5.0, "shape": 7.5, "texture1": 7.5,
                   "texture2": 1.0}, got


_KNOBS = {"shape_steps": 9, "shape_cfg": 3.0, "tex1_steps": 8,
          "tex1_cfg": 4.0, "tex2_steps": 7, "tex2_cfg": 2.0,
          "remesh_resolution": 512, "decimate_faces": 100000,
          "smooth_angle": 90.0, "atlas_size": 2048, "ao_size": 512,
          "normal_size": 1024}


def test_stage_knobs_follow_both_arms() -> None:
    for model in ("trellis2-native", "pixal3d"):
        wf, byc = _chain(model, dict({"input_image": _PNG}, **_KNOBS))
        stages = _samplers_by_stage(wf, byc)
        got = {stages[nid]: (n["inputs"]["steps"], n["inputs"]["cfg"])
               for nid, n in byc["KSampler"]}
        assert got == {"structure": (12, 7.5), "shape": (9, 3.0),
                       "texture1": (8, 4.0), "texture2": (7, 2.0)}, got


def test_lab_knobs_follow_both_arms() -> None:
    lab = {"struct_sampler": "dpmpp_2m", "struct_scheduler": "karras",
           "shape_sampler": "dpmpp_2m", "shape_scheduler": "karras",
           "tex1_sampler": "dpmpp_2m", "tex1_scheduler": "karras",
           "tex2_sampler": "dpmpp_2m", "tex2_scheduler": "karras",
           "sd3_shift": 3.0, "rescale_struct": 0.9,
           "rescale_shape": 0.8, "override_struct": 0.5,
           "override_shape": 0.6}
    for model in ("trellis2-native", "pixal3d"):
        wf, byc = _chain(model, dict({"input_image": _PNG}, **lab))
        stages = _samplers_by_stage(wf, byc)
        for nid, n in byc["KSampler"]:
            assert (n["inputs"]["sampler_name"],
                    n["inputs"]["scheduler"]) == (
                "dpmpp_2m", "karras"), (model, stages[nid])
        percents = sorted(n["inputs"]["start_percent"]
                          for _, n in byc["CFGOverride"])
        assert percents == [0.5, 0.6], (model, percents)
        mults = sorted(n["inputs"]["multiplier"]
                       for _, n in byc["RescaleCFG"])
        assert mults == [0.8, 0.9], (model, mults)
        (_hid, shift), = byc["ModelSamplingSD3"]
        assert shift["inputs"]["shift"] == 3.0, model


def test_mesh_bake_knobs_follow_both_arms() -> None:
    for model in ("trellis2-native", "pixal3d"):
        _wf, byc = _chain(model, dict({"input_image": _PNG}, **_KNOBS))
        ( _rid, remesh), = byc["RemeshMesh"]
        assert remesh["inputs"]["resolution"] == 512, model
        (_did, deci), = byc["DecimateMesh"]
        assert deci["inputs"]["target_face_count"] == 100000, model
        for _sid, sm in byc["MeshSmoothNormals"]:
            assert sm["inputs"]["crease_angle"] == 90.0, model
        (_uid, un), = byc["UnwrapMesh"]
        assert un["inputs"]["resolution"] == 2048, model
        (_bid, bk), = byc["BakeTextureFromVoxel"]
        assert bk["inputs"]["texture_size"] == 2048, model
        (_aid, ao), = byc["BakeAmbientOcclusion"]
        assert ao["inputs"]["resolution"] == 512, model
        (_nid, nm), = byc["BakeNormalMapFromMesh"]
        assert nm["inputs"]["resolution"] == 1024, model
