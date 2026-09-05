"""test_img_to_mesh_upload — the 3D lane accepts the editor's uploads.

The 2026-09-06 incident (operator verbatim): attaching the source image
on the visual Image->3D card then running 400'd
"card_compose rc=-3 ... input_image 'data:image/png;base64,iVBOR..." —
TWO defects in one toast:

  1. the lane's _resolve_input only knew mount paths, so the editor's
     attach shape (a data: URL — what SlotGrid writes on EVERY card)
     refused at the phase-1 door;
  2. the refusal quoted the ENTIRE value, dumping megabytes of base64
     onto the card.

This wall pins the input-prep contract on all three img-to-mesh arms,
with no GPU and no network:

  1. phase-1 admission — data: uploads compile on trellis2-native,
     pixal3d (image magic) and transfer_rig (glTF magic, empty mime —
     a dropped .glb usually arrives as data:;base64,...);
  2. LOUD short refusals — missing params, wrong-kind bytes, dangling
     paths; no refusal ever echoes more than a prefix of the value;
  3. phase-2 render — the staged upload renders with the staged name
     in LoadImage, bytes on disk in the run-input pool, no GPU.
"""
import base64
import os
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

from _anchor import REPO


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    """Path setup LAZILY (R5: nothing executes at import/collection —
    the same inserts the loader owns in production, mirrored here
    once per module, before the first test runs)."""
    for p in (os.path.join(REPO, "py"),
              os.path.join(REPO, "plugins", "engines", "comfyui"),
              os.path.join(
                  REPO, "plugins", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)
    import compose
    globals()["_compose_pkg"] = compose
    yield


_TINY_PNG_B64 = base64.b64encode(
    b"\x89PNG\r\n\x1a\n" + b"\x00" * 32).decode()
_TINY_GLB_B64 = base64.b64encode(b"glTF" + b"\x00" * 32).decode()
_TINY_TXT_B64 = base64.b64encode(b"hello, not an image").decode()

_PNG = "data:image/png;base64,%s" % _TINY_PNG_B64
# a dropped .glb usually carries NO mime (unknown extension) — the
# glTF magic is the admission, never the browser's claim.
_GLB = "data:;base64,%s" % _TINY_GLB_B64


def _arm() -> object:
    mod = sys.modules.get("img_to_mesh.compose")
    if mod is None:
        mod = _compose_pkg._load_arm_package("3d/img_to_mesh")
        sys.modules["img_to_mesh.compose"] = mod
    return mod


def test_phase1_upload_compiles_both_lift_arms() -> None:
    """The operator crash: an attached source image compiles on the
    trellis2-native AND pixal3d arms (phase 1 admits the shape)."""
    for model in ("trellis2-native", "pixal3d"):
        rc, _y, extra, err = _compose_pkg.card_compose(
            {"model": model, "params": {"input_image": _PNG}},
            model, "", None)
        assert rc == 0, err
        inputs = (extra or {}).get("inputs") or {}
        assert inputs.get("input_image") == _PNG, inputs


def test_phase1_transfer_glb_uploads_compile() -> None:
    """Rig slots admit empty-mime glTF uploads (the attach shape for
    a dropped .glb — file.type is empty for the extension)."""
    rc, _y, extra, err = _compose_pkg.card_compose(
        {"model": "transfer_rig",
         "params": {"rigged_glb": _GLB, "target_glb": _GLB}},
        "transfer_rig", "", None)
    assert rc == 0, err
    inputs = (extra or {}).get("inputs") or {}
    assert inputs.get("rigged_glb") == _GLB, inputs


def test_phase1_missing_params_still_refuse() -> None:
    """The rewrite kept the required-param guards (an absent upload
    is a named refusal, never a silent default mesh)."""
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "trellis2-native", "params": {}}, "trellis2-native",
        "", None)
    assert rc != 0
    assert "required param 'input_image' missing" in (err or ""), err
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "transfer_rig", "params": {}}, "transfer_rig",
        "", None)
    assert rc != 0
    assert "rigged_glb" in (err or "") and "target_glb" in (err or ""), err


def test_phase1_wrong_kind_bytes_refuse() -> None:
    """Well-formed uploads of the wrong kind refuse with the KIND
    named (text is not an image; a PNG is not a GLB)."""
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "pixal3d",
         "params": {"input_image": "data:text/plain;base64,%s" % _TINY_TXT_B64}},
        "pixal3d", "", None)
    assert rc != 0
    assert "not an image" in (err or ""), err
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "transfer_rig",
         "params": {"rigged_glb": _PNG, "target_glb": _GLB}},
        "transfer_rig", "", None)
    assert rc != 0
    assert "not a GLB" in (err or ""), err


def test_phase1_refusals_never_echo_the_bytes() -> None:
    """The megabyte-toast half of the incident: a dangling 5000-char
    path and a 5000-char garbage payload both refuse SHORT."""
    long_path = "/mnt/nowhere/" + "x" * 5000 + ".png"
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "trellis2-native",
         "params": {"input_image": long_path}},
        "trellis2-native", "", None)
    assert rc != 0
    assert len(err or "") < 400, "refusal echoes the value: %d chars" % len(err or "")
    assert "x" * 100 not in (err or ""), err
    long_bad = "data:image/png;base64," + "!" * 5000
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "trellis2-native",
         "params": {"input_image": long_bad}},
        "trellis2-native", "", None)
    assert rc != 0
    assert len(err or "") < 400, "refusal echoes the value: %d chars" % len(err or "")
    assert "!" * 100 not in (err or ""), err


def test_phase2_upload_stages_and_renders(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Render tier: decoded upload bytes land in the run-input pool
    and the pixal graph loads them by staged name. The input dir is
    patched to tmp (walls never stage into the estate input dir)."""
    pool = tmp_path
    # the arm read input_dir at ITS import (from _config import
    # input_dir) — patch the arm's binding too.
    arm = _arm()
    monkeypatch.setattr(arm, "input_dir", lambda: str(pool))
    rc, y, _extra, err = _compose_pkg.card_compose(
        {"model": "pixal3d", "params": {"input_image": _PNG}},
        "pixal3d", "run-img2mesh-wall", None)
    assert rc == 0, err
    staged = list(pool.glob("input_runimg2meshwall*.png"))
    assert staged, "upload bytes never staged: %s" % list(pool.iterdir())
    nodes = y["nodes"] if isinstance(y, dict) else y.nodes
    wf = (nodes[0].get("params", {}).get("workflow") if isinstance(
        nodes[0], dict) else nodes[0].params.get("workflow"))
    assert isinstance(wf, dict) and wf, "empty workflow"
    loads = [v for v in wf.values()
             if isinstance(v, dict) and v.get("class_type") == "LoadImage"]
    assert loads, "no LoadImage in the lift graph"
    assert loads[0]["inputs"]["image"] == staged[0].name, loads[0]
