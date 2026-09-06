"""skin card wall (skin-card stroke 2): deterministic maps onto a SOMAX body.

No GPU, no queue, no network: the card class shape (kind options ==
KIND_TABLE), the schema gate (unknown kind / off-vocab size / negative
seed refuse), the phase-1 door (real meld body passes, UV-less bodies
refuse before registration), and the phase-2 graph (SkinPack +
SkinApply + sidecar SaveText + proof views).
"""

import importlib.util
import json
import os
import struct
import sys
from collections.abc import Iterator

import pytest
from pathlib import Path
from types import ModuleType

from _anchor import REPO

SKIN_PY = os.path.join(REPO, "plugins", "engines", "comfyui",
                       "action_cards", "3d", "skin", "py")
MODELS = os.environ.get(
    "MELD_MODELS_DIR",
    os.path.expanduser("~/Documents/programs/games/meld/unity/Assets/PhaseB/Resources/models"),
)
BODY = os.path.join(MODELS, "base_human_pipeline.glb")

SKIN_PARAMS = {
    "body_glb": BODY, "kind": "keeper", "map_size": "512",
    "seed": 20260906,
}

need_models = pytest.mark.skipif(
    not os.path.isfile(BODY),
    reason="meld checkout absent (set MELD_MODELS_DIR)",
)


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    for p in (os.path.join(REPO, "py"),
              os.path.join(REPO, "plugins", "engines", "comfyui"),
              os.path.join(REPO, "plugins", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)
    yield


def _load(name: str, fname: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(SKIN_PY, fname),
        submodule_search_locations=[SKIN_PY])
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_card_shape() -> None:
    from melite_cards import load_card_py
    cls = load_card_py(os.path.join(SKIN_PY, "card.py"), "comfyui")
    assert cls.id == "skin"
    assert cls.genre == "3d"
    assert cls.ability.get("default_family") == "skin"
    assert [m.id for m in (cls.models or ())] == ["skin"]
    assert "melite-poser-nodes" in (cls.requires or ())
    fields = {f.name for f in getattr(cls, "_fields_", ())}
    assert {"body_glb", "kind", "map_size", "seed"} <= fields
    sys.path.insert(0, os.path.join(REPO, "py"))
    from skin_spec import KIND_TABLE
    kind_field = next(f for f in cls._fields_ if f.name == "kind")
    assert sorted(kind_field.options) == sorted(x.kind for x in KIND_TABLE)


def test_tool_snapshot_in_sync() -> None:
    from melite_cards import load_card_py, tool_manifests
    cls = load_card_py(os.path.join(SKIN_PY, "card.py"), "comfyui")
    snap = os.path.join(os.path.dirname(SKIN_PY), "tool.json")
    want = json.dumps(tool_manifests(cls), indent=2, ensure_ascii=False) + "\n"
    assert open(snap, encoding="utf-8").read() == want


def test_schema_gates() -> None:
    schema = _load("skin_card_schema_w", "schema.py")
    doc = schema.parse_card({"params": dict(SKIN_PARAMS)})
    assert doc.kind == "keeper"
    assert doc.map_size == 512
    assert doc.seed == 20260906
    with pytest.raises(Exception):
        schema.parse_card({"params": dict(SKIN_PARAMS, kind="mickey_mouse")})
    with pytest.raises(Exception):
        schema.parse_card({"params": dict(SKIN_PARAMS, map_size=100)})
    # GATE S: -1 is the RANDOM sentinel (admitted, minted compose-side),
    # below -1 refuses.
    assert schema.parse_card({"params": dict(SKIN_PARAMS, seed=-1)}).seed == -1
    with pytest.raises(Exception):
        schema.parse_card({"params": dict(SKIN_PARAMS, seed=-2)})
    with pytest.raises(Exception):
        schema.parse_card({"params": dict(SKIN_PARAMS, tint=[1, 0, 0])})


def test_sidecar_is_the_controller_row() -> None:
    schema = _load("skin_card_schema_w2", "schema.py")
    doc = schema.parse_card({"params": dict(SKIN_PARAMS)})
    got = doc.sidecar_doc()
    sys.path.insert(0, os.path.join(REPO, "py"))
    from skin_spec import SKIN_SEED, row_for, sidecar, SkinSpec
    want = sidecar(SkinSpec(kind="keeper", size=512, seed=SKIN_SEED), row_for("keeper"))
    assert got == want
    assert got["tint"] == [0.85, 0.7, 0.55]


def _uvless_glb(path: str) -> None:
    gltf = {"asset": {"version": "2.0"}, "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}]}
    js = json.dumps(gltf).encode()
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A))
        f.write(js)


@need_models
def test_phase1_door(tmp_path: Path) -> None:
    compose = _load("skin_card_compose_w", "compose.py")
    rc, _yaml, extra, err = compose.compose({"params": dict(SKIN_PARAMS)}, "skin", "")
    assert rc == 0, err
    assert extra["inputs"]["body_glb"] == BODY
    assert extra["inputs"]["sidecar"]["tint"] == [0.85, 0.7, 0.55]
    rc, _y, _e, err = compose.compose({"params": dict(SKIN_PARAMS, body_glb="")}, "skin", "")
    assert rc == -3 and "body_glb" in err
    rc, _y, _e, err = compose.compose({"params": dict(SKIN_PARAMS, body_glb="ghost.glb")}, "skin", "")
    assert rc == -3 and "ghost.glb" in err
    bald = str(tmp_path / "bald.glb")
    _uvless_glb(bald)
    rc, _y, _e, err = compose.compose({"params": dict(SKIN_PARAMS, body_glb=bald)}, "skin", "")
    assert rc == -3 and "TEXCOORD_0" in err


@need_models
def test_phase2_graph() -> None:
    compose = _load("skin_card_compose_w2", "compose.py")
    rc, skel, _extra, err = compose.compose({"params": dict(SKIN_PARAMS)}, "skin", "run-probe")
    assert rc == 0, err
    text = json.dumps(skel, default=str)
    assert "SkinPack" in text, "graph has no SkinPack node"
    assert "SkinApply" in text, "graph has no SkinApply node"
    assert "SaveText" in text, "graph has no sidecar SaveText"
    assert text.count("SaveImage") >= 10
    assert "RayRenderGLBViews" in text
