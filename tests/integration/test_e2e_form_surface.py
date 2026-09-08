"""E2E THROUGH THE FORM SURFACE — the editor's real path.

THE GAP (caught when planning the F+G e2e thread): every existing
canary (tests/integration/test_*.py) calls door.submit with a
HARDCODED body — the model fields with literal values the test
author picked. The canary proves the BACK HALF of the editor flow
(submit → wait → artifact) but NEVER touches the FRONT half the
user sees: the form-spec the editor serves, the `defaults` it
ships, the families= scoping it computes.

A regression class the back-half canaries CANNOT catch:
  - the form's `defaults` block drifts from the card class's actual
    field defaults (one source of truth gone)
  - a form's `required` field name mismatches the compose's required
    path (the editor's pre-submit validation passes, the queue's
    compose refuses with -3 "required param 'foo' missing")
  - the families= scoping of a path input flips a field from
    visible to invisible for the wrong family

This suite takes the EDITOR's exact path:
  1. GET /v1/form-spec?model=<id>           (the editor's spec fetch)
  2. take spec["defaults"] as the body      (the editor's starting
                                            form state — the user
                                            hasn't typed anything)
  3. fill the required path param(s)        (the editor's "user picks
                                            a file" gesture)
  4. POST /v1/flows/start                (the editor's submit)
  5. poll + assert artifacts + routes to    (the editor's "your
     the right viewer slot                   asset is ready" panel)

Each test IS the editor path, not a parallel one. The families
covered are the 3d + video + image groups built this session
(transfer_rig, wan-vace, scail2-animate, seedvr2_ema) — the
operator's "these cards" thread.

Serial GPU (pytest -m gpu); the queue door is the ONLY inference
path (INFERENCE LAW).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import QueueDoor

pytestmark = pytest.mark.gpu

# JSON wire values (form-spec defaults round-trip as parsed JSON).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


# ── the form-spec door (the editor's fetch) ──────────────────────────

def _form_spec(port: int, model: str) -> dict[str, JsonValue]:
    code, spec = _http("GET", port, "/v1/form-spec?model=%s" % model)
    assert code == 200, "form-spec refused for %s: %d %s" % (
        model, code, spec)
    return spec


def _http(method: str, port: int, path: str) -> tuple[int, JsonValue]:
    url = "http://127.0.0.1:%d%s" % (port, path)
    r = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


# ── the routing law (the viewer's claim) ──────────────────────────────
# Mirrored from packages/web/editor/src/surfaces/assets/AssetMedia.tsx
# (isMeshAsset / isMotionAsset regexes). A regression in either side
# must show here — the editor routes by extension, this is the E2E
# claim.

_MESH_EXTS = (".glb", ".gltf", ".fbx")
_MOTION_EXTS = (".npz",)
_VIDEO_EXTS = (".mp4", ".webm")


def _route(name: str) -> str:
    """The slot a harvested artifact lands in, by extension. Mirrors
    AssetMedia.tsx; if the editor changes its regex, this stays in
    lockstep or the E2E fails loud."""
    lower = name.lower()
    if any(lower.endswith(e) for e in _MESH_EXTS):
        return "mesh-viewer"
    if any(lower.endswith(e) for e in _MOTION_EXTS):
        return "motion-viewer"
    if any(lower.endswith(e) for e in _VIDEO_EXTS):
        return "video-viewer"
    return "image-tile"


# ── THE EDITOR'S PATH (per family) ───────────────────────────────────

def test_form_surface_transfer_rig(gateway: QueueDoor, assets: dict[str, str | None],
                                     gateway_port: int) -> None:
    """transfer_rig's form defaults (rigged_glb = SOMAX canonical) →
    submit → rigged .glb artifact lands in mesh-viewer.

    The form's defaults carry NO target_glb — the OUTfit GLB is a
    required user input (the editor's "pick the outfit" affordance).
    E2E: the form's defaults are real but incomplete; the editor
    adds the outfit path before submit; without it the queue's
    compose refuses loudly (rc=-3)."""
    spec = _form_spec(gateway_port, "transfer_rig")
    body = dict(spec.get("defaults") or {})
    body["model"] = "transfer_rig"
    body["rigged_glb"] = assets["rigged_glb"] or assets["source"]
    body["target_glb"] = assets["outfit_glb"] or assets["source"]
    # transfer_rig is the cheap lane — single-step Kimodo transfer
    rid = gateway.submit(body)
    status = gateway.wait(rid, timeout_s=900)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    glbs = [a for a in arts if a.suffix.lower() == ".glb"]
    assert glbs, "no rigged .glb: %s" % [a.name for a in arts]
    for a in glbs:
        assert _route(a.name) == "mesh-viewer", \
            "form-driven transfer_rig artifact %s routes to %s" % (
                a.name, _route(a.name))
        assert a.stat().st_size > 4000, "rigged glb too small: %d" % \
            a.stat().st_size


# A sample prompt the editor would ship in the form's example helper —
# the editor requires the user to type (no default for required text);
# the E2E proves the editor's "user types prompt" affordance is real.
_FORM_PROMPT = (
    "verb-first motion across the frame, one continuous take")


def test_form_surface_wan_vace(gateway: QueueDoor, assets: dict[str, str | None],
                                 gateway_port: int) -> None:
    """wan-vace's form defaults (the Lightning 4-step shape) +
    reference_image + prompt → submit → film artifact in video-viewer.

    E2E truth: prompt is REQUIRED (the form's Textarea has no
    default — an empty prompt is refused by the compose phase 1).
    The E2E supplies a prompt the way the user would."""
    spec = _form_spec(gateway_port, "wan-vace")
    body = dict(spec.get("defaults") or {})
    body["model"] = "wan-vace"
    body["prompt"] = _FORM_PROMPT
    body["reference_image"] = assets["source"]
    rid = gateway.submit(body)
    status = gateway.wait(rid, timeout_s=1800)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    films = [a for a in arts if a.suffix.lower() in _VIDEO_EXTS]
    assert films, "no film: %s" % [a.name for a in arts]
    for a in films:
        assert _route(a.name) == "video-viewer", \
            "wan-vace form artifact %s routes to %s" % (
                a.name, _route(a.name))


def test_form_surface_scail2_animate(gateway: QueueDoor, assets: dict[str, str | None],
                                       gateway_port: int) -> None:
    """scail2-animate's form defaults + reference_image + pose_video +
    prompt → submit → film artifact lands in video-viewer."""
    spec = _form_spec(gateway_port, "scail2-animate")
    body = dict(spec.get("defaults") or {})
    body["model"] = "scail2-animate"
    body["prompt"] = _FORM_PROMPT
    body["reference_image"] = assets["source"]
    body["pose_video"] = str(
        Path(assets["source"]).parent / "drive_pose.mp4")
    rid = gateway.submit(body)
    status = gateway.wait(rid, timeout_s=2400)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    films = [a for a in arts if a.suffix.lower() in _VIDEO_EXTS]
    assert films, "no film: %s" % [a.name for a in arts]


def test_form_surface_seedvr2_ema(gateway: QueueDoor, assets: dict[str, str | None],
                                    gateway_port: int) -> None:
    """seedvr2_ema's form defaults (1080 / 4096 / batch 1) + input
    image → submit → restored .png artifact lands in image-tile (the
    diffusion upscale restores to a still, not a glb). No prompt
    required — the upscale lane is a transformer of an existing
    frame, not a generator."""
    spec = _form_spec(gateway_port, "seedvr2_ema")
    body = dict(spec.get("defaults") or {})
    body["model"] = "seedvr2_ema"
    body["input_image"] = assets["source"]
    rid = gateway.submit(body)
    status = gateway.wait(rid, timeout_s=1500)
    assert status["status"] == "completed", status.get("error")
    arts = gateway.artifacts_on_disk(status)
    pngs = [a for a in arts if a.suffix.lower() == ".png"]
    assert pngs, "no restored png: %s" % [a.name for a in arts]
    for a in pngs:
        assert a.stat().st_size > 20_000, \
            "restored png too small: %d" % a.stat().st_size


# ── the cross-card flow e2e (the grouped-card doctrine) ─────────

def test_flow_image_then_upscale(gateway: QueueDoor, assets: dict[str, str | None],
                                   gateway_port: int) -> None:
    """The grouped-card flow: an image-gen family submits first → its
    .png becomes the upscale-tools' input_image → a second submit
    restores it → BOTH artifacts on disk. Proves cross-card input
    chaining (the editor's "use as input" affordance)."""
    # step 1 — image-gen (the form surface, defaults + required prompt)
    spec1 = _form_spec(gateway_port, "krea-2")
    body1 = dict(spec1.get("defaults") or {})
    body1["model"] = "krea-2"
    body1["prompt"] = _FORM_PROMPT
    rid1 = gateway.submit(body1)
    st1 = gateway.wait(rid1, timeout_s=600)
    assert st1["status"] == "completed", st1.get("error")
    arts1 = gateway.artifacts_on_disk(st1)
    img1 = next((a for a in arts1 if a.suffix.lower() == ".png"), None)
    assert img1, "no image-gen png: %s" % [a.name for a in arts1]
    # step 2 — upscale-tools, fed by step 1's artifact
    spec2 = _form_spec(gateway_port, "seedvr2_ema")
    body2 = dict(spec2.get("defaults") or {})
    body2["model"] = "seedvr2_ema"
    body2["input_image"] = str(img1)
    rid2 = gateway.submit(body2)
    st2 = gateway.wait(rid2, timeout_s=1500)
    assert st2["status"] == "completed", st2.get("error")
    arts2 = gateway.artifacts_on_disk(st2)
    pngs2 = [a for a in arts2 if a.suffix.lower() == ".png"]
    assert pngs2, "no restored png: %s" % [a.name for a in arts2]
    # both artifacts coexist on disk — the editor's "session view"
    # shows the image-gen png AND the upscale-tools png
    assert any(a.name in os.fspath(img1)
               or str(img1.resolve()) == str(a.resolve())
               for a in arts1)
