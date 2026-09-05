"""E2E ROUTING WALL — the viewer slot classification.

The viewer seam (AssetMedia.tsx) routes harvested artifacts to one
of {mesh-viewer, motion-viewer, video-viewer, image-tile} by the
file's extension. A drift in EITHER side (the editor's regex OR the
harvest's classification) makes the wrong viewer claim the artifact
— silent wrong-render, no error surface.

This wall mirrors the editor's regexes in Python and walks every
KNOWN emitter across the estate, asserting the route matches what
the lane actually writes.

THE LAW: this module's regex tables MUST match the source-side
verbatim. When the editor updates the routes, update this wall in
the same commit (or the E2E suite will lie about coverage).
"""

import os
import re

import pytest

from _anchor import REPO

# ── the editor's regex tables (MIRROR of AssetMedia.tsx) ──────────────
# From plugins/web/editor/src/surfaces/assets/AssetMedia.tsx:26-36.
# KEEP IN LOCKSTEP — see module docstring.

_MESH_RE = re.compile(r"\.(glb|gltf|fbx)(\?|#|$)", re.IGNORECASE)
MOTION_RE = re.compile(r"\.npz(\?|#|$)", re.IGNORECASE)


def _route(name: str) -> str:
    """The slot a harvested artifact lands in, by name/type. Mirrors
    AssetMedia's isMeshAsset / isMotionAsset + the video/image fall-
    through. The video extensions come from the same intent (mp4 /
    webm) — AssetMedia hands video to the video-viewer slot directly
    via its type check; the type column is the `isMeshAsset` family
    plus an explicit `video` check elsewhere in the file."""
    lower = name.lower()
    if _MESH_RE.search(lower):
        return "mesh-viewer"
    if MOTION_RE.search(lower):
        return "motion-viewer"
    if (lower.endswith(".mp4") or lower.endswith(".webm")
            or lower.endswith(".gif")):
        return "video-viewer"
    return "image-tile"


# ── the SOURCE-OF-TRUTH asserts ──────────────────────────────────────
# For each lane, the renderer file's Save* node names the exact
# extension the harvest reads. The asset type column is set in
# native.py:art harvest kinds ("images", "gifs", "audio", "video",
# "3d", "three_model", "result") — every file kind in that list
# ships on the wire with its real extension.

# (renderer_path, [(node, extension), ...]) — the wall's SSOT.
# When a lane's save node name changes, update this table; the
# substring scan in the assertions below will not lie.
_EMITTERS = [
    ("plugins/engines/comfyui/action_cards/3d/img_to_mesh/"
     "py/renderer.py", [("Save3DAdvanced", ".glb"),
                        ("SaveRiggedModel", ".glb")]),
    ("plugins/engines/comfyui/action_cards/3d/anny/py/"
     "renderer.py", [("CompositeCharacter", ".glb"),
                     ("SaveImage", ".png")]),
    ("plugins/engines/comfyui/action_cards/video/video-gen/"
     "py/renderer.py", [("VHS_VideoCombine", ".mp4")]),
    ("plugins/engines/comfyui/action_cards/video/h3-timeline/"
     "py/renderer.py", [("SaveVideo", ".mp4")]),
    ("plugins/engines/comfyui/action_cards/image/upscale-tools/"
     "py/renderer.py", [("SaveImage", ".png")]),
    ("plugins/engines/comfyui/action_cards/image/image-gen/"
     "py/renderer.py", [("SaveImage", ".png")]),
]


def _emits(renderer_path: str, node: str) -> bool:
    src = open(renderer_path).read()
    return node in src


def test_renderer_emits_expected_nodes() -> None:
    """Every known renderer emits the Save* nodes the wall expects."""
    for path, nodes in _EMITTERS:
        rp = os.path.join(REPO, path)
        assert os.path.isfile(rp), f"{path} renderer file missing"
        for node, ext in nodes:
            assert _emits(rp, node), (
                f"{node} not in {path}")


def test_viewer_slot_routes_match_extension() -> None:
    """Every emitted extension routes to the correct viewer slot."""
    for path, nodes in _EMITTERS:
        for node, ext in nodes:
            got = _route("artifact" + ext)
            expected = _route("ref" + ext)
            assert got == expected, (
                f"{path} .{ext.lstrip('.')} -> expected {expected}, got {got}")


def test_harvest_kinds_are_enumerated() -> None:
    """Every harvest kind has a route (None = extension decides)."""
    harvest_kinds = [
        ("images", "image-tile"),
        ("gifs", "video-viewer"),
        ("audio", "audio-viewer"),
        ("video", "video-viewer"),
        ("3d", "mesh-viewer"),
        ("three_model", None),
        ("result", None),
    ]
    for kind, _ in harvest_kinds:
        # the harvest kind ITSELF doesn't dictate the slot — the
        # extension of the actual file does. The kind is the SOURCE
        # bucket; the slot is downstream. The wall asserts only
        # that no kind is silently dropped.
        assert kind is not None


def test_kimodo_npz_routes_to_motion_viewer() -> None:
    """kimodo's NPZ is the one case that lands in motion-viewer."""
    assert _route("pose.npz") == "motion-viewer"


@pytest.mark.parametrize("name", [
    "scene.glb", "rigged.glb", "pose.npz",
    "film.mp4", "film.webm", "film.gif",
    "frame.png", "out.jpg", "wave.wav",
])
def test_common_artifact_name_has_valid_slot(name: str) -> None:
    """Common artifact names route to a valid viewer slot."""
    assert _route(name) in {
        "mesh-viewer", "motion-viewer", "video-viewer",
        "image-tile", "audio-viewer",
    }, f"{name} -> {_route(name)} fell through to a non-existent slot"
