"""skin parity wall (skin-card stroke 2): the pack twin == the estate twin.

skin_surgery.generate_detail_maps (melite-poser-nodes, runs on ComfyUI)
is mechanically derived from tools/skin_pack.py; this wall proves they
agree array-for-array on pinned (size, seed) pairs, and that
apply_skin_bytes attaches REPEAT-sampled albedo+normal textures to a
real SOMAX body while refusing UV-less bodies. A drift is a failure,
never a silent second truth.
"""

import importlib.util
import json
import os
import struct
import sys

import pytest
from types import ModuleType

from _anchor import REPO

# glTF documents are JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

sys.path.insert(0, os.path.join(str(REPO), "tools"))
sys.path.insert(0, os.path.join(str(REPO), "py"))

from skin_pack import generate_detail_maps as estate_maps

_PACK_DIR = os.path.join(str(REPO), "vendor", "comfyui_extensions",
                         "melite-poser-nodes")


def _pack() -> ModuleType:
    import types
    parent = types.ModuleType("skinpack")
    parent.__path__ = [_PACK_DIR]
    sys.modules["skinpack"] = parent
    for name in ("fit_surgery", "skin_surgery"):
        spec = importlib.util.spec_from_file_location(
            "skinpack." + name, os.path.join(_PACK_DIR, name + ".py"),
            submodule_search_locations=[_PACK_DIR])
        mod = importlib.util.module_from_spec(spec)
        sys.modules["skinpack." + name] = mod
        spec.loader.exec_module(mod)
    return sys.modules["skinpack.skin_surgery"]


CASES = [(256, 7), (512, 20260906), (1024, 99)]


def test_maps_agree() -> None:
    pack = _pack()
    for size, seed in CASES:
        a_e, n_e = estate_maps(size, seed)
        a_p, n_p = pack.generate_detail_maps(size, seed)
        assert (a_e == a_p).all(), "albedo drift at (%d, %d)" % (size, seed)
        assert (n_e == n_p).all(), "normal drift at (%d, %d)" % (size, seed)


def _glb_json(raw: bytes) -> dict[str, JsonValue]:
    ln = struct.unpack("<I", raw[12:16])[0]
    return json.loads(raw[20:20 + ln])


MODELS = os.environ.get(
    "MELD_MODELS_DIR",
    os.path.expanduser("~/Documents/programs/games/meld/unity/Assets/PhaseB/Resources/models"),
)
BODY = os.path.join(MODELS, "base_human_pipeline.glb")
need_models = pytest.mark.skipif(
    not os.path.isfile(BODY),
    reason="meld checkout absent (set MELD_MODELS_DIR)",
)


@need_models
def test_surgery_attaches_textures() -> None:
    pack = _pack()
    body = open(BODY, "rb").read()
    albedo, normal = pack.generate_detail_maps(256, 7)
    out, record = pack.apply_skin_bytes(
        body, pack.encode_png(albedo), pack.encode_png(normal))
    assert out[:4] == b"glTF"
    gltf = _glb_json(out)
    names = [im.get("name") for im in gltf.get("images", [])]
    assert "skin_detail_albedo" in names
    assert "skin_detail_normal" in names
    samplers = gltf.get("samplers", [])
    assert samplers and all(s.get("wrapS") == 10497 and s.get("wrapT") == 10497 for s in samplers[-1:])
    touched = [m for m in gltf.get("materials", [])
               if (m.get("pbrMetallicRoughness") or {}).get("baseColorTexture")]
    assert touched, "no material carries the albedo"
    assert all("normalTexture" in m for m in touched)
    # Meld 4.38 v1.4 law (ported 2026-09-07): bump OFF (scale 0 — the
    # UV-path bump mottled the skin) + matte roughness (1 - 0.18).
    assert all(m["normalTexture"].get("scale") == 0.0 for m in touched), \
        "bump re-enabled on projection UVs (meld 4.38 v1.4 forbids)"
    assert all((m.get("pbrMetallicRoughness") or {}).get("roughnessFactor") == 0.82
               for m in touched), "skin sheen drifted from matte 0.82"
    assert all((m.get("pbrMetallicRoughness") or {}).get("metallicFactor") == 0.0
               for m in touched), "skin metallic drifted from 0.0"
    assert record["materials_touched"] == len(touched)


def test_surgery_refuses_uvless() -> None:
    pack = _pack()
    gltf = {"asset": {"version": "2.0"},
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}]}
    js = json.dumps(gltf).encode()
    while len(js) % 4:
        js += b" "
    bald = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js)) + struct.pack("<II", len(js), 0x4E4F534A) + js
    albedo, normal = pack.generate_detail_maps(256, 7)
    with pytest.raises(ValueError):
        pack.apply_skin_bytes(bald, pack.encode_png(albedo), pack.encode_png(normal))
