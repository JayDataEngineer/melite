"""THE F65 WALL, v0.2.2 SUCCESSOR (2026-11-15): the list-unwrap law
must survive upstream rewrites. The original F65 burned because a
scalar parse ate ComfyUI's INPUT_IS_LIST wrap ("must be a CSV string,
got list", run-417db2db3776-9f9f8719); the cure sat at the parse call
site, unwrapping through _value_at first. Upstream v0.2.2
(fc58fb8, the transfer-lattice rework) DELETED the
carry_prefix_frames CSV input and its _parse_carry_prefix_frames
helper entirely — the carry now lives in
_carry_previous_refined_prefix, and every input of the
INPUT_IS_LIST node still unwraps through _value_at at its use site
(lines 186-207 of the vendored file). This wall judges the LAW at
the living pin: the unwrap mechanism exists, the sequence node's
input uses all ride it, and the deleted CSV parser stays deleted (if
it ever returns, its call site must carry the unwrap — F65's crash
class returns with it). Melite's own graphs never pass the removed
input (packages/models/h3 refine-loop.spec.ts asserts its absence).
"""
from __future__ import annotations

import ast
from pathlib import Path

SEQUENCE_FILE = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "Comfyui_Minimax_h3_latent_Upscaler-Plus" / "nodes" / "minimax_h3_refine_sequence.py"


def _source() -> str:
    return SEQUENCE_FILE.read_text()


def test_the_unwrap_mechanism_exists():
    """_value_at (ComfyUI's repeat-last list mapping) is the door every
    wrapped input unwraps through — the mechanism whose absence made
    F65 a crash instead of a default."""
    src = _source()
    assert "def _value_at(" in src, (
        "the _value_at unwrap vanished from the vendored sequence node — "
        "every INPUT_IS_LIST input reverts to eating raw lists"
    )


def test_every_sequence_input_use_unwraps_first():
    """THE FIRE LAW, v0.2.2 shape: inside the sequence node's run body,
    every input read rides _value_at — a bare input name fed straight
    to scalar use re-lands the F65 class on whichever input upstream
    adds next."""
    src = _source()
    uses = [line.strip() for line in src.splitlines()
            if "_value_at(" in line]
    assert len(uses) >= 10, (
        "the vendored sequence node's _value_at use count collapsed — "
        "the unwrap law did not survive the rework"
    )
    # The carry door's own toggle reads the wrapped lock_audio input
    # through the same unwrap before it drives carry_audio.
    assert "current_lock_audio = bool(_value_at(lock_audio, index))" in src


def test_the_carry_owns_the_prefix_through_the_list_aware_helper():
    """The successor carry: _carry_previous_refined_prefix receives the
    already-unwrapped per-index values (never raw wrapped lists) and
    its call site derives carry_audio from the unwrapped toggle."""
    src = _source()
    assert "def _carry_previous_refined_prefix(" in src, (
        "the carry helper vanished — the refine carry door moved again"
    )
    idx = src.find("video_steps, audio_steps = _carry_previous_refined_prefix(")
    assert idx != -1, "the carry call site vanished — the cure's seat moved"
    window = src[idx:idx + 300]
    assert "carry_audio=not current_lock_audio" in window, (
        "the carry call lost its unwrapped toggle derivation"
    )


def test_the_deleted_csv_parser_stays_deleted_with_its_input():
    """F65's crash surface: the CSV parser and its input are gone
    upstream. If either returns, the call site must unwrap through
    _value_at — this arm fires the moment the name reappears without
    its cure."""
    src = _source()
    if "_parse_carry_prefix_frames(" in src:
        idx = src.find("carry_frames = _parse_carry_prefix_frames(")
        assert idx != -1, (
            "the CSV parser returned without its call site — the wall "
            "must be re-aimed at the new parse door"
        )
        window = src[idx:idx + 200]
        assert "_value_at(carry_prefix_frames, 0)" in window, (
            "the parse call feeds a raw list-wrap straight to the parser — "
            "F65's validation crash returns on the next refine-2x press"
        )
