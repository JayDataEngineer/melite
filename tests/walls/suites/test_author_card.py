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
