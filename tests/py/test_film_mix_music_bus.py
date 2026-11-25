"""THE MUSIC BUS IS A UNION, NOT THE FIRST CLIP (defect A1, cured
2026-11-25): ``MeliteFilmAudioMix`` stacked its music sub-bus with
``length_mode="base"``, and ``MeliteAudioMix`` truncates to the FIRST
argument's length — so a second music clip placed past the first one's
end was cut to zero samples before it was ever summed.

Receipt (the operator's films): ``run-ca2c3198e17c`` (film C v4) and
``run-6462805e37b0`` (C v5). The node's own recorded inputs hold BOTH
music rows — L33 at 0.75 s for 5.792 s, L35 at 8.042 s — and only L33
reached the delivered audio. The dialogue rail was immune because it
mixes onto the film track, whose base is the whole film.

Walls here drive the REAL nodes (``MeliteAudioDelay`` placement,
``MeliteAudioMix`` join) through the pack's own ``_stack_bus``, loaded
with the synthetic-package loader ``test_melite_audio_tensor_slice.py``
uses (torch rides the engine env, so CI's pytest seat skips).
"""

from __future__ import annotations

import ast
import importlib
import os
import sys
import types
from pathlib import Path

import pytest

torch = pytest.importorskip("torch", reason="nodes.py imports torch at module top")

PACKAGE_ROOT = Path(__file__).resolve().parents[2] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"
SR = 48000

# The receipt's own numbers: L33 placed at 0.75 s for 5.792 s (extent
# 6.542 s), L35 placed at 8.042 s — 1.5 s past the first clip's end.
L33_START, L33_DUR = 0.75, 5.792
L35_START, L35_DUR = 8.042, 1.0


def _stub_module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    mod.__getattr__ = lambda attr: None  # type: ignore[method-assign]
    return mod


def _load_pack(monkeypatch):
    """The REAL node package (``nodes`` + ``film_mix``) as a synthetic
    package; the engine faces it imports ride stubs."""
    pkg_name = "melite_film_mix_bus_test"
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
    nodes = importlib.import_module(f"{pkg_name}.nodes")
    film_mix = importlib.import_module(f"{pkg_name}.film_mix")
    return nodes, film_mix


def _clip(seconds: float, fill: float) -> dict:
    """A decoded clip body: ``seconds`` of a DC level at the film rate."""
    return {"waveform": torch.full((1, 1, int(round(seconds * SR))), fill), "sample_rate": SR}


def _placed(delay, start: float, dur: float, fill: float) -> dict:
    """A placed clip exactly as ``mix_film`` seats it: the source
    delayed by ``start`` and fit to ``start + dur``."""
    return delay.delay_audio(
        _clip(dur, fill),
        delay_seconds=float(start),
        duration_seconds=round((float(start) + float(dur)) * 1000) / 1000,
    )[0]


def _span(waveform, start: float, dur: float):
    a = int(round(start * SR))
    b = min(int(waveform.shape[-1]), int(round((start + dur) * SR)))
    return waveform[..., a:b]


def test_a_second_music_clip_survives_the_bus_join(monkeypatch):
    """THE FIRING ARM — the operator's exact film: L33 then L35."""
    nodes, film_mix = _load_pack(monkeypatch)
    delay, mix = nodes.MeliteAudioDelay(), nodes.MeliteAudioMix()
    placed_l33 = _placed(delay, L33_START, L33_DUR, 0.4)
    placed_l35 = _placed(delay, L35_START, L35_DUR, 0.4)
    bus = placed_l33
    bus = film_mix._stack_bus(mix, bus, placed_l35)
    # The bus reaches L35's span at all (the defect: it stopped at 6.542 s)…
    assert int(bus["waveform"].shape[-1]) >= int(round((L35_START + L35_DUR) * SR))
    # …and L35 is AUDIBLE there (the clip body, not silence).
    l35 = _span(bus["waveform"], L35_START, L35_DUR)
    assert float(l35.abs().max()) > 0.0, "the second music clip is silent — the bus truncated to its first argument"
    # The first clip is untouched by the cure (a bus is a union, never a swap).
    l33 = _span(bus["waveform"], L33_START, L33_DUR)
    assert float(l33.abs().max()) == pytest.approx(0.4, abs=1e-6)
    # Between the clips the bus is silence-padded, never a smear.
    gap = _span(bus["waveform"], L33_START + L33_DUR, L35_START - (L33_START + L33_DUR))
    assert float(gap.abs().max()) == 0.0


def test_the_bus_keeps_the_later_clip_whichever_order_it_lands(monkeypatch):
    """Order independence: a bus stack is commutative in extent, so a
    clip placed EARLIER than the clip already on the bus must not lose
    its tail either (the swap-a-argument 'cure' dies here)."""
    nodes, film_mix = _load_pack(monkeypatch)
    delay, mix = nodes.MeliteAudioDelay(), nodes.MeliteAudioMix()
    late = _placed(delay, L35_START, L35_DUR, 0.4)
    early = _placed(delay, L33_START, L33_DUR, 0.4)
    bus = film_mix._stack_bus(mix, film_mix._stack_bus(mix, None, late), early)
    assert float(_span(bus["waveform"], L33_START, L33_DUR).abs().max()) == pytest.approx(0.4, abs=1e-6)
    assert float(_span(bus["waveform"], L35_START, L35_DUR).abs().max()) > 0.0


def test_the_join_law_is_named_once_and_the_film_keeps_the_base(monkeypatch):
    """THE WIRING — derived from the node's own AST: the music loop
    stacks through ``_stack_bus`` (never a bare ``mix_audio`` with
    'base'), every ``mix.mix_audio`` left in ``mix_film`` is the film's
    own base join, and ``_stack_bus`` itself is the one home of
    'longest'."""
    _nodes, film_mix = _load_pack(monkeypatch)
    src = (PACKAGE_ROOT / "film_mix.py").read_text(encoding="utf-8")
    tree = ast.parse(src)
    by_name = {n.name: n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    stack = by_name["_stack_bus"]
    mix_film = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "MeliteFilmAudioMix")
    fn = next(n for n in mix_film.body if isinstance(n, ast.FunctionDef) and n.name == "mix_film")

    def calls(node):
        return [c for c in ast.walk(node) if isinstance(c, ast.Call)]

    def kw(call, name):
        for k in call.keywords:
            if k.arg == name:
                return k.value
        return None

    # (a) _stack_bus is the union, named once.
    joined = [c for c in calls(stack) if isinstance(c.func, ast.Attribute) and c.func.attr == "mix_audio"]
    assert len(joined) == 1, "the bus join must be one call"
    mode = kw(joined[0], "length_mode")
    assert isinstance(mode, ast.Constant) and mode.value == "longest"

    # (b) mix_film's music loop routes through it…
    fn_calls = calls(fn)
    assert any(isinstance(c.func, ast.Name) and c.func.id == "_stack_bus" for c in fn_calls), (
        "mix_film must build the music bus through _stack_bus"
    )

    # (c) …and every bare mix.mix_audio left is the film's own base join
    #     (dialogue placements onto the film track + the final bus join).
    bare = [
        c for c in fn_calls
        if isinstance(c.func, ast.Attribute) and c.func.attr == "mix_audio"
        and isinstance(c.func.value, ast.Name) and c.func.value.id == "mix"
    ]
    assert bare, "the film placements still join through MeliteAudioMix"
    for c in bare:
        m = kw(c, "length_mode")
        assert isinstance(m, ast.Constant) and m.value == "base", (
            "every remaining mix.mix_audio in mix_film is the film's base join"
        )
