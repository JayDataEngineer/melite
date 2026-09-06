"""test_input_prep — the source lane boards (2026-09-05).

The "input cards don't accept image files" incident: the input model
was OFFERED (catalog row, editor surface) but boarded no card — every
input run 400'd "no model unit for model: input" at the validate
door. Offered means runnable.

This wall pins the boarding, end to end, with no GPU and no network:
  1. resolution — the model resolves to the comfyui engine and names
     the input-prep card whose arm exists;
  2. phase-1 admission — the upload shape compiles (data: URL echo);
     the defect shapes refuse LOUDLY (missing source, undetectable
     type, dangling artifact ref, off-matrix transforms, video);
  3. phase-2 render — the staged upload renders a LoadImage ->
     [crop/scale] -> SaveImage graph (audio: LoadAudio -> SaveAudio),
     bytes on disk in the run-input pool, no GPU.
"""

import base64
import os
import sys
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import TYPE_CHECKING

import pytest

from _anchor import REPO

if TYPE_CHECKING:
    from melite_models import Model


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
_TINY_WAV_B64 = base64.b64encode(b"RIFF" + b"\x00" * 32).decode()


def _load_model_class(mid: str) -> "type[Model] | None":
    from melite_models import load_model_py
    from _coscript import model_pys
    for mpy in model_pys(mid):
        try:
            engine = mpy.parent.parent.parent.name
            return load_model_py(str(mpy), engine)
        except Exception:
            continue
    return None


def _arm_compose_module() -> ModuleType:
    """The loaded input-prep arm module (package alias input_prep).

    Loading the package has no side effects (no staging, no GPU);
    the phase-2 tests patch its input_dir binding to tmp."""
    mod = sys.modules.get("input_prep.compose")
    if mod is None:
        mod = _compose_pkg._load_arm_package("image/input_prep")
    return mod


def test_input_resolves_the_comfyui_engine() -> None:
    """Resolution tier: the offered input model resolves (the incident
    refusal — "no model unit for model: input" — is dead)."""
    import plugins as plugins_bus
    etype, _mpy = plugins_bus.resolve_model("input")
    assert etype == "comfyui", etype


def test_input_boards_the_input_prep_arm() -> None:
    """Boarding tier: the class names the card, the card is in the
    compose table, the arm file exists."""
    cls = _load_model_class("input")
    assert cls is not None
    assert getattr(cls, "card", "") == "input-prep"
    assert "input-prep" in _compose_pkg._CARD_DIR_BY_CARD
    arm = os.path.join(
        REPO, "plugins", "engines", "comfyui", "action_cards",
        _compose_pkg._CARD_DIR_BY_CARD["input-prep"], "py", "compose.py")
    assert os.path.isfile(arm), "missing arm %s" % arm


def test_phase1_upload_compiles() -> None:
    """The editor's upload shape (data: URL source) compiles — the
    exact body buildGenerationBody posts for an attached file."""
    rc, _y, extra, err = _compose_pkg.card_compose(
        {"model": "input",
         "params": {"source": "data:image/png;base64,%s" % _TINY_PNG_B64}},
        "input", "", None)
    assert rc == 0, err
    inputs = (extra or {}).get("inputs") or {}
    assert inputs.get("media_type") == "image", inputs


def test_phase1_missing_source_refuses() -> None:
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {}}, "input", "", None)
    assert rc != 0
    assert "source" in (err or ""), err


def test_phase1_undetectable_source_refuses() -> None:
    """A source with no detectable type is a loud refusal, never a
    graph that guesses."""
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {"source": "mystery-no-extension"}},
        "input", "", None)
    assert rc != 0
    assert "media type" in (err or ""), err


def test_phase1_dangling_artifact_ref_refuses() -> None:
    """The pruned-run class: an artifact URL gone from disk 400s at
    compile time (the artifact-ref gate + the arm's own locate)."""
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {
            "source": "/v1/assets/runs/run-pruned-0000/gone.png"}},
        "input", "", None)
    assert rc != 0
    assert "gone.png" in (err or ""), err


def test_phase1_off_matrix_transforms_refuse() -> None:
    """crop/scale ride image sources only; trim/volume are not
    boarded yet — each refusal names the param and the reason."""
    img = "data:image/png;base64,%s" % _TINY_PNG_B64
    audio = "data:audio/wav;base64,%s" % _TINY_WAV_B64
    cases = [
        ({"source": audio,
          "crop": {"x": 0, "y": 0, "width": 8, "height": 8}}, "crop"),
        ({"source": img,
          "trim": {"start": 0, "end": 1}}, "trim"),
        ({"source": audio, "volume": 1.5}, "volume"),
    ]
    for params, word in cases:
        rc, _y, _extra, err = _compose_pkg.card_compose(
            {"model": "input", "params": params}, "input", "", None)
        assert rc != 0, params
        assert word in (err or ""), (params, err)


def test_phase1_video_refuses_with_the_unblock_condition() -> None:
    """Video is the honest no: native LoadVideo->SaveVideo has no
    execution proof on this estate. The refusal says so."""
    rc, _y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {"source": "clip.mp4"}},
        "input", "", None)
    assert rc != 0
    assert "video" in (err or "").lower(), err


def test_phase2_upload_renders_the_restage_graph(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Render tier: decoded upload bytes land in the run-input pool
    and the graph loads->scales->saves them. The input dir is
    patched to tmp (walls never stage into the estate input dir)."""
    pool = tmp_path
    # the arm read input_dir at ITS import (from _config import
    # input_dir) — patch the arm's binding too.
    arm = _arm_compose_module()
    monkeypatch.setattr(arm, "input_dir", lambda: str(pool))
    rc, y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {
            "source": "data:image/png;base64,%s" % _TINY_PNG_B64,
            "scale": {"width": 64, "height": 64}}},
        "input", "run-inputprep-wall", None)
    assert rc == 0, err
    staged = list(pool.glob("input_runinputprepwall*.png"))
    assert staged, "upload bytes never staged: %s" % list(pool.iterdir())
    nodes = y["nodes"] if isinstance(y, dict) else y.nodes
    kinds = [n.get("node_type") if isinstance(n, dict) else n.node_type
             for n in nodes]
    assert kinds == ["comfyui"], kinds
    wf = (nodes[0].get("params", {}).get("workflow") if isinstance(
        nodes[0], dict) else nodes[0].params.get("workflow"))
    assert isinstance(wf, dict) and wf, "empty workflow"
    classes = sorted(v.get("class_type", "") for v in wf.values()
                     if isinstance(v, dict))
    assert classes == ["ImageScale", "LoadImage", "SaveImage"], classes
    load = next(v for v in wf.values()
                if isinstance(v, dict)
                and v.get("class_type") == "LoadImage")
    assert load["inputs"]["image"] == staged[0].name, load


def test_phase2_audio_renders_the_passthrough_graph(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Audio restages untouched (no gain node on the native rail)."""
    pool = tmp_path
    arm = _arm_compose_module()
    monkeypatch.setattr(arm, "input_dir", lambda: str(pool))
    rc, y, _extra, err = _compose_pkg.card_compose(
        {"model": "input", "params": {
            "source": "data:audio/wav;base64,%s" % _TINY_WAV_B64}},
        "input", "run-inputprep-wall-au", None)
    assert rc == 0, err
    assert list(pool.glob("input_runinputprepwall*.wav")), \
        "upload bytes never staged: %s" % list(pool.iterdir())
    nodes = y["nodes"] if isinstance(y, dict) else y.nodes
    wf = (nodes[0].get("params", {}).get("workflow") if isinstance(
        nodes[0], dict) else nodes[0].params.get("workflow"))
    classes = sorted(v.get("class_type", "") for v in wf.values()
                     if isinstance(v, dict))
    assert classes == ["LoadAudio", "SaveAudio"], classes
