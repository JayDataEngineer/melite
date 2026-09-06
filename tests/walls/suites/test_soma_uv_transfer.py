"""Somax UV transfer — the rig bridge must leave every body PAINTABLE.

Incident (2026-09-06, character flow attempt 9, run-b9039234f59e):
  the ANNY body ships POSITION only; the rigged GLB kept that shape
  and SkinApply refused — "primitives [0] have no TEXCOORD_0 — detail
  maps have nowhere to land". The somax skin maps are painted in the
  TEMPLATE's atlas (one-texture-fits-all), so the bridge now lifts the
  somaskel77 UV layout (shipped in the pack as somaskel77_uv.npy) and
  transfers it through the SAME barycentric pass as the weights.

Walls here:
  • the shipped layout is the template: (18056, 2), float32, finite
  • the writer appends TEXCOORD_0 when the source has none — values
    verbatim, atlas range preserved (NO clamp to [0,1])
  • a source that arrives WITH UVs keeps its own (never overwritten)
  • JOINTS_0/WEIGHTS_0 still land (the transfer's first job)
"""
from __future__ import annotations

import importlib.util as ilu
import json
import struct
import sys
import unittest
from pathlib import Path
from types import ModuleType

import numpy as np

from _anchor import REPO

# glTF documents are JSON (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

_PACK = REPO / "vendor" / "comfyui_extensions" / "melite-autorig-nodes"
_MOD = _PACK / "soma_weight_transfer.py"


def _load() -> ModuleType:
    spec = ilu.spec_from_file_location("soma_uv_w", _MOD)
    mod = ilu.module_from_spec(spec)
    sys.modules["soma_uv_w"] = mod
    spec.loader.exec_module(mod)
    return mod


def _read_glb(path: Path) -> tuple[dict[str, JsonValue], bytes]:
    raw = path.read_bytes()
    jlen = struct.unpack("<I", raw[12:16])[0]
    gltf = json.loads(raw[20:20 + jlen])
    return gltf, raw[20 + jlen + 8:]


def _acc_data(gltf: dict[str, JsonValue], bin_: bytes, idx: int) -> np.ndarray:
    acc = gltf["accessors"][idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    dt = {5126: np.float32, 5123: np.uint16}[acc["componentType"]]
    width = {"VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    return np.frombuffer(bin_, dtype=dt, count=acc["count"] * width,
                         offset=off).reshape(acc["count"], width)


def _source_glb(tmp: Path, with_uv: bool) -> tuple[dict[str, JsonValue], bytes, Path]:
    """Minimal POSITION-only (or +UV) source GLB, 3 verts, 1 prim."""
    pos = np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0],
                    [0.0, 0.0, 1.0]], dtype=np.float32)
    parts = [pos.astype(np.float32).tobytes()]
    attrs = {"POSITION": 0}
    gltf = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": attrs}]}],
        "accessors": [{
            "bufferView": 0, "componentType": 5126, "count": 3,
            "type": "VEC3",
            "min": pos.min(axis=0).tolist(),
            "max": pos.max(axis=0).tolist(),
        }],
        "bufferViews": [{"buffer": 0, "byteOffset": 0}],
        "buffers": [{"byteLength": 0}],
    }
    if with_uv:
        uv = np.array([[0.25, 0.25], [0.5, 0.25], [0.25, 0.5]],
                      dtype=np.float32)
        parts.append(uv.tobytes())
        gltf["accessors"].append({
            "bufferView": 1, "componentType": 5126, "count": 3,
            "type": "VEC2",
        })
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": 36})
        attrs["TEXCOORD_0"] = 1
    blob = b"".join(parts)
    gltf["bufferViews"][0]["byteLength"] = len(pos.astype(np.float32).tobytes())
    gltf["buffers"][0]["byteLength"] = len(blob)
    j = json.dumps(gltf).encode()
    j += b" " * ((4 - len(j) % 4) % 4)
    return gltf, blob, (tmp / ("src_uv.glb" if with_uv else "src.glb"))


class TestSomaxUvTransfer(unittest.TestCase):
    def setUp(self) -> None:
        self.mod = _load()
        import tempfile
        self.tmp = Path(tempfile.mkdtemp())

    def _write(self, gltf: dict[str, JsonValue], blob: bytes, path: Path, src_uv: np.ndarray) -> None:
        n77 = 77
        self.mod._write_rigged_glb(
            source_gltf=gltf, source_bin=blob,
            source_pos=np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0],
                                 [0.0, 0.0, 1.0]], dtype=np.float32),
            joints=np.zeros((3, 4), dtype=np.uint16),
            weights=np.full((3, 4), 0.25, dtype=np.float32),
            soma_joint_names=[f"SOMA{i}" for i in range(n77)],
            soma_bind_aligned=np.repeat(
                np.eye(4, dtype=np.float32)[None], n77, axis=0),
            output_path=str(path),
            src_uv=src_uv,
        )

    def test_shipped_layout_is_the_template(self) -> None:
        uv = np.load(_PACK / "somaskel77_uv.npy")
        self.assertEqual(uv.shape, (18056, 2))
        self.assertEqual(uv.dtype, np.float32)
        self.assertTrue(np.isfinite(uv).all())
        # the atlas is tiled — the layout MUST span beyond the unit square
        self.assertLess(float(uv.min()), 0.0)
        self.assertGreater(float(uv.max()), 1.0)

    def test_uv_bare_body_gains_texcoord(self) -> None:
        gltf, blob, src = _source_glb(self.tmp, with_uv=False)
        out = self.tmp / "rigged.glb"
        want = np.array([[-1.5, 3.0], [0.5, 5.0], [4.25, 0.125]],
                        dtype=np.float32)
        self._write(gltf, blob, out, src_uv=want)
        og, ob = _read_glb(out)
        attrs = og["meshes"][0]["primitives"][0]["attributes"]
        self.assertIn("TEXCOORD_0", attrs)
        self.assertIn("JOINTS_0", attrs)
        self.assertIn("WEIGHTS_0", attrs)
        got = _acc_data(og, ob, attrs["TEXCOORD_0"])
        np.testing.assert_allclose(got, want, atol=1e-6)

    def test_source_uvs_are_preserved(self) -> None:
        gltf, blob, src = _source_glb(self.tmp, with_uv=True)
        out = self.tmp / "rigged_keep.glb"
        self._write(gltf, blob, out,
                    src_uv=np.full((3, 2), 9.9, dtype=np.float32))
        og, ob = _read_glb(out)
        attrs = og["meshes"][0]["primitives"][0]["attributes"]
        got = _acc_data(og, ob, attrs["TEXCOORD_0"])
        np.testing.assert_allclose(
            got, [[0.25, 0.25], [0.5, 0.25], [0.25, 0.5]], atol=1e-6)


if __name__ == "__main__":
    unittest.main()
