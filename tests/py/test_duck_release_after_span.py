"""THE DUCK'S RELEASE STARTS AT THE SPAN END (defect A2, cured
2026-11-25): ``MeliteAudioDuck.duck_audio`` drew its release arc
STARTING ``release_ms`` before the span end and reaching unity AT it —
so the last 350 ms of every conditioned row came back un-ducked, and a
row ending on its last word let the model's own rendition of that word
rise under the pasted take.

Receipt: five films of EP01 Draft 2 Scene 2, decomposed on
``run-e4db486db9ec-13ec3121`` (l27) — film ≈ a·take + b·window with b
climbing 0.00 → 0.96 across the row's last 10 frames while the word
still sounded; a row 1–4 frames past its take's last word ghosted, ≥ 7
frames was clean. THE TAIL LAW (rows carry ≥ 8 frames past the last
word) was the workaround; it is now a safety margin, not a requirement.

Walls here drive the REAL node through the synthetic-package loader
(``test_melite_audio_tensor_slice.py``'s shape; torch rides the engine
env, so CI's pytest seat skips).
"""

from __future__ import annotations

import importlib
import os
import sys
import types
from pathlib import Path

import pytest

torch = pytest.importorskip("torch", reason="nodes.py imports torch at module top")

PACKAGE_ROOT = Path(__file__).resolve().parents[2] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"
SR = 48000
DEPTH_DB = -14.0
GAIN = 10.0 ** (DEPTH_DB / 20.0)
RAMP_MS = 20.0
RELEASE_MS = 350.0
RELEASE = int(round(RELEASE_MS / 1000.0 * SR))


def _stub_module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    mod.__getattr__ = lambda attr: None  # type: ignore[method-assign]
    return mod


def _load_nodes(monkeypatch):
    pkg_name = "melite_duck_release_test"
    for mod_name in list(sys.modules):
        if mod_name == pkg_name or mod_name.startswith(pkg_name + "."):
            monkeypatch.delitem(sys.modules, mod_name)
    folder_paths = types.ModuleType("folder_paths")
    folder_paths.get_annotated_filepath = lambda name: os.path.join("/nonexistent-input", name)
    folder_paths.get_output_directory = lambda: "/tmp"
    folder_paths.get_input_directory = lambda: "/tmp"
    folder_paths.get_filename_list = lambda key: []
    folder_paths.folder_names_and_paths = {}
    folder_paths.get_folder_paths = lambda key: ["/tmp"]
    monkeypatch.setitem(sys.modules, "folder_paths", folder_paths)
    pkg = types.ModuleType(pkg_name)
    pkg.__path__ = [str(PACKAGE_ROOT)]  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, pkg_name, pkg)
    for sub in ("core", "native", "schemas", "qvoice_copy", "qvoice", "loudness", "env_assert"):
        monkeypatch.setitem(sys.modules, f"{pkg_name}.{sub}", _stub_module(f"{pkg_name}.{sub}"))
    return importlib.import_module(f"{pkg_name}.nodes")


def _duck(nodes, seconds: float, span: str):
    wf = torch.full((1, 1, int(round(seconds * SR))), 0.5)
    return nodes.MeliteAudioDuck().duck_audio(
        {"waveform": wf, "sample_rate": SR},
        segments=span,
        gain_db=DEPTH_DB,
        ramp_ms=RAMP_MS,
        release_ms=RELEASE_MS,
    )[0]["waveform"].reshape(-1)


def test_the_floor_holds_to_the_span_end(monkeypatch):
    """THE FIRING ARM — the operator's ghost: a row ending on its last
    word. Inside the span, right up to its final sample, the bed stays
    at the requested depth (before the cure the last 350 ms rose back
    toward unity)."""
    nodes = _load_nodes(monkeypatch)
    out = _duck(nodes, 3.0, "1.0:2.0")
    ib = int(round(2.0 * SR))
    inside = out[ib - RELEASE:ib]
    assert float(inside.max()) == pytest.approx(0.5 * GAIN, abs=1e-6), (
        "the last release_ms of the span came back un-ducked — the release began inside the row"
    )
    # …and the sample immediately before the span end is the floor too.
    assert float(out[ib - 1]) == pytest.approx(0.5 * GAIN, abs=1e-6)


def test_the_release_still_breathes_after_the_span(monkeypatch):
    """The console law is not repealed: the return is still a slow ramp,
    it now begins AT the span end and reaches unity RELEASE after it."""
    nodes = _load_nodes(monkeypatch)
    out = _duck(nodes, 3.0, "1.0:2.0")
    ib = int(round(2.0 * SR))
    arc = out[ib:ib + RELEASE]
    assert float(arc[0]) == pytest.approx(0.5 * GAIN, abs=1e-6)
    assert float(arc[-1]) == pytest.approx(0.5, abs=1e-5)
    assert bool(torch.all(arc[1:] >= arc[:-1])), "the release must rise monotonically"
    # the arc is 350 ms long, not stretched
    assert float(out[ib + RELEASE + 10]) == pytest.approx(0.5, abs=1e-6)


def test_a_span_at_the_file_end_has_no_tail_room_and_never_raises(monkeypatch):
    nodes = _load_nodes(monkeypatch)
    out = _duck(nodes, 2.0, "1.0:2.0")
    assert float(out[-1]) == pytest.approx(0.5 * GAIN, abs=1e-6)


def test_overlapping_spans_keep_the_union_floor(monkeypatch):
    """The 2026-09-22 cure's law survives: a span's release must never
    lift a floor another span still holds, and the second span's own
    release begins at ITS end (a chained duck does not peel early)."""
    nodes = _load_nodes(monkeypatch)
    out = _duck(nodes, 4.0, "1.0:2.0;2.1:3.0")
    ramp = int(round(RAMP_MS / 1000.0 * SR))
    # span 2's attack lands at 2.1 + ramp; from there to its end the bed
    # is held at the floor — span 1's release arc cannot raise it.
    held = out[int(round(2.1 * SR)) + ramp:int(round(3.0 * SR))]
    assert float(held.max()) == pytest.approx(0.5 * GAIN, abs=1e-6)
    assert float(held.min()) == pytest.approx(0.5 * GAIN, abs=1e-6)
    # …and span 2 lets go at ITS end, exactly as span 1 did.
    ib2 = int(round(3.0 * SR))
    assert float(out[ib2 - 1]) == pytest.approx(0.5 * GAIN, abs=1e-6)
    assert float(out[ib2 + RELEASE]) == pytest.approx(0.5, abs=1e-5)
