"""test_author_card — ROW 7 slice 1 (2026-09-07): the anatomy gate.

`tools/author_card.py check` codifies the boardable-card shape
(docs/design/row7-card-authoring.md) without the gateway. This wall
pins both directions through the CLI contract:

  PASS — real boarded cards (registry-named gate, all-models
    fallback, content-gated h3 whose no-calls law fires through
    the probe).
  FAIL EXACT — tmp copies of tts/py with one mutation each name
    the missing piece (the fit/skin hole class, the forbid
    grammar, the rung-6 id, the registry row); engine-native
    cards get the precise N/A scope message.

Design record: docs/design/row7-card-authoring.md.
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
TOOL = REPO / "tools" / "author_card.py"
TTS_PY = (REPO / "plugins/engines/comfyui/action_cards/audio/tts/py")


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(TOOL), *args],
        capture_output=True, text=True, timeout=120)


@pytest.mark.parametrize("card_id", [
    "tts", "music", "mask-studio", "h3-timeline", "anny"])
def test_boarded_cards_pass(card_id: str) -> None:
    proc = _run(card_id)
    assert proc.returncode == 0, \
        "boarded card %r refused:\n%s" % (card_id, proc.stdout)


def _copy_tts(tmp_path: Path) -> Path:
    dest = tmp_path / "tts" / "py"
    shutil.copytree(TTS_PY, dest,
                    ignore=shutil.ignore_patterns("__pycache__"))
    return tmp_path / "tts"


def _park(name: str):
    """Copy tts/py to a parked REAL-tree card dir (model loads are
    __file__-relative — tmp copies break them). Caller removes."""
    from contextlib import contextmanager

    @contextmanager
    def _ctx():
        parked = (REPO / "plugins/engines/comfyui/action_cards/audio"
                  / name)
        shutil.copytree(TTS_PY, parked / "py",
                        ignore=shutil.ignore_patterns("__pycache__"))
        try:
            yield parked
        finally:
            shutil.rmtree(parked, ignore_errors=True)
    return _ctx()


def test_missing_init_names_it() -> None:
    with _park("wall-tmp-noinit") as card:
        (card / "py" / "__init__.py").unlink()
        proc = _run("tts", "--dir", str(card))
        assert proc.returncode == 1, proc.stdout
        assert "__init__.py" in proc.stdout, proc.stdout


def test_open_extras_refuse_the_grammar() -> None:
    with _park("wall-tmp-open") as card:
        schema = card / "py" / "schema.py"
        text = schema.read_text()
        assert 'extra="forbid"' in text or "extra='forbid'" in text, \
            "tts schema lost its forbid gate — the wall's premise moved"
        schema.write_text(
            text.replace('extra="forbid"', 'extra="ignore"')
            .replace("extra='forbid'", "extra='ignore'"))
        proc = _run("tts", "--dir", str(card))
        assert proc.returncode == 1, proc.stdout
        assert "forbid" in proc.stdout, proc.stdout


def test_restated_id_refuses() -> None:
    with _park("wall-tmp-restated") as card:
        card_py = card / "py" / "card.py"
        text = card_py.read_text()
        assert "id = 'tts'" in text, \
            "tts card id spelling moved — the wall's premise moved"
        card_py.write_text(
            text.replace("id = 'tts'", "id = 'tts-typo'"))
        proc = _run("tts", "--dir", str(card))
        assert proc.returncode == 1, proc.stdout
        assert "tts-typo" in proc.stdout, proc.stdout


def test_scaffold_stage_passes_without_registry() -> None:
    with _park("wall-tmp-scaffold") as card:
        card_py = card / "py" / "card.py"
        proc = _run("tts", "--dir", str(card))
        assert proc.returncode == 0, proc.stdout


def test_tree_card_without_row_names_registry() -> None:
    """A card dir IN the tree but with no REGISTRY row names the row
    (the boarding half the scaffold does not write). Real-tree
    mutation, removed in finally — load_flow's runtime-module
    precedent."""
    parked = (REPO / "plugins/engines/comfyui/action_cards/audio"
              / "wall-tmp-card")
    shutil.copytree(TTS_PY, parked / "py",
                    ignore=shutil.ignore_patterns("__pycache__"))
    # the copy keeps tts's card id (rung-6 fires too) — the REGISTRY
    # refusal is the pinned half; both name their piece.
    card_py = parked / "py" / "card.py"
    card_py.write_text(card_py.read_text()
                       .replace("id = 'tts'", "id = 'wall-tmp-card'"))
    try:
        proc = _run("wall-tmp-card")
        assert proc.returncode == 1, proc.stdout
        assert "REGISTRY" in proc.stdout, proc.stdout
    finally:
        shutil.rmtree(parked, ignore_errors=True)


def test_engine_native_names_scope() -> None:
    proc = _run("forge")
    assert proc.returncode == 1, proc.stdout
    assert "engine-native" in proc.stdout, proc.stdout


# --- row-7 slice 2: the scaffold generator -------------------------

import json  # noqa: E402


def _spec(tmp_path: Path, **over: object) -> Path:
    base: dict = {
        "card_id": "wall-demo", "genre": "audio", "engine": "comfyui",
        "label": "Wall Demo", "description": "scaffold proof card",
        "requires_model": True,
        "models": [{"file": "plugins/engines/comfyui/models/audio/"
                            "qwen3-tts/model.py",
                    "class": "Qwen3Tts"}],
        "params": [{"name": "text", "type": "str", "required": True},
                   {"name": "temperature", "type": "float",
                    "default": 0.7}],
    }
    base.update(over)
    path = tmp_path / "spec.json"
    path.write_text(json.dumps(base))
    return path


def _scaffold(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(TOOL), "scaffold", *args],
        capture_output=True, text=True, timeout=120)


def test_scaffold_then_check_names_model_claim(
        tmp_path: Path) -> None:
    """The authoring loop, half 1: scaffold a card naming a model
    that does NOT claim it — check fails LOUD naming the remedy
    (the model's to declare), never a silent GPU run."""
    out = tmp_path / "wall-card"
    proc = _scaffold("--spec-file", str(_spec(tmp_path)),
                     "--out", str(out))
    assert proc.returncode == 0, proc.stdout + proc.stderr
    for leaf in ("__init__.py", "card.py", "schema.py",
                 "compose.py", "renderer.py"):
        assert (out / "py" / leaf).is_file(), leaf
    proc = _run("wall-demo", "--dir", str(out))
    assert proc.returncode == 1, proc.stdout
    assert "does not claim this card back" in proc.stdout, \
        proc.stdout


def test_scaffold_full_loop_passes() -> None:
    """Half 2: park a model copy CLAIMING the new card, scaffold
    against it — check passes fully (schema, id, cross-hook).
    Real-tree parks, removed in finally."""
    model_dir = (REPO / "plugins/engines/comfyui/models/audio"
                 / "wall-tmp-fam")
    src = REPO / "plugins/engines/comfyui/models/audio/moss-sfx" \
        / "model.py"
    text = src.read_text()
    assert "card = 'sfx'" in text, \
        "moss-sfx model shape moved — the wall's premise moved"
    model_dir.mkdir()
    (model_dir / "model.py").write_text(
        text.replace("class MossSfx(Model):",
                     "class WallTmpFam(Model):")
        .replace("id = 'moss-sfx'", "id = 'wall-tmp-fam'")
        .replace("card = 'sfx'", "card = 'wall-tmp-card'"))
    try:
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            spec = {
                "card_id": "wall-tmp-card", "genre": "audio",
                "engine": "comfyui", "label": "Wall Tmp",
                "description": "full-loop proof card",
                "models": [{"file": "plugins/engines/comfyui/models/"
                                    "audio/wall-tmp-fam/model.py",
                            "class": "WallTmpFam"}],
                "params": [{"name": "text", "type": "str",
                            "required": True}],
            }
            spec_file = Path(tmp) / "spec.json"
            spec_file.write_text(json.dumps(spec))
            out = Path(tmp) / "card"
            proc = _scaffold("--spec-file", str(spec_file),
                             "--out", str(out))
            assert proc.returncode == 0, proc.stdout + proc.stderr
            proc = _run("wall-tmp-card", "--dir", str(out))
            assert proc.returncode == 0, proc.stdout
    finally:
        shutil.rmtree(model_dir, ignore_errors=True)


def test_scaffold_is_deterministic(tmp_path: Path) -> None:
    """Scaffold is a pure function of the spec — twice,
    byte-identical (a generator that drifts is a second truth)."""
    spec = str(_spec(tmp_path))
    outs = []
    for leaf in ("one", "two"):
        out = tmp_path / leaf
        proc = _scaffold("--spec-file", spec, "--out", str(out))
        assert proc.returncode == 0, proc.stdout + proc.stderr
        outs.append(out)
    for leaf in ("__init__.py", "card.py", "schema.py",
                 "compose.py", "renderer.py"):
        a = (outs[0] / "py" / leaf).read_bytes()
        b = (outs[1] / "py" / leaf).read_bytes()
        assert a == b, "scaffold drifted on %s" % leaf


@pytest.mark.parametrize("over,needle", [
    ({"card_id": "Has Space"}, "must match"),
    ({"params": [{"name": "ok", "type": "colour"}]}, "closed"),
    ({"params": [{"name": "ok", "type": "str", "required": True,
                  "default": "x"}]}, "contradiction"),
    ({"models": []}, "at least one"),
    ({"models": [{"file": "nope/model.py"}]}, "{file, class}"),
    ({"models": [{"file": "plugins/engines/comfyui/models/audio/"
                            "ghost/model.py",
                  "class": "Ghost"}]}, "not in the tree"),
])
def test_spec_refusals_name_the_rule(tmp_path: Path, over: dict,
                                     needle: str) -> None:
    proc = _scaffold("--spec-file", str(_spec(tmp_path, **over)),
                     "--out", str(tmp_path / "card"))
    assert proc.returncode == 1, proc.stdout
    assert needle in proc.stdout, proc.stdout


def test_scaffold_refuses_clobber(tmp_path: Path) -> None:
    out = tmp_path / "card"
    (out / "py").mkdir(parents=True)
    (out / "py" / "x.py").write_text("mine")
    proc = _scaffold("--spec-file", str(_spec(tmp_path)),
                     "--out", str(out))
    assert proc.returncode == 1, proc.stdout
    assert "clobber" in proc.stdout, proc.stdout
    assert (out / "py" / "x.py").read_text() == "mine"
