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
import sys
import types
from pathlib import Path

import pytest

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
    monkeypatch.setenv("MELITE_STATE_ROOT", str(tmp_path))
    fm = _load_film_mix(monkeypatch, {})
    url = "/v1/assets/runs/run-aaa/tts/line.flac"
    assert fm._resolve_clip_source(url) == str(flac)
    # the browser spelling is the same file
    assert fm._resolve_clip_source("/melite-media/runs/run-aaa/tts/line.flac") == str(flac)


def test_cross_root_extras_walk_after_the_own_root(monkeypatch, tmp_path):
    own = tmp_path / "own"
    other = tmp_path / "other"
    own.mkdir()
    flac, _ = _mint_output_tree(other)
    monkeypatch.setenv("MELITE_STATE_ROOT", str(own))
    monkeypatch.setenv("MELITE_STATE_ROOTS", f"{other}")
    fm = _load_film_mix(monkeypatch, {})
    assert fm._resolve_clip_source("/v1/assets/runs/run-aaa/tts/line.flac") == str(flac)


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
    monkeypatch.setenv("MELITE_STATE_ROOT", str(tmp_path))
    fm = _load_film_mix(monkeypatch, {})
    with pytest.raises(RuntimeError) as exc:
        fm._resolve_clip_source("/v1/assets/runs/run-gone/tts/line.flac")
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
