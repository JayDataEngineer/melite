"""THE VIEW-NODE DECODE SEAT (roadmap host-binary cure, 2026-10-13):
melite_view's contact sheet and waveform are ENGINE-PRODUCED — the
vendored MeliteFrameSheet / MeliteWaveform nodes decode with PyAV
inside the engine, never a harness-side ffmpeg. These walls drive the
nodes DIRECTLY on the committed fixtures (the same film/tone the TS
plane's probe pins), so the decode itself is proven on every box with
the stack. Where av/torch are absent the seat skips LOUD — CI owns the
stack guarantee.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-utility-nodes"
FIXTURES = Path(__file__).resolve().parents[1] / "packages" / "harness" / "melite-tools" / "test" / "fixtures"

av = pytest.importorskip("av", reason="PyAV is the view nodes' decode seat (pip install av)")
torch = pytest.importorskip("torch", reason="the view nodes compose sheets as torch tensors")


def _load_nodes():
    spec = importlib.util.spec_from_file_location("_melite_utility_nodes_test", PACKAGE_ROOT / "nodes.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["_melite_utility_nodes_test"] = module
    spec.loader.exec_module(module)
    return module


def test_frame_sheet_builds_the_tiled_shape_on_the_committed_film():
    nodes = _load_nodes()
    sheet = nodes.MeliteFrameSheet().sheet(str(FIXTURES / "film-2s.mp4"), 4, 320)[0]
    # two frames per row at width 320 → a 640-wide sheet, one batch
    assert sheet.shape[0] == 1
    assert sheet.shape[3] == 3
    assert sheet.shape[2] == 640, sheet.shape
    assert sheet.shape[1] > 0
    assert float(sheet.min()) >= 0.0 and float(sheet.max()) <= 1.0
    # the committed film is 160x120 @10fps — at width 320 the 4:3
    # aspect gives 240 per frame, two rows stack to 480
    assert sheet.shape[1] == 480, sheet.shape


def test_frame_sheet_refuses_a_missing_film_by_name():
    nodes = _load_nodes()
    with pytest.raises(RuntimeError, match="MeliteFrameSheet: no media file at"):
        nodes.MeliteFrameSheet().sheet(str(FIXTURES / "no-such-film.mp4"), 4, 320)
    with pytest.raises(RuntimeError, match="the media path is empty"):
        nodes.MeliteFrameSheet().sheet("", 4, 320)


def test_waveform_paints_the_tone_envelope():
    nodes = _load_nodes()
    wav = nodes.MeliteWaveform().waveform(str(FIXTURES / "tone-05s.wav"), 640, 240)[0]
    assert tuple(wav.shape) == (1, 240, 640, 3)
    # a real tone paints #9db4ff columns on a black field — the
    # painted pixel carries the exact palette, the field stays zero
    painted = (wav > 0).any(dim=-1)
    assert int(painted.sum()) > 0, "the tone painted no columns"
    black = (wav == 0).all(dim=-1)
    assert int(black.sum()) > 0, "the canvas is not a field"
    # the painted rows carry the palette (B=1.0, R≈0.62, G≈0.71)
    rows = wav[painted]
    assert float(rows[..., 2].min()) == 1.0
    assert 0.5 < float(rows[..., 0].mean()) < 0.8
    # the tone's own envelope: painted pixels are a fraction of the
    # canvas — a solid fill is not an envelope
    assert int(painted.sum()) < 240 * 640, "the whole canvas is painted — not an envelope"


def test_waveform_refuses_a_missing_clip_by_name():
    nodes = _load_nodes()
    with pytest.raises(RuntimeError, match="MeliteWaveform: no media file at"):
        nodes.MeliteWaveform().waveform(str(FIXTURES / "no-such-tone.wav"), 640, 240)


def test_frame_sheet_refuses_a_file_with_no_video_stream():
    nodes = _load_nodes()
    # the tone fixture is audio-only — PyAV's bare IndexError is
    # re-voiced with the node's own name (never a silent tuple error)
    with pytest.raises(RuntimeError, match="MeliteFrameSheet: no video stream"):
        nodes.MeliteFrameSheet().sheet(str(FIXTURES / "tone-05s.wav"), 4, 320)
