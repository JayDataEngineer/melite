"""THE NESTED-LANE COMBO LAW (transcript-015's broken qvoice law,
fixed 2026-09-26; one-law merge 2026-10-13): LoadAudiocoreModel's
`model_path` combo must offer every lane the DECLs actually address
— including the NESTED spellings `qwen3-tts/hf/<Lane>` and the
HF-cache `qwen3-tts/hf/models--…/snapshots/<sha>` — because ComfyUI
validates a combo BEFORE the node runs: a lane outside the enum
refuses at /prompt with a 400 and no GPU work ever starts.

The merged law carries both truths: top-level dirs ride regardless
of weights (legacy enum + container dirs — the family DEFAULT
model_path is the bare `qwen3-tts` container), while nested dirs
ride only when they DIRECTLY hold weights, and a weights-holding
dir is a LEAF (the structural stop): its parts never ride, the
HF bookkeeping never rides, and cycles die (a dir never re-enters
itself). Round 4 adds the confinement and alias truths: OPENING
stays inside the models root's real tree (a link outside rides as
an address, never a graft of the foreign filesystem), and a real
container opens ONCE — riding is by spelling, opening is by
realpath, so aliases never multiply the nested members.

Function-grain: the helpers are read out of the pack by NAME with
per-name boundaries (a slice between two defs breaks the moment
file order moves — the round-3 N1 regression), and exercised over
a synthetic tree, so the law runs with no ComfyUI, no torch, and
no real weights.
"""

import os
import re
from pathlib import Path

import pytest


PACK = (
    Path(__file__).resolve().parents[1]
    / "vendor"
    / "comfyui_extensions"
    / "melite-sfx-nodes"
    / "nodes.py"
)

CONSTANTS = (
    "_WEIGHT_FILE_NAMES",
    "_WEIGHT_FILE_SUFFIXES",
    "_MAX_WALK_DEPTH",
    "_SKIP_DIR_NAMES",
)


def _helpers(root: Path):
    """Read the walk law's constants and both helpers out of the pack
    source, each by its own name, and run them over `root` — the pack
    imports torch and the comfy node graph, which this wall never
    needs. Constants are read from the source (never restated here):
    a wall that pins its own copy would test the copy, not the pack.
    Each name must be declared EXACTLY once (the shadowed-def class:
    a second binding silently dead-shadows the first)."""
    source = PACK.read_text(encoding="utf-8")
    lines = []
    for name in CONSTANTS:
        # single-line bindings only (the pack declares each constant
        # on one line); a trailing-context match would swallow the
        # code that follows and pin the wrong law
        matches = re.findall(rf"^{name} = [^\n]*", source, re.M)
        assert len(matches) == 1, f"{name} must be declared exactly once, on one line"
        lines.append(matches[0])
    for fn in ("_dir_holds_weights", "_list_audiocore_models"):
        # EXACTLY ONE module-level def: a dead copy appended below the
        # live one would otherwise be invisible to re.search (first
        # match wins) and the wall would pin the first while the pack
        # grew a second (round 4 R9 — the vitest def-twice arm catches
        # the pack side; this closes the pytest side)
        defs = re.findall(rf"^def {fn}\(", source, re.M)
        assert len(defs) == 1, f"{fn} must be defined exactly once at module level"
        m = re.search(rf"^def {fn}\([^\n]*\n[\s\S]*?(?=^def |^class |\Z)", source, re.M)
        assert m, f"{fn} must be defined at module level in the pack"
        lines.append(m.group(0))
    namespace = {"os": os, "_AUDIOCPP_MODELS_DIR": str(root)}
    exec("\n".join(lines), namespace)
    return namespace["_dir_holds_weights"], namespace["_list_audiocore_models"]


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
    _holds, lanes_of = _helpers(tmp_path)
    # the exact spelling packages/models/qwen3-tts authors
    _lane(tmp_path / "qwen3-tts" / "hf" / "Qwen3-TTS-12Hz-0.6B-Base")
    lanes = lanes_of()
    assert "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base" in lanes


def test_the_hf_cache_snapshot_spelling_is_offered(tmp_path):
    _holds, lanes_of = _helpers(tmp_path)
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
    _holds, lanes_of = _helpers(tmp_path)
    _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    assert lanes_of() == ["Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"]


def test_the_weights_test_is_evidence_not_a_name_guess(tmp_path):
    holds, _lanes_of = _helpers(tmp_path)
    # weights under either accepted spelling is the whole evidence
    assert holds(str(_lane(tmp_path / "a", weights="model.gguf"))) is True
    assert holds(str(_lane(tmp_path / "b", weights="model_index.json"))) is True
    # no weights: a paper dir is never offered
    assert holds(str(_not_a_lane(tmp_path / "d"))) is False
    assert holds(str(tmp_path / "never-made")) is False


def test_the_blobs_and_refs_bookkeeping_never_rides(tmp_path):
    _holds, lanes_of = _helpers(tmp_path)
    cache = tmp_path / "qwen3-tts" / "hf" / "models--Qwen--X" / "snapshots" / "sha"
    _lane(cache)
    for name in ("blobs", "refs"):
        hold = tmp_path / "qwen3-tts" / "hf" / "models--Qwen--X" / name
        hold.mkdir(parents=True)
        (hold / "weights.safetensors").write_text("x", encoding="utf-8")
    lanes = lanes_of()
    assert len([x for x in lanes if "/" not in x]) == 1
    assert "blobs" not in lanes and "refs" not in lanes
    assert not any(("/blobs" in x or "/refs" in x) for x in lanes)


def test_a_lanes_own_parts_are_not_lanes(tmp_path):
    # model_specs is content-identical to a lane (config +
    # safetensors) — only the structural stop keeps it out
    _holds, lanes_of = _helpers(tmp_path)
    lane = _lane(tmp_path / "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged")
    _lane(lane / "model_specs")
    _lane(lane / "speech_tokenizer")
    lanes = lanes_of()
    assert lanes == ["Qwen3-TTS-12Hz-1.7B-CustomVoice-merged"]


def test_the_walk_is_depth_bounded(tmp_path):
    # an accepted lane is a LEAF: nothing under it can ride, however
    # deep it sits — the structural stop is what the bound enforces
    _holds, lanes_of = _helpers(tmp_path)
    _lane(
        tmp_path
        / "qwen3-tts"
        / "hf"
        / "models--Qwen--X"
        / "snapshots"
        / "sha"
        / "extra"
    )
    lanes = lanes_of()
    assert not any(x.endswith("/extra") for x in lanes)


def test_the_walk_never_follows_a_symlink_loop(tmp_path):
    _holds, lanes_of = _helpers(tmp_path)
    lane = _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    try:
        os.symlink(tmp_path, lane / "loop")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this filesystem")
    # a self-referential link is pruned with the lane's children, and
    # the walk still terminates with the lane itself offered once
    assert lanes_of() == ["Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"]


def test_a_linked_lane_rides(tmp_path):
    # the engine tree legitimately links lanes into the store; the
    # enum follows a one-level link (WHERE weights live is the
    # provisioning law's question, not the enum's)
    _holds, lanes_of = _helpers(tmp_path)
    real = tmp_path / "store" / "Qwen3-Linked"
    real.mkdir(parents=True)
    (real / "model.safetensors").write_text("x", encoding="utf-8")
    try:
        os.symlink(real, tmp_path / "Qwen3-Linked")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this filesystem")
    assert "Qwen3-Linked" in lanes_of()


def test_an_absent_models_dir_combo_is_empty_not_a_crash(tmp_path):
    _holds, lanes_of = _helpers(tmp_path / "not-created")
    assert lanes_of() == []


def test_a_bare_container_rides_and_its_lanes_ride(tmp_path):
    # the real tree's shape: `qwen3-tts` holds only `hf/` — no
    # weights of its own — and BOTH truths hold: the container rides
    # (the family DEFAULT model_path IS this bare container) and the
    # lanes under it ride; `hf/` itself (nested, no weights) does not
    _holds, lanes_of = _helpers(tmp_path)
    (tmp_path / "qwen3-tts" / "hf").mkdir(parents=True)
    _lane(tmp_path / "qwen3-tts" / "hf" / "Qwen3-TTS-12Hz-0.6B-Base")
    _lane(tmp_path / "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")
    lanes = lanes_of()
    assert sorted(lanes) == [
        "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
        "qwen3-tts",
        "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
    ]


def test_a_link_out_of_the_root_rides_but_never_grafts(tmp_path, tmp_path_factory):
    # THE ROOT CONFINEMENT (round 4 R1): a symlink may NAME weights
    # anywhere, but opening stays inside the root's real tree — a
    # link to a FOREIGN tree rides as one address and never walks
    # it (the old law offered the whole foreign tree as members)
    _holds, lanes_of = _helpers(tmp_path)
    _lane(tmp_path / "real-lane")
    # the foreign tree lives OUTSIDE the models root entirely
    foreign = tmp_path_factory.mktemp("foreign-tree")
    (foreign / "deep" / "weights").mkdir(parents=True)
    (foreign / "deep" / "weights" / "model.safetensors").write_text("x", encoding="utf-8")
    (foreign / "top").mkdir()
    try:
        os.symlink(foreign, tmp_path / "linked-outside")
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this filesystem")
    lanes = lanes_of()
    # the link rides ONCE, as an address; nothing under it rides
    assert lanes == ["linked-outside", "real-lane"], lanes


def test_one_real_dir_opens_once_its_aliases_never_rewalk_it(tmp_path):
    # THE ALIAS LAW (round 4 R2): riding is by spelling (each alias
    # is a valid combo address), but OPENING is by realpath — the
    # first spelling walks the lanes, and no alias re-walks the same
    # weights (the old stack-scoped guard walked the store once per
    # alias and multiplied the nested members)
    _holds, lanes_of = _helpers(tmp_path)
    store = tmp_path / "store"
    store.mkdir()
    _lane(store / "lane-a")
    _lane(store / "lane-b")
    try:
        for alias in ("aliasA", "aliasB"):
            os.symlink(store, tmp_path / alias)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this filesystem")
    lanes = lanes_of()
    # the store's lanes ride under EXACTLY ONE spelling — never two
    assert sum(1 for x in lanes if x.endswith("/lane-a")) == 1, lanes
    assert sum(1 for x in lanes if x.endswith("/lane-b")) == 1, lanes
    # and every top-level spelling still rides as an address
    for addr in ("store", "aliasA", "aliasB"):
        assert addr in lanes, lanes
