"""THE NESTED-LANE COMBO LAW (transcript-015's broken qvoice law,
fixed 2026-09-26): LoadAudiocoreModel's `model_path` combo must
offer every lane the DECLs actually address — including the NESTED
spellings `qwen3-tts/hf/<Lane>` and the HF-cache
`qwen3-tts/hf/models--…/snapshots/<sha>` — because ComfyUI validates
a combo BEFORE the node runs: a lane outside the enum refuses at
/prompt with a 400 and no GPU work ever starts. The walk is
depth-bounded, evidence-tested (config.json + weights), and stops at
each lane it accepts (a lane's children are its own parts — the
speech_tokenizer half is content-identical to a lane).

Function-grain: the two pure helpers are read out of the pack and
exercised over a synthetic tree, so the law runs with no ComfyUI,
no torch, and no real weights.
"""

import os
import sys
from pathlib import Path

import pytest


PACK = (
    Path(__file__).resolve().parents[1]
    / "vendor"
    / "comfyui_extensions"
    / "melite-sfx-nodes"
    / "nodes.py"
)


def _helpers(root: Path):
    """Read `_is_lane_dir` + `_list_audiocore_models` out of the pack
    source and run them over `root` — the pack imports torch and the
    comfy node graph, which this wall never needs. The depth constant
    is read from the source (never restated here): a wall that pins
    its own copy would test the copy, not the pack."""
    source = PACK.read_text(encoding="utf-8")
    start = source.index("def _is_lane_dir")
    end = source.index("def _resolve_model_path")
    depth_line = [
        line
        for line in source.splitlines()
        if line.startswith("_LANE_WALK_DEPTH =")
    ]
    assert len(depth_line) == 1, "the depth constant must be declared once"
    namespace = {"os": os, "_AUDIOCPP_MODELS_DIR": str(root)}
    exec(depth_line[0] + "\n" + source[start:end], namespace)
    return namespace["_is_lane_dir"], namespace["_list_audiocore_models"]


def _lane(path: Path, weights: str = "model.safetensors") -> Path:
    path.mkdir(parents=True, exist_ok=True)
    (path / "config.json").write_text("{}", encoding="utf-8")
    (path / weights).write_text("x", encoding="utf-8")
    return path


def _not_a_lane(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    (path / "notes.txt").write_text("x", encoding="utf-8")
    return path


def test_the_decl_nested_lane_spelling_is_offered(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    # the exact spelling packages/models/qwen3-tts authors
    _lane(tmp_path / "qwen3-tts" / "hf" / "Qwen3-TTS-12Hz-0.6B-Base")
    lanes = lanes_of()
    assert "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base" in lanes


def test_the_hf_cache_snapshot_spelling_is_offered(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    _lane(
        tmp_path
        / "qwen3-tts"
        / "hf"
        / "models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice"
        / "snapshots"
        / "0c0e3051f131929182e2c023b9537f8b1c68adfe"
    )
    lanes = lanes_of()
    assert (
        "qwen3-tts/hf/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice"
        "/snapshots/0c0e3051f131929182e2c023b9537f8b1c68adfe" in lanes
    )


def test_the_top_level_lane_still_rides(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    assert lanes_of() == ["Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"]


def test_the_lane_test_is_evidence_not_a_name_guess(tmp_path):
    _is_lane, _lanes_of = _helpers(tmp_path)
    assert _is_lane(str(_lane(tmp_path / "a", weights="model.gguf"))) is True
    assert _is_lane(str(_lane(tmp_path / "b", weights="pytorch_model.bin"))) is True
    # weights but no config: an HF-cache blob/ref dir is never a lane
    blob = tmp_path / "c"
    blob.mkdir()
    (blob / "model.safetensors").write_text("x", encoding="utf-8")
    assert _is_lane(str(blob)) is False
    # config but no weights: a paper dir is never a lane
    assert _is_lane(str(_not_a_lane(tmp_path / "d"))) is False
    assert _is_lane(str(tmp_path / "never-made")) is False


def test_the_blobs_and_refs_bookkeeping_never_rides(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    cache = tmp_path / "qwen3-tts" / "hf" / "models--Qwen--X" / "snapshots" / "sha"
    _lane(cache)
    for name in ("blobs", "refs"):
        hold = tmp_path / "qwen3-tts" / "hf" / "models--Qwen--X" / name
        hold.mkdir(parents=True)
        (hold / "weights.safetensors").write_text("x", encoding="utf-8")
    lanes = lanes_of()
    assert len(lanes) == 1
    assert "blobs" not in lanes[0] and "refs" not in lanes[0]


def test_a_lanes_own_parts_are_not_lanes(tmp_path):
    # speech_tokenizer is content-identical to a lane (config +
    # safetensors) — only the structural stop keeps it out
    _is_lane, lanes_of = _helpers(tmp_path)
    lane = _lane(tmp_path / "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged")
    _lane(lane / "speech_tokenizer")
    _lane(lane / "model_specs")
    lanes = lanes_of()
    assert lanes == ["Qwen3-TTS-12Hz-1.7B-CustomVoice-merged"]


def test_the_walk_is_depth_bounded(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    # depth 5 — beyond the HF-cache spelling the walk must not reach
    _lane(
        tmp_path
        / "qwen3-tts"
        / "hf"
        / "models--Qwen--X"
        / "snapshots"
        / "sha"
        / "extra"
    )
    assert lanes_of() == []


def test_the_walk_never_follows_a_symlink_loop(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path)
    lane = _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    try:
        os.symlink(tmp_path, lane / "loop")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this filesystem")
    # a self-referential link is pruned with the lane's children, and
    # the walk still terminates with the lane itself offered once
    assert lanes_of() == ["Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"]


def test_an_absent_models_dir_combo_is_empty_not_a_crash(tmp_path):
    _is_lane, lanes_of = _helpers(tmp_path / "not-created")
    assert lanes_of() == []


def test_a_bare_container_is_not_a_lane_but_its_lanes_are(tmp_path):
    # the real tree's shape: `qwen3-tts` holds only `hf/` — no
    # weights of its own, so it is a container, while the lanes
    # under it ride
    _is_lane, lanes_of = _helpers(tmp_path)
    (tmp_path / "qwen3-tts" / "hf").mkdir(parents=True)
    _lane(tmp_path / "qwen3-tts" / "hf" / "Qwen3-TTS-12Hz-0.6B-Base")
    _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    lanes = lanes_of()
    assert sorted(lanes) == [
        "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
        "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
    ]
