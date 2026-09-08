"""Compile-time photo door + submit-time staging walls (2026-09-06).

Operator order (verbatim): "WHERE THE [REDACTED 2026-11-05] IS COMPILE TIME ERRORS.
... THIS 100% VERFIABLE BY YOUR OWN DAMN SELF".

The run-9e8fd6b813a2 failure proved BOTH gaps live:

1. THE DOOR — the start/validate doors compiled the graph shape but
   never checked the photo initial: a browser-local data: URL or a
   path with no file on disk queued a run that could only die in
   the engine. Now EstatePhotoRef (py/melite_models/refs.py) guards
   the photo initial on BOTH photo flows (initial_validators — the
   AnnyBakeParams door pattern): browser-local, non-image, and
   missing-file photos 4xx BEFORE any run registers.

2. THE STAGING — the submit-time walk
   (compose/native.py::_upload_referenced) uploaded ABSOLUTE paths
   only, so the estate's own repo-relative refs (data/input/<file>
   — what POST /v1/uploads returns) rode the prompt raw and
   LoadImage 400'd ("Invalid image file: data/input/..."). Now
   cwd-relative paths that resolve to files stage like absolute
   ones; the VHS server-path exemption and the missing-file
   pass-through (the door's refusal, not the walk's) hold.

No GPU, no network — models + the walk with a stubbed transport.
"""

import os
import sys
from pathlib import Path
from types import ModuleType

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _anchor import REPO  # noqa: E402

sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "packages" / "engines" / "comfyui"
                       / "compose"))

import flow as flow_mod  # noqa: E402
from flow import FlowError  # noqa: E402
from melite_models import EstatePhotoRef  # noqa: E402


# ── 1. the validator ─────────────────────────────────────────────

def test_photo_exts_match_the_submit_time_table() -> None:
    """What the lane stages is what the door admits — the restated
    set is pinned to artifact._EXTS[Kind.IMAGE (the params-artifact
    literal==constant precedent)."""
    from artifact import _EXTS, Kind
    from melite_models.refs import _PHOTO_EXTS
    assert set(_PHOTO_EXTS) == set(_EXTS[Kind.IMAGE])


def test_wire_string_accepted_dict_accepted_garbage_refused(
        monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "x.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    monkeypatch.chdir(tmp_path)
    assert EstatePhotoRef.model_validate(
        "data/input/x.png").path == "data/input/x.png"
    assert EstatePhotoRef.model_validate(
        {"path": "data/input/x.png"}).path == "data/input/x.png"
    with pytest.raises(ValidationError):
        EstatePhotoRef.model_validate(42)


@pytest.mark.parametrize("bad,needle", [
    ("data:image/png;base64,AAAA", "browser-local"),
    ("blob:http://x/1", "browser-local"),
    ("data/input/x.txt", "not a stageable image"),
    ("py/gateway.py", "not a stageable image"),
])
def test_door_refusal_matrix(bad: str, needle: str,
                             monkeypatch: pytest.MonkeyPatch,
                             tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValidationError) as e:
        EstatePhotoRef.model_validate(bad)
    assert needle in str(e.value)


def test_missing_file_refused_at_the_door(
        monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """run-9e8fd6b813a2's class, caught before registration: the path
    is well-formed but nothing is on disk."""
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValidationError) as e:
        EstatePhotoRef.model_validate("data/input/ghost.png")
    assert "not on disk" in str(e.value)


def test_real_file_passes(monkeypatch: pytest.MonkeyPatch,
                          tmp_path: Path) -> None:
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "me.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    monkeypatch.chdir(tmp_path)
    assert EstatePhotoRef.model_validate(
        "data/input/me.png").path == "data/input/me.png"


# ── 2. both photo flows declare the door ──────────────────────────

@pytest.mark.parametrize("flow_id", ["anny-hmr", "anny-hmr-commercial"])
def test_flows_declare_the_photo_door(flow_id: str) -> None:
    fl = flow_mod.load_flow(flow_id)
    assert fl.initial_validators == {"photo": EstatePhotoRef}


@pytest.mark.parametrize("flow_id", ["anny-hmr", "anny-hmr-commercial"])
def test_flow_door_4xxes_before_registration(
        flow_id: str, monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path) -> None:
    """The validate_initial contract: FlowError (clean text, 4xx
    upstream) — no queue slot, no sidecar, no run dir."""
    monkeypatch.chdir(tmp_path)
    fl = flow_mod.load_flow(flow_id)
    with pytest.raises(FlowError) as e:
        fl.validate_initial({"flow": flow_id,
                             "photo": "data:image/png;base64,AAAA"})
    assert "browser-local" in str(e.value)
    with pytest.raises(FlowError) as e:
        fl.validate_initial({"flow": flow_id,
                             "photo": "data/input/ghost.png"})
    assert "not on disk" in str(e.value)


# ── 3. the staging walk ──────────────────────────────────────────

def _native() -> ModuleType:
    import native as native_mod
    return native_mod


def test_walk_stages_relative_estate_paths(
        monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """The run-9e8fd6b813a2 regression: data/input/<file> (what the
    uploads door returns) must ride the prompt as the server-side
    staged name, not the raw repo-relative ref."""
    N = _native()
    target = tmp_path / "data" / "input"
    target.mkdir(parents=True)
    (target / "shot.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    monkeypatch.chdir(tmp_path)
    calls: list[str] = []
    monkeypatch.setattr(
        N, "_upload",
        lambda server, path: calls.append(path) or {"name": "STAGED-shot.png"})
    wf = {"load": {"class_type": "LoadImage",
                   "inputs": {"image": "data/input/shot.png"}}}
    out, _seen = N._upload_referenced("http://engine:9999", wf)
    assert out["load"]["inputs"]["image"] == "STAGED-shot.png"
    assert calls == [str(target / "shot.png")]


def test_walk_keeps_exemptions_and_non_files(
        monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    N = _native()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        N, "_upload",
        lambda server, path: (_ for _ in ()).throw(
            AssertionError("nothing should stage: %s" % path)))
    wf = {"vhs": {"class_type": "VHS_LoadVideoPath",
                  "inputs": {"video": "/abs/mount/clip.mp4"}},
          "txt": {"class_type": "Note",
                  "inputs": {"text": "a prompt ending in .png"}},
          "miss": {"class_type": "LoadImage",
                   "inputs": {"image": "data/input/ghost.png"}}}
    out, seen = N._upload_referenced("http://engine:9999", wf)
    assert out["vhs"]["inputs"]["video"] == "/abs/mount/clip.mp4"
    assert out["txt"]["inputs"]["text"] == "a prompt ending in .png"
    assert out["miss"]["inputs"]["image"] == "data/input/ghost.png"
    assert seen == {}
