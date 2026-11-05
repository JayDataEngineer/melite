"""THE CONDITIONING TENSOR SEAT (the soundtrack merged-form wire,
session 2 — plan 2026-11-01-soundtrack-merged-wire §2/V2): a stamped
window that HEARS a wired producer's audio slices THAT producer's
stream through MeliteAudioTensorSlice — the file slice node's `audio`
input is a Combo FILE seat validated against the live input-dir
listing, so a producer LINK can never land there (the F17 class: the
submit dies at type validation; a placeholder string dies at combo
membership). The tensor node takes the AUDIO dict on a typed socket
(`audio_tensor`) and keeps the file node's exact slice law
(sample-grain start at the SOURCE's own rate, existing samples
bit-for-bit, silence-pad to the requested duration) minus
folder_paths.

Walls here drive the REAL nodes.py class — the same synthetic-package
loader test_film_mix_clip_source.py uses (engine-half siblings
stubbed; torch rides the engine env).
"""

from __future__ import annotations

import importlib
import os
import re
import sys
import types
from pathlib import Path

import pytest

torch = pytest.importorskip("torch", reason="nodes.py imports torch at module top")

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"


def _stub_module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    mod.__getattr__ = lambda attr: None  # type: ignore[method-assign]
    return mod


def _load_nodes_pkg(monkeypatch):
    """The REAL nodes.py as a synthetic package; the engine faces it
    imports ride stubs (this law drives pure tensor math)."""
    pkg_name = "melite_audio_tensor_slice_test"
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


def _audio(samples: int, sr: int = 48000, fill: float = 0.5) -> dict:
    wf = torch.full((1, 1, samples), fill)
    return {"waveform": wf, "sample_rate": sr}


def test_input_types_declare_the_typed_socket_not_a_combo_listing(monkeypatch):
    nodes = _load_nodes_pkg(monkeypatch)
    types_ = nodes.MeliteAudioTensorSlice.INPUT_TYPES()
    # THE F17 CLASS STAYS DEAD: `audio_tensor` is a typed AUDIO socket a
    # producer LINK can land in — never a Combo listing validated
    # against the input dir, never an optional seat on the file node.
    assert types_["required"]["audio_tensor"][0] == "AUDIO"
    assert "optional" not in types_ or "audio_tensor" not in types_.get("optional", {})
    assert "audio" not in types_["required"]
    # the mappings carry the class (the engine serves it at /object_info)
    assert nodes.NODE_CLASS_MAPPINGS["MeliteAudioTensorSlice"] is nodes.MeliteAudioTensorSlice
    assert nodes.NODE_DISPLAY_NAME_MAPPINGS["MeliteAudioTensorSlice"] == "Melite Audio Tensor Slice"


def test_slice_lands_on_the_source_rate_sample_grain(monkeypatch):
    nodes = _load_nodes_pkg(monkeypatch)
    node = nodes.MeliteAudioTensorSlice()
    src = _audio(48000)  # 1.0s at 48kHz, all 0.5
    out = node.slice_tensor_audio(src, start_seconds=0.5, duration_seconds=0.25)[0]
    assert out["sample_rate"] == 48000  # never a resample
    assert int(out["waveform"].shape[-1]) == 12000  # 0.25s at the SOURCE's own rate
    assert torch.equal(out["waveform"], torch.full((1, 1, 12000), 0.5))


def test_short_source_silence_pads_existing_samples_bit_for_bit(monkeypatch):
    nodes = _load_nodes_pkg(monkeypatch)
    node = nodes.MeliteAudioTensorSlice()
    src = _audio(24000)  # 0.5s of source
    out = node.slice_tensor_audio(src, start_seconds=0.0, duration_seconds=1.0)[0]
    wf = out["waveform"]
    assert int(wf.shape[-1]) == 48000  # the requested legal duration
    assert torch.equal(wf[..., :24000], torch.full((1, 1, 24000), 0.5))  # bit-for-bit head
    assert torch.equal(wf[..., 24000:], torch.zeros(1, 1, 24000))  # the silence tail


def test_start_beyond_the_end_yields_silence_never_an_index_error(monkeypatch):
    nodes = _load_nodes_pkg(monkeypatch)
    node = nodes.MeliteAudioTensorSlice()
    out = node.slice_tensor_audio(_audio(24000), start_seconds=5.0, duration_seconds=0.1)[0]
    assert torch.equal(out["waveform"], torch.zeros(1, 1, 4800))


def test_nonpositive_duration_refuses_loud(monkeypatch):
    nodes = _load_nodes_pkg(monkeypatch)
    node = nodes.MeliteAudioTensorSlice()
    with pytest.raises(ValueError, match=re.escape("MeliteAudioTensorSlice: duration_seconds must be positive")):
        node.slice_tensor_audio(_audio(4800), start_seconds=0.0, duration_seconds=0.0)
