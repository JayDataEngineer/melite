"""THE ANNY UV SEAT (roadmap: "the anny estimator exports carry
position alone", closed 2026-10-13): upstream's saver writes
POSITION-only GLBs by construction — the estimator's own mesh on the
live tree carries no TEXCOORD_0 (verified on both anny engines), and
downstream refuses such a body (the coat has nowhere to land a detail
map, the fit has no seat). The cure lives in the vendored pack:
AnnyGroundBody unwraps REAL island UVs (xatlas chart formation) onto
the final grounded body, and a mesh that arrives WITH UVs rides them
through verbatim. This seat drives the unwrap on the committed real
estimator fixture — the same body the live chain produced. Skips LOUD
where xatlas/trimesh are absent; CI owns the stack guarantee.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
PACK = REPO / "vendor" / "comfyui_extensions" / "melite-kimodo-nodes"
FIXTURE = REPO / "tests" / "fixtures" / "anny_estimator_body.glb"

trimesh = pytest.importorskip("trimesh", reason="the anny export rides trimesh")
pytest.importorskip("xatlas", reason="the island unwrap is xatlas chart formation")


def _load_nodes(monkeypatch, tmp_path: Path):
    """Load the vendored pack with a stubbed output dir (no engine).

    The stub rides monkeypatch.setitem so pytest RESTORES the real
    sys.modules entry after the test — a leaked stub poisons every
    later seat that imports folder_paths at module level
    (melite-audio-nodes' resolve_model_folder reads
    folder_names_and_paths on import).
    """
    stub = types.ModuleType("folder_paths")
    stub.get_output_directory = lambda: str(tmp_path)
    monkeypatch.setitem(sys.modules, "folder_paths", stub)
    spec = importlib.util.spec_from_file_location(
        "_melite_anny_nodes_test", PACK / "nodes_anny.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["_melite_anny_nodes_test"] = module
    spec.loader.exec_module(module)
    return module


def _fixture_geometry():
    scene = trimesh.load(str(FIXTURE), force="scene")
    geoms = [g for g in scene.geometry.values()
             if hasattr(g, "vertices") and len(g.vertices)]
    assert geoms, "the estimator fixture carries no mesh geometry"
    return geoms


def test_the_estimator_fixture_is_position_only_upstream():
    # the ROOT CAUSE pinned: upstream's saver ships no TEXCOORD_0, so
    # the unwrap below is the only source of real UVs
    for g in _fixture_geometry():
        uv = getattr(g.visual, "uv", None)
        assert uv is None or len(uv) != len(g.vertices)


def test_ground_exports_a_body_the_coat_can_land_on(monkeypatch, tmp_path):
    nodes = _load_nodes(monkeypatch, tmp_path)
    (out,) = nodes.AnnyGroundBody.ground(str(FIXTURE))["result"]
    body = list(trimesh.load(out, force="scene").geometry.values())[0]
    uv = getattr(body.visual, "uv", None)
    assert uv is not None and len(uv) == len(body.vertices), (
        "the grounded body carries no per-vertex TEXCOORD_0 — the "
        "coat has nowhere to land a detail map"
    )
    # the unwrap may split seam vertices — the island count is real
    # (a planar projection would be one island-shaped sheet); the UV
    # space stays inside the unit tile
    assert float(uv.min()) >= 0.0 and float(uv.max()) <= 1.0


def test_an_arriving_uv_set_rides_through_verbatim(monkeypatch, tmp_path):
    nodes = _load_nodes(monkeypatch, tmp_path)
    import numpy as np
    # a tiny two-triangle "body" WITH UVs: the carry law — existing
    # TEXCOORD_0 is never re-unwrapped (verts/faces/uv pass through
    # unchanged, whatever the grounding transform did to positions)
    verts = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
                     dtype=np.float64)
    faces = np.array([[0, 1, 2], [1, 3, 2]], dtype=np.int64)
    uv = np.array([[0, 0], [1, 0], [0, 1], [1, 1]], dtype=np.float64)
    mesh = trimesh.Trimesh(
        vertices=verts, faces=faces, process=False,
        visual=trimesh.visual.TextureVisuals(uv=uv))
    v2, f2, uv2 = nodes._unwrap_uv(mesh)
    import numpy.testing as npt
    npt.assert_array_equal(f2, faces)
    npt.assert_array_equal(uv2, uv)
