"""THE CLIPPING LANE'S OVERLAY HALF (2026-11-17): in_sec is the source
in-point. The card stamps the conditioning slice with the same number
(actions.ts slice_start_seconds); this wall pins the MIX half — the
parser's in_sec law and the head trim that makes the overlay play
[in_sec, in_sec+dur_sec] at the film seat, never the source head.

Weight-free: _parse_clips + _trim_source_head are pure; the delay
chain is exercised with real torch tensors (no engine, no files).
"""
from __future__ import annotations

import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest

torch = pytest.importorskip("torch", reason="film_mix.py imports torch at module top")

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"


def _load_film_mix(monkeypatch):
    stub = types.ModuleType("_folder_paths_stub")
    stub.get_annotated_filepath = lambda name: os_path(name)
    monkeypatch.setitem(sys.modules, "folder_paths", stub)
    spec = importlib.util.spec_from_file_location("_film_mix_in_sec_test", PACKAGE_ROOT / "film_mix.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["_film_mix_in_sec_test"] = module
    spec.loader.exec_module(module)
    return module


import os


def os_path(name):
    return os.path.join("/nonexistent-input", name)


def test_parse_accepts_and_defaults_in_sec(monkeypatch):
    fm = _load_film_mix(monkeypatch)
    rows = json.dumps([
        {"src": "a.flac", "start_sec": 0.0, "dur_sec": 2.0, "class": "dialogue"},
        {"src": "b.flac", "start_sec": 4.0, "dur_sec": 2.0, "in_sec": 3.0, "class": "sfx"},
    ])
    clips = fm._parse_clips(rows)
    assert clips[0]["in_sec"] == 0.0, "a row without in_sec keeps the head (the pre-lane shape)"
    assert clips[1]["in_sec"] == 3.0


def test_parse_refuses_negative_in_sec(monkeypatch):
    fm = _load_film_mix(monkeypatch)
    rows = json.dumps([{"src": "a.flac", "start_sec": 0.0, "dur_sec": 2.0, "in_sec": -0.5}])
    with pytest.raises(RuntimeError, match=r"needs in_sec >= 0"):
        fm._parse_clips(rows)


def test_head_trim_slices_the_waveform_not_the_seat(monkeypatch):
    fm = _load_film_mix(monkeypatch)
    # 1s of 100Hz audio, ones ramped so the head is distinguishable
    sr = 100
    wf = torch.linspace(1.0, 2.0, sr).unsqueeze(0).unsqueeze(0)
    loaded = {"waveform": wf, "sample_rate": sr}
    clip = {"src": "a.flac", "start_sec": 0.0, "dur_sec": 0.25, "in_sec": 0.5, "class": "dialogue"}
    out = fm._trim_source_head(loaded, clip)
    assert out["waveform"].shape[-1] == sr - 50, "0.5s at 100Hz trims 50 samples off the head"
    # the surviving bytes are the source's TAIL (values near 2), never the head (near 1)
    assert float(out["waveform"][0, 0, 0]) > 1.45


def test_head_trim_past_the_source_yields_no_bytes_never_a_crash(monkeypatch):
    fm = _load_film_mix(monkeypatch)
    loaded = {"waveform": torch.zeros(1, 1, 10), "sample_rate": 100}
    clip = {"src": "a.flac", "start_sec": 0.0, "dur_sec": 1.0, "in_sec": 5.0, "class": "dialogue"}
    out = fm._trim_source_head(loaded, clip)
    assert out["waveform"].shape[-1] == 0, "an in-point past the source end yields an empty span; the delay pads the seat"


def test_zero_in_sec_is_byte_identical_head(monkeypatch):
    fm = _load_film_mix(monkeypatch)
    loaded = {"waveform": torch.zeros(1, 1, 32), "sample_rate": 100}
    clip = {"src": "a.flac", "start_sec": 0.0, "dur_sec": 0.2, "class": "dialogue"}
    out = fm._trim_source_head(loaded, clip)
    assert out["waveform"].shape[-1] == 32, "no in_sec key = the head, untouched"
