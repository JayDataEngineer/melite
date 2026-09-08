"""skin verb wall (skin-card stroke 3): apply-skin verb + skin-apply flow.

No GPU, no queue, no network: declarations + loaders + hermetic twin
calls. The GLB door is the fit wall\u2019s rung (shared EstateGlbRef) —
not re-pinned here.

  1. NODE SHAPE — SkinSidecar exposes sidecar (the FitRow-nesting
     incident class); SkinPack/SkinApply keep theirs.
  2. FLOW HONESTY — skin-apply loads; pack -> scar -> apply -> views
     wired; every $channel is an initial (no hardcoded kind facts —
     scanned, not trusted); body carries the EstateGlbRef door.
  3. HANDSHAKE — every apply-skin verb knob name is a skin-apply
     initial; body rides the stage slot, never a knob.
  4. ONE DERIVATION — the pack build_sidecar == the estate
     skin_spec.sidecar on all 20 kinds (the twin, never a second
     truth); the card phase-1 echo joins the same equality.
  5. VERB SHAPE — engine == the one coat engine on skin-apply,
     writes == body_glb, requires == melite-poser-nodes, kind
     options == the 20 table ids.
"""

import importlib.util
import json
import os
import sys
import types as _t
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

from _anchor import REPO

if TYPE_CHECKING:
    # python/ joins sys.path inside _estate_paths — never at module scope.
    from flow import Flow

VERBS_PY = os.path.join(REPO, "packages", "engines", "comfyui",
                        "models", "3d", "anny", "mods")
PACKDIR = os.path.join(REPO, "vendor", "comfyui_extensions",
                       "melite-poser-nodes")


def _estate_paths() -> None:
    for p in (os.path.join(REPO, "python"),
              os.path.join(REPO, "packages", "engines", "comfyui"),
              os.path.join(REPO, "packages", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)


def _load(name: str, path: str, fname: str) -> _t.ModuleType:
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(path, fname),
        submodule_search_locations=[path])
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _pack_mod() -> _t.ModuleType:
    pkg = _t.ModuleType("skin_pack_nodes")
    pkg.__path__ = [PACKDIR]
    sys.modules["skin_pack_nodes"] = pkg
    spec = importlib.util.spec_from_file_location(
        "skin_pack_nodes.skin_nodes",
        os.path.join(PACKDIR, "skin_nodes.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["skin_pack_nodes.skin_nodes"] = mod
    spec.loader.exec_module(mod)
    return mod


def _verbs() -> _t.ModuleType:
    _estate_paths()
    return _load("skin_verbs_w", VERBS_PY, "verbs.py")


def _flow() -> "Flow":
    _estate_paths()
    import flow as flow_mod
    return flow_mod.load_flow("skin-apply")


# ── 1. node shape ────────────────────────────────────────────────

def test_sidecar_node_exposes_sidecar() -> None:
    mod = _pack_mod()
    assert callable(getattr(mod.SkinSidecar, "sidecar", None))
    assert mod.SkinSidecar.FUNCTION == "sidecar"
    assert callable(getattr(mod.SkinPack, "pack", None))
    assert callable(getattr(mod.SkinApply, "apply", None))


# ── 2. flow honesty ──────────────────────────────────────────────

def test_skin_apply_flow_wiring() -> None:
    fl = _flow()
    assert fl.id == "skin-apply"
    (stage,) = fl.stages
    wf = stage.params["workflow"]
    assert wf["pack"]["class_type"] == "SkinPack"
    assert wf["scar"]["class_type"] == "SkinSidecar"
    assert wf["apply"]["class_type"] == "SkinApply"
    assert wf["views"]["class_type"] == "RayRenderGLBViews"
    assert wf["save_sidecar"]["class_type"] == "SaveText"
    assert "sidecar" not in wf["apply"]["inputs"], \
        "SkinApply takes body+maps only (run-f3bf034d8957's TypeError)"
    assert wf["save_sidecar"]["inputs"]["text"] == ["scar", 0]
    blob = json.dumps(wf)
    for fact in ("keeper", "villager", "young_caucasian",
                 "0.85", "skin_detail"):
        assert fact not in blob, "hardcoded kind fact %r in template" % fact
    assert set(stage.inputs) == {"body", "kind", "map_size", "seed"}
    assert fl.initial_validators["body"].__name__ == "EstateGlbRef"


# ── 3. handshake ─────────────────────────────────────────────────

def test_verb_knobs_are_flow_initials() -> None:
    from melite_cards import SubActionMod
    verbs = _verbs()
    fl = _flow()
    initials = set(fl.stages[0].inputs)
    verb = next(v for v in vars(verbs).values()
                if isinstance(v, type) and issubclass(v, SubActionMod)
                and getattr(v, "id", None) == "apply-skin")
    knobs = {k for k in vars(verb) if not k.startswith("_")
             and k not in ("id", "label", "engines", "writes", "requires")}
    assert "body" not in knobs, "body rides the stage slot, never a knob"
    drop = knobs - initials
    assert not drop, "apply-skin knobs %s are no skin-apply initials" % sorted(drop)
    assert knobs == {"kind", "map_size", "seed"}


# ── 4. one derivation ────────────────────────────────────────────

def test_sidecar_twin_matches_spec_all_kinds() -> None:
    _estate_paths()
    pkg = _t.ModuleType("skin_twin_nodes")
    pkg.__path__ = [PACKDIR]
    sys.modules["skin_twin_nodes"] = pkg
    spec = importlib.util.spec_from_file_location(
        "skin_twin_nodes.skin_surgery",
        os.path.join(PACKDIR, "skin_surgery.py"))
    surg = importlib.util.module_from_spec(spec)
    sys.modules["skin_twin_nodes.skin_surgery"] = surg
    spec.loader.exec_module(surg)
    from skin_spec import KIND_TABLE, SkinSpec, row_for, sidecar
    assert sorted(surg.KIND_TINTS) == sorted(r.kind for r in KIND_TABLE)
    for row in KIND_TABLE:
        twin = json.loads(surg.build_sidecar(row.kind, 512, 20260906))
        canon = sidecar(SkinSpec(kind=row.kind, size=512, seed=20260906),
                          row_for(row.kind))
        assert twin == canon, "twin drift on %s" % row.kind


# ── 5. verb shape ────────────────────────────────────────────────

def test_apply_skin_verb_shape() -> None:
    _estate_paths()
    from melite_cards import SubActionMod
    from skin_spec import KIND_TABLE
    verbs = _verbs()
    verb = next(v for v in vars(verbs).values()
                if isinstance(v, type) and issubclass(v, SubActionMod)
                and getattr(v, "id", None) == "apply-skin")
    assert verb.writes == ("body_glb",)
    assert verb.requires == ("melite-poser-nodes",)
    assert len(verb.engines) == 1
    assert verb.engines[0].flow == "skin-apply"
    assert sorted(verb.kind.options) == sorted(r.kind for r in KIND_TABLE)
    assert sorted(verb.map_size.options) == ["1024", "2048", "256", "512"]

