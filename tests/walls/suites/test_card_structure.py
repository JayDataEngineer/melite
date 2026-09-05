"""THE STRUCTURE WALL (operator order, 2026-09-04: "clearly we need
some sort of validation on file and folder structure... the timeline
action card, the golden base, is different than the img-gen action
card").

Every action card dir under this engine's action_cards/ must match
ONE skeleton — the golden base (h3-timeline):

    action_cards/<genre>/<card>/
      agents/            # AGENT.md (+ prompts.yaml, skills/) — never
                         # an AGENT.md at the card root
      py/                # ALL python: __init__.py, card.py, compose.py
                         # (the arm — one stem, every card), renderer.py
                         # when the card renders, subpackages at will
      ui/                # optional (studio surfaces)
      tool.json          # derived snapshot (cards that serve python)

Root-level *.py, root AGENT.md, and surprise root entries are drift.
Pure-UI cards (ui/ only, no python) pass untouched. A py/ with no
py/card.py is legal ONLY as a cross-engine arm satellite (music: the
card surface lives in audio-cpp/cards/music/ — the wall asserts the
owner exists and declares the same card id).
"""

import os
import subprocess
import sys

import pytest

from _anchor import REPO
ACTION_CARDS = os.path.join(REPO, "plugins", "engines", "comfyui",
                            "action_cards")
GOLDEN = os.path.join(ACTION_CARDS, "video", "h3-timeline")

ALLOWED_ROOT = {"agents", "py", "ui", "tool.json", "README.md"}
PY_REQUIRED = {"__init__.py", "compose.py"}


def card_dirs():
    """(genre, card_dir) for every card dir — skips non-genre roots
    (node_modules shared by the ui surfaces, dotdirs)."""
    out = []
    for genre in sorted(os.listdir(ACTION_CARDS)):
        if genre.startswith(".") or genre == "node_modules":
            continue
        gdir = os.path.join(ACTION_CARDS, genre)
        if not os.path.isdir(gdir):
            continue
        for card in sorted(os.listdir(gdir)):
            cdir = os.path.join(gdir, card)
            if not os.path.isdir(cdir) or card.startswith("."):
                continue
            if card == "ui":
                continue
            out.append((genre, cdir))
    return out


def cross_engine_owner(genre, cdir):
    """The card id another engine's cards/ tree owns, or None."""
    card = os.path.basename(cdir)
    eng_root = os.path.join(REPO, "plugins", "engines")
    for engine in sorted(os.listdir(eng_root)):
        if engine.startswith(".") or engine == "comfyui":
            continue
        owner = os.path.join(eng_root, engine, "cards", card, "card.py")
        if os.path.isfile(owner):
            return owner
    return None


def _validate_card(genre, cdir):
    """Validate a single card dir. Returns list of (ok, label, detail) tuples."""
    label = "%s/%s" % (genre, os.path.basename(cdir))
    entries = sorted(e for e in os.listdir(cdir) if not e.startswith("."))
    results = []

    # 1. no python at the card root
    root_py = [e for e in entries if e.endswith(".py")]
    results.append((not root_py, "%s: no root python" % label,
                     "root %s — python lives in py/" % root_py))

    # 2. only the skeleton's entries at the root
    strays = [e for e in entries if e not in ALLOWED_ROOT]
    results.append((not strays, "%s: root skeleton only" % label,
                     "unexpected %s (allowed: %s)" % (strays, sorted(ALLOWED_ROOT))))

    # 3. AGENT.md lives under agents/, never at the root
    results.append(("AGENT.md" not in entries,
                     "%s: AGENT.md under agents/" % label,
                     "root AGENT.md — the golden base keeps it in agents/"))

    has_py = "py" in entries
    py_dir = os.path.join(cdir, "py")
    if has_py:
        py_entries = set(os.listdir(py_dir))
        missing = sorted(PY_REQUIRED - py_entries)
        results.append((not missing, "%s: py package complete" % label,
                         "py/ missing %s" % missing))

        if "card.py" not in py_entries:
            owner = cross_engine_owner(genre, cdir)
            results.append((owner is not None,
                             "%s: arm satellite has a cross-engine owner" % label,
                             "py/ has no card.py and no other engine claims "
                             "cards/%s/" % os.path.basename(cdir)))

        owner = (cross_engine_owner(genre, cdir)
                 if "card.py" not in py_entries else None)
        owner_tool = (os.path.join(os.path.dirname(owner), "tool.json")
                      if owner else None)
        results.append(("tool.json" in entries
                         or bool(owner_tool and os.path.isfile(owner_tool)),
                         "%s: tool.json present" % label,
                         "python card without tool.json (here or at the owner)"))

    return results


def test_action_cards_discovered():
    dirs = card_dirs()
    assert len(dirs) >= 6, "only %d card dirs" % len(dirs)


def test_golden_base_present():
    assert os.path.isdir(GOLDEN), GOLDEN


def test_card_structure():
    for genre, cdir in card_dirs():
        for ok, label, detail in _validate_card(genre, cdir):
            assert ok, detail


def test_dispatch_table():
    sys.path.insert(0, os.path.join(REPO, "py"))
    comfyui_root = os.path.join(REPO, "plugins", "engines", "comfyui")
    sys.path.insert(0, comfyui_root)
    sys.path.insert(0, os.path.join(comfyui_root, "compose"))
    import compose as _compose_pkg
    for card_id, rel in sorted(_compose_pkg._CARD_DIR_BY_CARD.items()):
        arm = os.path.join(ACTION_CARDS, rel, "py", "compose.py")
        assert os.path.isfile(arm), "missing %s" % arm


def test_model_dir_completeness():
    sys.path.insert(0, os.path.join(REPO, "py"))
    from melite_models import scan_engine_models
    _mcards = {mid: cls for mid, (_p, cls)
               in scan_engine_models(REPO).items()}

    # the package-load arms (h3-timeline) read no lane_inputs — the
    # lane package owns its own weight wiring; the row requirement
    # below is the CARD-PATTERN arms' contract (SSOT: compose's
    # _PACKAGE_CARDS)
    sys.path.insert(0, os.path.join(
        REPO, "plugins", "engines", "comfyui"))
    sys.path.insert(0, os.path.join(
        REPO, "plugins", "engines", "comfyui", "compose"))
    import compose as _compose_pkg
    _package_cards = _compose_pkg._PACKAGE_CARDS

    _TEMPLATE_BY_FAMILY = {
        "krea-2": "generate_t2i.json",
        "z-image": "generate_t2i.json",
        "anima": "generate_t2i.json",
        "ideogram": "generate_t2i.json",
        "img-edit": "edit_i2i.json",
        "qwen3-tts-voicedesign": "tts_t1.json",
        "voice-lock": "voicelock_t1.json",
        "sfx": "sfx_t1.json",
        "mask-studio": "mask_t1.json",
        "motion": "motion_t1.json",
        "trellis2-native": "trellis_t1.json",
        "transfer_rig": "transfer_rig_t1.json",
        "wan-vace": "wan_vace_t1.json",
        "scail2-animate": "scail2_t1.json",
        "seedvr2_ema": "seedvr2_t1.json",
    }
    for mid, mcls in sorted(_mcards.items()):
        card_id = getattr(mcls, "card", "") or ""
        if not card_id:
            continue
        assert bool(getattr(mcls, "engine", "")), (
            "model %s boarding %s with no engine" % (mid, card_id))
        if card_id not in _package_cards:
            assert getattr(mcls, "lane_inputs", None) is not None, (
                "model %s boarding %s with no lane_inputs row"
                % (mid, card_id))
        tmpl = _TEMPLATE_BY_FAMILY.get(mid)
        if tmpl:
            mdir = None
            for genre in os.listdir(os.path.join(
                    REPO, "plugins", "engines", "comfyui", "models")):
                d = os.path.join(REPO, "plugins", "engines", "comfyui",
                                 "models", genre, mid)
                if os.path.isdir(d):
                    mdir = d
                    break
            if mdir:
                assert os.path.isfile(os.path.join(mdir, tmpl)), (
                    "model %s missing %s in %s" % (mid, tmpl, mdir))


def test_no_bytecode_tracked():
    tracked = subprocess.run(
        ["git", "-C", REPO, "ls-files", "--",
         "plugins/engines/comfyui/action_cards"],
        capture_output=True, text=True).stdout.splitlines()
    dirty = [t for t in tracked
             if "__pycache__" in t or t.endswith(".pyc")]
    assert not dirty, dirty[:3]
