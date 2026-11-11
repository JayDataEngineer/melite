"""THE ASSET-URL CLIP-SRC ARM (roadmap OWED 2026-09-26 — transcript-0034
finding #6): the h3 tool description advertises
``/v1/assets/runs/<run>/<rel>`` as the FIRST clip-src form, but
``_resolve_clip_source`` only knew staged names and absolute paths — an
author following the description would have killed the film at the mix
node ("resolves to no file"). The resolver now walks the estate's state
trees for both URL spellings (Layer A's submit-time walk already stages
them; this is the defense for a src that reached the graph raw).

Walls here drive the resolver DIRECTLY with a stubbed folder_paths —
the same loading shape test_moss_sfx_load_progress.py uses.
"""

from __future__ import annotations

import importlib.util
import os
import re
import sys
import types
from pathlib import Path

import pytest

# The CI pytest seat installs pytest alone — torch rides the engine
# env (the view-sheet wall's own law). The resolver under test is
# pure paths, but it ships inside film_mix.py which imports torch at
# module top. Skip, never false-fail.
torch = pytest.importorskip("torch", reason="film_mix.py imports torch at module top")

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"


def _load_film_mix(monkeypatch, staged: dict):
    """Load film_mix.py with a stubbed folder_paths whose
    get_annotated_filepath resolves exactly the staged names."""
    stub = types.ModuleType("_folder_paths_stub")
    stub.get_annotated_filepath = lambda name: staged.get(name, os.path.join("/nonexistent-input", name))
    monkeypatch.setitem(sys.modules, "folder_paths", stub)
    spec = importlib.util.spec_from_file_location("_film_mix_clip_test", PACKAGE_ROOT / "film_mix.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["_film_mix_clip_test"] = module
    spec.loader.exec_module(module)
    return module


def _mint_output_tree(root: Path) -> tuple:
    """A fake state root: <root>/output/<run>/tts/line.flac on disk."""
    flac = root / "output" / "run-aaa" / "tts" / "line.flac"
    flac.parent.mkdir(parents=True)
    flac.write_bytes(b"fLaC-stub")
    return flac, root / "output"


def test_staged_name_and_absolute_arms_unchanged(monkeypatch, tmp_path):
    staged_file = tmp_path / "staged.flac"
    staged_file.write_bytes(b"fLaC")
    fm = _load_film_mix(monkeypatch, {"uploaded_clip_0001.flac": str(staged_file)})
    # the STAGED arm resolves through get_annotated_filepath
    assert fm._resolve_clip_source("uploaded_clip_0001.flac") == str(staged_file)
    # the ABSOLUTE arm resolves an existing file verbatim
    local = tmp_path / "abs.flac"
    local.write_bytes(b"fLaC")
    assert fm._resolve_clip_source(str(local)) == str(local)


def test_asset_url_form_resolves_under_the_state_root(monkeypatch, tmp_path):
    flac, _ = _mint_output_tree(tmp_path)
    fm = _load_film_mix(monkeypatch, {})
    url = "/v1/assets/runs/run-aaa/tts/line.flac"
    # THE INPUT CHANNEL (the env arms retired, vendor re-cure
    # 2026-11-01): the estate's roots ride the state_roots input.
    assert fm._resolve_clip_source(url, f'["{tmp_path}"]') == str(flac)
    # the browser spelling is the same file
    assert fm._resolve_clip_source(
        "/melite-media/runs/run-aaa/tts/line.flac", f'["{tmp_path}"]') == str(flac)


def test_cross_root_extras_walk_after_the_own_root(monkeypatch, tmp_path):
    own = tmp_path / "own"
    other = tmp_path / "other"
    own.mkdir()
    flac, _ = _mint_output_tree(other)
    fm = _load_film_mix(monkeypatch, {})
    # own is searched first (its tree holds no run-aaa); the miss
    # walks the extras and the file lands under other.
    assert fm._resolve_clip_source(
        "/v1/assets/runs/run-aaa/tts/line.flac", f'["{own}", "{other}"]') == str(flac)


def test_standard_install_derivation_without_env(monkeypatch, tmp_path):
    """No env at all: an engine cwd ending in ``comfyui`` derives
    ``<state>/runs/output`` — the estate's default layout."""
    state = tmp_path / "data"
    engine_cwd = state / "runtime" / "comfyui"
    engine_cwd.mkdir(parents=True)
    flac = state / "runs" / "output" / "run-bbb" / "sfx" / "boom.flac"
    flac.parent.mkdir(parents=True)
    flac.write_bytes(b"fLaC")
    monkeypatch.delenv("MELITE_STATE_ROOT", raising=False)
    monkeypatch.delenv("MELITE_STATE_ROOTS", raising=False)
    monkeypatch.chdir(engine_cwd)
    fm = _load_film_mix(monkeypatch, {})
    assert fm._resolve_clip_source("/v1/assets/runs/run-bbb/sfx/boom.flac") == str(flac)


def test_a_miss_refuses_loud_naming_the_searched_trees(monkeypatch, tmp_path):
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError) as exc:
        fm._resolve_clip_source("/v1/assets/runs/run-gone/tts/line.flac", f'["{tmp_path}"]')
    # THE NAME-THE-ROOT LAW: the refusal names every searched tree
    assert str(tmp_path / "output") in str(exc.value)
    assert "re-run the producer" in str(exc.value)


def test_traversal_refuses(monkeypatch, tmp_path):
    monkeypatch.setenv("MELITE_STATE_ROOT", str(tmp_path))
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError, match="refuses traversal"):
        fm._resolve_clip_source("/v1/assets/runs/../../etc/passwd")


def test_unknown_spelling_still_names_the_three_forms(monkeypatch, tmp_path):
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError) as exc:
        fm._resolve_clip_source("just-a-bare-name.flac")
    assert "staged input-dir name, estate asset URL, or absolute path" in str(exc.value)


# ── the state_roots NODE INPUT (J12's Layer C arm, 2026-10-19) ──────────────
# The env arms above stay as the negative controls they already are:
# on a lawful lane the estate exports nothing, so those arms only
# fire when the OPERATOR's own engine env names roots. The input arm
# is the estate's channel — Layer A's submit-time walk stamps the
# roots manifest into the graph as call data.


def test_state_roots_input_resolves_with_no_env(monkeypatch, tmp_path):
    """THE LAYER C LAW: the stamped JSON array resolves the clip with
    every MELITE_* env arm empty — the estate's channel is call data,
    never process env."""
    flac, _ = _mint_output_tree(tmp_path)
    monkeypatch.delenv("MELITE_STATE_ROOT", raising=False)
    monkeypatch.delenv("MELITE_STATE_ROOTS", raising=False)
    fm = _load_film_mix(monkeypatch, {})
    stamped = f'["{tmp_path}"]'
    assert fm._resolve_clip_source(
        "/v1/assets/runs/run-aaa/tts/line.flac", stamped) == str(flac)


def test_state_roots_input_is_the_only_estate_channel(monkeypatch, tmp_path):
    """THE RETIRED ENV ARMS (vendor re-cure 2026-11-01): the estate's
    channel is call data on the state_roots input — a process env
    root never joins the trees, even when the operator's engine env
    still carries one."""
    own_env = tmp_path / "env-root"
    own_env.mkdir()
    flac, _ = _mint_output_tree(tmp_path)
    monkeypatch.setenv("MELITE_STATE_ROOT", str(own_env))
    fm = _load_film_mix(monkeypatch, {})
    assert fm._clip_candidate_trees(f'["{tmp_path}"]') == [str(tmp_path / "output")]
    assert fm._resolve_clip_source(
        "/v1/assets/runs/run-aaa/tts/line.flac", f'["{tmp_path}"]') == str(flac)


def test_state_roots_input_dedupes_against_env_roots(monkeypatch, tmp_path):
    """The input dedupes its OWN rows (first-wins within the stamp);
    an env root joins nothing (the arms are retired)."""
    own_env = tmp_path / "env-root"
    own_env.mkdir()
    monkeypatch.setenv("MELITE_STATE_ROOT", str(own_env))
    fm = _load_film_mix(monkeypatch, {})
    trees = fm._clip_candidate_trees(f'["{own_env}", "{tmp_path}"]')
    assert trees.count(str(own_env / "output")) == 1
    assert trees == [str(own_env / "output"), str(tmp_path / "output")]


def test_state_roots_malformed_refuses_loud(monkeypatch, tmp_path):
    """A malformed stamp is a bug to surface, never a silent
    fallthrough to the env arms."""
    monkeypatch.setenv("MELITE_STATE_ROOT", str(tmp_path))
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError, match="state_roots is not JSON"):
        fm._resolve_clip_source("/v1/assets/runs/run-aaa/tts/line.flac", "not-json")
    with pytest.raises(RuntimeError, match="JSON array"):
        fm._clip_candidate_trees('["/ok", 7]')
    with pytest.raises(RuntimeError, match="JSON array"):
        fm._clip_candidate_trees('"/just-a-string"')


def test_empty_state_roots_input_leaves_the_derivation_only(monkeypatch, tmp_path):
    """Empty input is the unstamped shape (old graphs): outside an
    engine cwd nothing derives, and a process env root joins nothing
    (the arms are retired)."""
    monkeypatch.setenv("MELITE_STATE_ROOT", str(tmp_path))
    fm = _load_film_mix(monkeypatch, {})
    assert fm._clip_candidate_trees("") == []


def test_unstamped_miss_names_the_state_roots_input(monkeypatch, tmp_path):
    """The refusal prose no longer advises the retired env export; it
    names both missing channels."""
    monkeypatch.delenv("MELITE_STATE_ROOT", raising=False)
    monkeypatch.delenv("MELITE_STATE_ROOTS", raising=False)
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError) as exc:
        fm._resolve_clip_source("/v1/assets/runs/run-gone/tts/line.flac")
    assert "state_roots node input is unstamped" in str(exc.value)
    assert "MELITE_STATE_ROOT" not in str(exc.value)


# ── THE WIRED-SEAT LAW (2026-11-01, the soundtrack merged-form wire) ────────
# A clips_json row MAY omit src and carry `wired: k` — the card seats the
# spelled src on the node's wired_audio_k AUDIO input, the merge lands the
# producer's link there, and mix_film reads the SEAT's waveform instead of
# decoding a file. Walls: the parse law, the declared surface, the seat
# routing + rate gate in the REAL mix_film, and the sharpened $spell
# refusal voice. mix_film drives the REAL Delay/Mix/Duck (nodes.py loaded
# under a synthetic package; its engine-half siblings are stubbed — the
# native .so and the qvoice/loudness faces are not this law's subject).


def _stub_module(name: str) -> types.ModuleType:
    """A sibling stub whose from-imports resolve to inert dummies
    (nodes.py imports engine faces this law never drives)."""
    mod = types.ModuleType(name)
    mod.__getattr__ = lambda attr: None  # type: ignore[method-assign]
    return mod


def _load_film_mix_pkg(monkeypatch, output_dir: Path):
    """Load the REAL nodes.py + film_mix.py as a synthetic package:
    film_mix's `from .nodes import …` (made at mix_film call time)
    resolves the real Delay/Mix/Duck, while the native/qvoice/loudness
    engine faces ride stubs. Returns (film_mix_module, nodes_module)."""
    pkg_name = "melite_audio_wired_test"
    # purge machinery-cached modules from an earlier load (the import
    # system inserts .nodes/.film_mix itself, not via monkeypatch) so
    # every test re-executes against ITS OWN folder_paths stub
    for mod_name in list(sys.modules):
        if mod_name == pkg_name or mod_name.startswith(pkg_name + "."):
            monkeypatch.delitem(sys.modules, mod_name)
    folder_paths = types.ModuleType("folder_paths")
    folder_paths.get_annotated_filepath = lambda name: os.path.join("/nonexistent-input", name)
    folder_paths.get_output_directory = lambda: str(output_dir)
    folder_paths.get_input_directory = lambda: str(output_dir)
    folder_paths.get_filename_list = lambda key: []
    folder_paths.folder_names_and_paths = {}
    folder_paths.get_folder_paths = lambda key: [str(output_dir)]
    monkeypatch.setitem(sys.modules, "folder_paths", folder_paths)
    pkg = types.ModuleType(pkg_name)
    pkg.__path__ = [str(PACKAGE_ROOT)]  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, pkg_name, pkg)
    for sub in ("core", "native", "schemas", "qvoice_copy", "qvoice", "loudness", "env_assert"):
        monkeypatch.setitem(sys.modules, f"{pkg_name}.{sub}", _stub_module(f"{pkg_name}.{sub}"))
    nodes = importlib.import_module(f"{pkg_name}.nodes")
    return importlib.import_module(f"{pkg_name}.film_mix"), nodes


def _mint_windows(output_dir: Path, count: int = 2) -> None:
    for i in range(1, count + 1):
        (output_dir / f"w{i}_00001_.mp4").write_bytes(b"stub")


def test_wired_row_parses_without_src(monkeypatch):
    fm = _load_film_mix(monkeypatch, {})
    clips = fm._parse_clips('[{"wired": 1, "start_sec": 0.5, "dur_sec": 0.0, "class": "music"}]')
    assert clips == [{"wired": 1, "start_sec": 0.5, "dur_sec": 0.0, "in_sec": 0.0, "class": "music"}]
    assert "src" not in clips[0]
    # a path row keeps its shape byte-identically (the lawful handoff)
    path_clips = fm._parse_clips('[{"src": "bed.flac", "start_sec": 0, "dur_sec": 1, "class": "sfx"}]')
    assert path_clips == [{"src": "bed.flac", "start_sec": 0.0, "dur_sec": 1.0, "in_sec": 0.0, "class": "sfx"}]


def test_srcless_row_without_a_valid_wired_seat_keeps_the_refusal(monkeypatch):
    fm = _load_film_mix(monkeypatch, {})
    refusal = "has no src — never a silent misplacement"
    for row in ('{}', '{"wired": 0}', '{"wired": 5}', '{"wired": "1"}', '{"wired": true}'):
        with pytest.raises(RuntimeError, match=re.escape(refusal)):
            fm._parse_clips(f"[{row}]")


def test_row_with_both_src_and_wired_refuses_loud(monkeypatch):
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError, match="carries BOTH src and wired"):
        fm._parse_clips('[{"src": "bed.flac", "wired": 1, "start_sec": 0, "dur_sec": 0, "class": "music"}]')


def test_wired_row_keeps_the_class_and_numeric_laws(monkeypatch):
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError, match="unknown class"):
        fm._parse_clips('[{"wired": 1, "start_sec": 0, "dur_sec": 0, "class": "ambient"}]')
    with pytest.raises(RuntimeError, match="needs numeric start_sec/dur_sec"):
        fm._parse_clips('[{"wired": 1, "start_sec": "x", "dur_sec": 0}]')
    with pytest.raises(RuntimeError, match="needs start_sec >= 0"):
        fm._parse_clips('[{"wired": 1, "start_sec": -1, "dur_sec": 0}]')


def test_input_types_declare_the_wired_seats(monkeypatch):
    fm, nodes = _load_film_mix_pkg(monkeypatch, Path("/tmp"))
    types_ = nodes.MeliteFilmAudioMix.INPUT_TYPES()
    optional = types_["optional"]
    for k in range(1, 5):
        assert f"wired_audio_{k}" in optional, f"wired_audio_{k} missing from the declared optional seats"
        assert optional[f"wired_audio_{k}"][0] == "AUDIO"
    assert "wired_audio_5" not in optional
    # the required surface is unchanged
    assert "clips_json" in types_["required"]


def test_wired_seat_places_its_waveform(monkeypatch, tmp_path):
    fm, nodes = _load_film_mix_pkg(monkeypatch, tmp_path)
    _mint_windows(tmp_path)
    sr = 48000
    half = sr // 2  # two 0.5s windows butt-joined = the 1.0s film
    decodes: list[str] = []

    def fake_load(path: str):
        decodes.append(os.path.basename(path))
        return torch.zeros(1, 2, half), sr

    nodes.load_audio_file = fake_load
    seat_waveform = torch.full((1, 2, half), 0.25)
    out = nodes.MeliteFilmAudioMix().mix_film(
        videos="w1,w2", after="boundary",
        clips_json='[{"wired": 1, "start_sec": 0.5, "dur_sec": 0.0, "class": "music"}]',
        duck_spans="", music_duck_spans="", duck_db=-14.0, film_seconds=1.0,
        state_roots="", wired_audio_1={"waveform": seat_waveform, "sample_rate": sr},
    )[0]
    # the seats' currency: ONLY the two windows decoded — the wired row
    # never hit a file loader
    assert sorted(decodes) == ["w1_00001_.mp4", "w2_00001_.mp4"]
    # the music bus carried the seat: head silence to 0.5s, then the
    # seat's samples at unity over the silent film
    assert int(out["sample_rate"]) == sr
    assert torch.allclose(out["waveform"][0, 0, :half], torch.zeros(half), atol=1e-6)
    assert torch.allclose(out["waveform"][0, 0, half:], torch.full((half,), 0.25), atol=1e-6)


def test_wired_seat_at_a_foreign_rate_refuses_loud(monkeypatch, tmp_path):
    fm, nodes = _load_film_mix_pkg(monkeypatch, tmp_path)
    _mint_windows(tmp_path)
    nodes.load_audio_file = lambda path: (torch.zeros(1, 2, 24000), 48000)
    with pytest.raises(RuntimeError, match="wired seat 1 samples at 44100Hz"):
        nodes.MeliteFilmAudioMix().mix_film(
            videos="w1,w2", after="boundary",
            clips_json='[{"wired": 1, "start_sec": 0.0, "dur_sec": 0.0, "class": "music"}]',
            duck_spans="", music_duck_spans="", duck_db=-14.0, film_seconds=1.0,
            state_roots="", wired_audio_1={"waveform": torch.zeros(1, 2, 24000), "sample_rate": 44100},
        )


def test_wired_row_with_an_unset_seat_refuses_loud(monkeypatch, tmp_path):
    fm, nodes = _load_film_mix_pkg(monkeypatch, tmp_path)
    _mint_windows(tmp_path)
    nodes.load_audio_file = lambda path: (torch.zeros(1, 2, 24000), 48000)
    with pytest.raises(RuntimeError, match="wired: 2 has no wired_audio_2 input"):
        nodes.MeliteFilmAudioMix().mix_film(
            videos="w1,w2", after="boundary",
            clips_json='[{"wired": 2, "start_sec": 0.0, "dur_sec": 0.0, "class": "music"}]',
            duck_spans="", music_duck_spans="", duck_db=-14.0, film_seconds=1.0,
            state_roots="",
        )


def test_spell_src_refusal_names_the_wired_cure(monkeypatch):
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError) as exc:
        fm._resolve_clip_source("$bed")
    assert "soundtrack wire never seated" in str(exc.value)
    assert "wired_audio_k" in str(exc.value)
