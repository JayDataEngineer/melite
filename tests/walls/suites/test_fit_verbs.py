"""fit verb wall (fit-card stroke 3): dress/prop verbs + fit-seat flow + FitRow.

No GPU, no queue, no network: declarations + loaders + hermetic composes
(tmp .glb files stand in at the ref door — it checks existence, never
content).

  1. GLB DOOR — EstateGlbRef admits .glb only (the lane stages GLB
     bytes; a .gltf/.obj initial would die in-engine, the exact class
     the compile-time door exists to prevent); browser-local,
     foreign-extension, and ghost paths refuse at validate time.
  2. FLOW HONESTY — fit-seat loads; FitRow -> FitProp -> views wired;
     every knob rides an initial (no hardcoded prop/bone facts in the
     template — scanned, not trusted); body/prop initials carry the
     EstateGlbRef door.
  3. HANDSHAKE — every dress/prop verb knob name is a fit-seat initial
     (a rename on either side silently drops the value — the
     silent-knob-drop class); body rides the stage slot, never a knob.
  4. ONE DERIVATION — the card phase-1 echo (estate meld_row) == the
     pack build_row_json on pinned knob sets; the phase-2 graph carries
     a FitRow node and NO baked meld blob.
  5. VERB SHAPE — dress = socket defaults, prop = grip defaults, both
     engines == the one seat engine on fit-seat (the global verb wall
     sweeps writes/requires/knobs-stay-home/TSX).
"""

import importlib.util
import json
import os
import sys
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import TYPE_CHECKING

import pytest

from _anchor import REPO

if TYPE_CHECKING:
    # melite_cards joins sys.path inside _estate_paths — never at module scope.
    from melite_cards import SubActionMod

FIT_PY = os.path.join(REPO, "plugins", "engines", "comfyui",
                      "action_cards", "3d", "fit", "py")
VERBS_PY = os.path.join(REPO, "plugins", "engines", "comfyui",
                        "models", "3d", "anny", "mods")
PACK = os.path.join(REPO, "vendor", "comfyui_extensions",
                     "melite-poser-nodes", "fit_surgery.py")

KNOB_SETS = {
    "hat": {"file": "keeper_hat.glb", "bone": "mixamorig:Head",
              "align": "socket", "position": "0,0,0",
              "rotation": "0,180,0", "fit_ratio": 1.0,
              "fit_ref_bone": "mixamorig:HeadTop_End",
              "fit_ref_bone2": "mixamorig:Neck", "seat_ratio": 0.22},
    "sword": {"file": "keeper_sword.glb", "bone": "mixamorig:RightHand",
                "align": "grip", "finger_bone": "mixamorig:RightHandMiddle1",
                "thumb_bone": "mixamorig:RightHandThumb1",
                "target_width": 0.25},
    "coat": {"file": "keeper_trenchcoat.glb", "bone": "mixamorig:Spine",
               "align": "socket"},
}


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    for p in (os.path.join(REPO, "py"),
              os.path.join(REPO, "plugins", "engines", "comfyui"),
              os.path.join(REPO, "plugins", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)
    yield


def _load(name: str, path: str, fname: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(path, fname),
        submodule_search_locations=[path])
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _glb(tmp_path: Path, name: str) -> str:
    p = tmp_path / name
    p.write_bytes(b"")
    return str(p)


# ── 1. the GLB door ────────────────────────────────────────────────

def test_glb_exts_are_glb_only() -> None:
    from melite_models.refs import _GLB_EXTS
    assert set(_GLB_EXTS) == {".glb"}


@pytest.mark.parametrize("bad,needle", [
    ("data:model/gltf-binary;base64,AAAA", "browser-local"),
    ("blob:http://x/1", "browser-local"),
    ("data/input/x.png", "not a stageable mesh"),
    ("data/input/x.gltf", "not a stageable mesh"),
    ("data/input/x.obj", "not a stageable mesh"),
])
def test_glb_door_refusal_matrix(bad: str, needle: str,
                                 monkeypatch: pytest.MonkeyPatch,
                                 tmp_path: Path) -> None:
    from melite_models import EstateGlbRef
    from pydantic import ValidationError
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValidationError) as e:
        EstateGlbRef.model_validate(bad)
    assert needle in str(e.value)


def test_glb_ghost_refused_real_passes(monkeypatch: pytest.MonkeyPatch,
                                       tmp_path: Path) -> None:
    from melite_models import EstateGlbRef
    from pydantic import ValidationError
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "x.glb").write_bytes(b"glTF")
    monkeypatch.chdir(tmp_path)
    assert EstateGlbRef.model_validate(
        "data/input/x.glb").path == "data/input/x.glb"
    with pytest.raises(ValidationError) as e:
        EstateGlbRef.model_validate("data/input/ghost.glb")
    assert "not on disk" in str(e.value)


# ── 1b. the node module shape ────────────────────────────────────────

def test_pack_nodes_expose_their_functions() -> None:
    """run-d8acfe98860f's class, caught before the queue: fit_nodes.py
    once nested FitProp.fit under FitRow (a mid-class insert) — the
    import worked, the graph built, and the run died in-engine with
    AttributeError. The classes must expose their FUNCTION methods."""
    packdir = os.path.dirname(PACK)
    # A BARE namespace package (never exec the real __init__ — it
    # imports the ComfyUI server, which does not exist estate-side).
    import types as _t
    pkg = _t.ModuleType("fit_pack_nodes")
    pkg.__path__ = [packdir]
    sys.modules["fit_pack_nodes"] = pkg
    spec2 = importlib.util.spec_from_file_location(
        "fit_pack_nodes.fit_nodes", os.path.join(packdir, "fit_nodes.py"))
    mod = importlib.util.module_from_spec(spec2)
    sys.modules["fit_pack_nodes.fit_nodes"] = mod
    spec2.loader.exec_module(mod)
    assert callable(getattr(mod.FitProp, "fit", None)), "FitProp lost fit"
    assert callable(getattr(mod.FitRow, "build", None)), "FitRow lost build"
    assert mod.FitProp.FUNCTION == "fit" and mod.FitRow.FUNCTION == "build"
    assert not hasattr(mod.FitRow, "fit"), "fit nested under FitRow again"


# ── 2. the flow ────────────────────────────────────────────────────

def test_fit_seat_flow_wires_fitrow() -> None:
    import flow as flow_mod
    from melite_models import EstateGlbRef
    f = flow_mod.load_flow("fit-seat")
    assert f.id == "fit-seat"
    (stage,) = f.stages
    assert stage.engine == "comfyui"
    wf = stage.params["workflow"]
    assert wf["row"]["class_type"] == "FitRow"
    assert wf["seat"]["class_type"] == "FitProp"
    assert wf["seat"]["inputs"]["row_json"] == ["row", 0]
    assert wf["seat"]["inputs"]["body_glb_path"] == "$body"
    assert wf["seat"]["inputs"]["prop_glb_path"] == "$prop"
    assert wf["views"]["class_type"] == "RayRenderGLBViews"
    assert f.initial_validators["body"] is EstateGlbRef
    assert f.initial_validators["prop"] is EstateGlbRef
    blob = json.dumps(wf)
    assert "mixamorig" not in blob, "bone facts hardcoded in the template"
    assert "keeper" not in blob, "prop facts hardcoded in the template"


# ── 3 + 5. the verbs ───────────────────────────────────────────────

def _verbs() -> dict[str, "type[SubActionMod]"]:
    mod = _load("anny_verbs_w", VERBS_PY, "verbs.py")
    return {v.id: v for v in (mod.DressVerb, mod.PropVerb)}


def test_verb_knobs_are_flow_initials() -> None:
    import flow as flow_mod
    f = flow_mod.load_flow("fit-seat")
    (stage,) = f.stages
    initials = set(stage.inputs)
    verbs = _verbs()
    for vid, vcls in verbs.items():
        knobs = {fld.name for fld in vcls._fields_}
        assert knobs, "%s declares no knobs" % vid
        assert "body" not in knobs, "%s: body is a stage slot, never a knob" % vid
        drop = knobs - initials
        assert not drop, "%s knobs %s are no fit-seat initials (silent drop)" % (vid, sorted(drop))
    assert {fld.name for fld in verbs["dress"]._fields_} == \
        {fld.name for fld in verbs["prop"]._fields_}, "one knob block, two defaults"


def test_verb_defaults_match_their_laws() -> None:
    verbs = _verbs()
    dress = {fld.name: fld.default for fld in verbs["dress"]._fields_}
    prop = {fld.name: fld.default for fld in verbs["prop"]._fields_}
    assert dress["align"] == "socket" and dress["bone"] == "mixamorig:Spine"
    assert prop["align"] == "grip" and prop["bone"] == "mixamorig:RightHand"
    assert prop["finger_bone"] == "mixamorig:RightHandMiddle1"
    assert prop["thumb_bone"] == "mixamorig:RightHandThumb1"
    assert prop["target_width"] == 0.25
    for vid, vcls in verbs.items():
        (eng,) = vcls.engines
        assert (eng.id, eng.flow) == ("seat", "fit-seat"), vid
        assert vcls.writes == ("body_glb",), vid
        assert "melite-poser-nodes" in vcls.requires, vid


# ── 4. one derivation ──────────────────────────────────────────────

def test_card_echo_equals_pack_row(tmp_path: Path) -> None:
    compose = _load("fit_card_compose_w3", FIT_PY, "compose.py")
    pack = _load("fit_surgery_w3", os.path.dirname(PACK), "fit_surgery.py")
    body = _glb(tmp_path, "body.glb")
    for _name, knobs in KNOB_SETS.items():
        prop = _glb(tmp_path, knobs["file"] )
        params = dict({"body_glb": body, "prop_glb": prop},
                      **{k: v for k, v in knobs.items() if k != "file"})
        rc, _y, extra, err = compose.compose({"params": params}, "fit", "")
        assert rc == 0, err
        echo = extra["inputs"]["attachment"]
        stem = knobs["file"][:-4]
        pack_row = json.loads(pack.build_row_json(
            dict({"model_name": stem},
                 **{k: v for k, v in knobs.items() if k != "file"})))
        assert pack_row == echo, "%s: pack row drifted from the card echo" % _name


def test_phase2_graph_carries_fitrow_not_a_blob(tmp_path: Path) -> None:
    compose = _load("fit_card_compose_w4", FIT_PY, "compose.py")
    body = _glb(tmp_path, "body.glb")
    prop = _glb(tmp_path, "keeper_hat.glb")
    params = dict({"body_glb": body, "prop_glb": prop},
                  **{k: v for k, v in KNOB_SETS["hat"].items() if k != "file"})
    rc, skel, _extra, err = compose.compose({"params": params}, "fit", "run-probe")
    assert rc == 0, err
    text = json.dumps(skel, default=str)
    assert "FitRow" in text, "graph lost the FitRow node"
    assert "keeper_hat" in text, "model stem lost from the graph"
    assert "FitRefBone" not in text, "baked meld blob beside the node"
    assert "FitProp" in text and text.count("SaveImage") >= 8
