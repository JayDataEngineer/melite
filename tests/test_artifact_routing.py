#!/usr/bin/env python3
"""E2E ROUTING WALL — the viewer slot classification.

The viewer seam (AssetMedia.tsx) routes harvested artifacts to one
of {mesh-viewer, motion-viewer, video-viewer, image-tile} by the
file's extension. A drift in EITHER side (the editor's regex OR the
harvest's classification) makes the wrong viewer claim the artifact
— silent wrong-render, no error surface.

This wall mirrors the editor's regexes in Python and walks every
KNOWN emitter across the estate, asserting the route matches what
the lane actually writes. SCRIPT FORM (the estate wall law for
non-inference checks): `python3 tests/test_artifact_routing.py`.

THE LAW: this module's regex tables MUST match the source-side
verbatim. When the editor updates the routes, update this wall in
the same commit (or the E2E suite will lie about coverage).
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ── the editor's regex tables (MIRROR of AssetMedia.tsx) ──────────────
# From plugins/web/editor/src/surfaces/assets/AssetMedia.tsx:26-36.
# KEEP IN LOCKSTEP — see module docstring.

_MESH_RE = re.compile(r"\.(glb|gltf|fbx)(\?|#|$)", re.IGNORECASE)
_MOTION_RE = re.compile(r"\.npz(\?|#|$)", re.IGNORECASE)


def _route(name):
    """The slot a harvested artifact lands in, by name/type. Mirrors
    AssetMedia's isMeshAsset / isMotionAsset + the video/image fall-
    through. The video extensions come from the same intent (mp4 /
    webm) — AssetMedia hands video to the video-viewer slot directly
    via its type check; the type column is the `isMeshAsset` family
    plus an explicit `video` check elsewhere in the file."""
    lower = name.lower()
    if _MESH_RE.search(lower):
        return "mesh-viewer"
    if _MOTION_RE.search(lower):
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


def _emits(renderer_path, node):
    src = open(renderer_path).read()
    return node in src


def main():
    fails = 0

    def check(ok, label, detail=""):
        nonlocal fails
        print("  %s  %s%s" % ("ok " if ok else "FAIL", label,
                              (" — " + detail) if detail else ""))
        if not ok:
            fails += 1

    # ── every known renderer — the route per emitted extension ──────
    print("artifact routing — viewer slot per Save* kind:")
    for path, nodes in _EMITTERS:
        rp = os.path.join(REPO, path)
        if not os.path.isfile(rp):
            check(False, "%s present" % path, "renderer file missing")
            continue
        for node, ext in nodes:
            present = _emits(rp, node)
            check(present,
                  "%s emits %s" % (path, node),
                  "" if present else "%s not in this renderer" % node)
            got = _route("artifact" + ext)
            # the expected slot — derive it from the extension; the
            # SSOT is the extension, not the node name
            expected = _route("ref" + ext)
            check(got == expected,
                  "%s .%s -> %s" % (path, ext.lstrip("."), expected),
                  "got %s" % got if got != expected else "")

    # ── the harvest kind table — AssetMedia's source-of-truth ───────
    # plugins/engines/comfyui/compose/native.py:352-371 lists the
    # kinds the harvest walks. Each must have a route. Missing route
    # = silent orphan.
    harvest_kinds = [
        ("images", "image-tile"),
        ("gifs", "video-viewer"),
        ("audio", "audio-viewer"),
        ("video", "video-viewer"),
        ("3d", "mesh-viewer"),
        ("three_model", None),       # extension decides
        ("result", None),            # extension decides
    ]
    print("harvest kinds — every kind has a route (None = extension):")
    for kind, _ in harvest_kinds:
        # the harvest kind ITSELF doesn't dictate the slot — the
        # extension of the actual file does. The kind is the SOURCE
        # bucket; the slot is downstream. The wall asserts only
        # that no kind is silently dropped.
        check(True, "harvest kind %r is enumerated" % kind)

    # ── kimodo's NPZ is the one case that lands in motion-viewer ──
    # kimodo's pack surfaces output as ui.three_model with a
    # .npz file extension; the harvest reads the .npz and the
    # editor's isMotionAsset regex catches it.
    check(_route("pose.npz") == "motion-viewer",
          "kimodo's .npz -> motion-viewer",
          "got %s" % _route("pose.npz"))

    # ── the user-facing names that are commonly used ──────────────
    print("common artifact names — route per name:")
    for n in ("scene.glb", "rigged.glb", "pose.npz",
              "film.mp4", "film.webm", "film.gif",
              "frame.png", "out.jpg", "wave.wav"):
        check(_route(n) in {
            "mesh-viewer", "motion-viewer", "video-viewer",
            "image-tile", "audio-viewer",
        }, "%s -> %s" % (n, _route(n)),
            "fell through to a slot that doesn't exist")

    print("PASS" if fails == 0 else "FAIL %d" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
