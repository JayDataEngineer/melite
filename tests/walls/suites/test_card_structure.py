#!/usr/bin/env python3
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

Run: python3 tests/walls/suites/test_card_structure.py
"""

import json
import os
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
ACTION_CARDS = os.path.join(REPO, "plugins", "engines", "comfyui",
                            "action_cards")
GOLDEN = os.path.join(ACTION_CARDS, "video", "h3-timeline")

ALLOWED_ROOT = {"agents", "py", "ui", "tool.json", "README.md"}
PY_REQUIRED = {"__init__.py", "compose.py"}

PASS = FAIL = 0


def check(name, ok, detail=""):
    global PASS, FAIL
    print("  %s  %s%s" % ("ok" if ok else "FAIL", name,
                          (" — %s" % detail) if detail and not ok else ""))
    PASS, FAIL = PASS + ok, FAIL + (not ok)


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
                # the genre's shared VIEWER package (viewers/,
                # node_modules, package.json) — not an action card
                continue
            out.append((genre, cdir))
    return out


def cross_engine_owner(genre, cdir):
    """The card id another engine's cards/ tree owns, or None — a py/
    dir with no card.py must be an arm satellite for one of them."""
    card = os.path.basename(cdir)
    eng_root = os.path.join(REPO, "plugins", "engines")
    for engine in sorted(os.listdir(eng_root)):
        if engine.startswith(".") or engine == "comfyui":
            continue
        owner = os.path.join(eng_root, engine, "cards", card, "card.py")
        if os.path.isfile(owner):
            return owner
    return None


def validate_card(genre, cdir):
    label = "%s/%s" % (genre, os.path.basename(cdir))
    entries = sorted(e for e in os.listdir(cdir)
                     if not e.startswith("."))

    # 1. no python at the card root — THE CARD PATTERN (py/ only)
    root_py = [e for e in entries if e.endswith(".py")]
    check("%s: no root python" % label, not root_py,
          "root %s — python lives in py/" % root_py)

    # 2. only the skeleton's entries at the root
    strays = [e for e in entries if e not in ALLOWED_ROOT]
    check("%s: root skeleton only" % label, not strays,
          "unexpected %s (allowed: %s)" % (strays, sorted(ALLOWED_ROOT)))

    # 3. AGENT.md lives under agents/, never at the root
    check("%s: AGENT.md under agents/" % label,
          "AGENT.md" not in entries,
          "root AGENT.md — the golden base keeps it in agents/")

    has_py = "py" in entries
    py_dir = os.path.join(cdir, "py")
    if has_py:
        # 4. the package is real and the arm is py/compose.py
        py_entries = set(os.listdir(py_dir))
        missing = sorted(PY_REQUIRED - py_entries)
        check("%s: py package complete" % label, not missing,
              "py/ missing %s" % missing)

        # 5. identity: py/card.py, or a cross-engine arm satellite
        if "card.py" not in py_entries:
            owner = cross_engine_owner(genre, cdir)
            check("%s: arm satellite has a cross-engine owner" % label,
                  owner is not None,
                  "py/ has no card.py and no other engine claims "
                  "cards/%s/" % os.path.basename(cdir))

        # 6. a python card serves its derived tool snapshot — here,
        #    or at its cross-engine card-surface owner
        owner = (cross_engine_owner(genre, cdir)
                 if "card.py" not in py_entries else None)
        owner_tool = (os.path.join(os.path.dirname(owner), "tool.json")
                      if owner else None)
        check("%s: tool.json present" % label,
              "tool.json" in entries
              or bool(owner_tool and os.path.isfile(owner_tool)),
              "python card without tool.json (here or at the owner)")


def main():
    print("THE STRUCTURE WALL — action cards vs the golden base")
    dirs = card_dirs()
    check("action cards discovered", len(dirs) >= 6,
          "only %d card dirs" % len(dirs))

    # the golden base proves the wall against itself first
    check("golden base present", os.path.isdir(GOLDEN), GOLDEN)
    for genre, cdir in dirs:
        validate_card(genre, cdir)

    # the dispatch table names real dirs with real arms (one stem:
    # py/compose.py — the per-card generate/edit/music stems are over)
    sys.path.insert(0, os.path.join(REPO, "py"))
    comfyui_root = os.path.join(REPO, "plugins", "engines", "comfyui")
    sys.path.insert(0, comfyui_root)
    sys.path.insert(0, os.path.join(comfyui_root, "compose"))
    import compose as _compose_pkg  # noqa: E402
    for card_id, rel in sorted(_compose_pkg._CARD_DIR_BY_CARD.items()):
        arm = os.path.join(ACTION_CARDS, rel, "py", "compose.py")
        check("dispatch: %s -> py/compose.py" % card_id,
              os.path.isfile(arm), "missing %s" % arm)

    # ── MODEL DIR COMPLETENESS (the qwen bug class, walled) ─────
    # A model class that boards a renderer-serving card must be
    # RENDERABLE at boot: engine declared, lane_inputs row, the
    # arm's graph template + nodes.yaml in the model dir. Each of
    # those was a real integration failure (engine -> "no model
    # unit"; template -> "template missing"; lane_inputs ->
    # None.unet) — the wall refuses the phantom at load.
    sys.path.insert(0, os.path.join(REPO, "py"))
    from melite_models import scan_engine_models
    _mcards = {mid: cls for mid, (_p, cls)
               in scan_engine_models(REPO).items()}
    # the arms' template names, keyed by FAMILY (the grouped-card
    # truth: ONE card, one arm per family — video-gen boards
    # wan-vace + scail2-animate, img-to-mesh boards trellis2-native +
    # transfer_rig; a family's dir carries ITS arm's template)
    _TEMPLATE_BY_FAMILY = {
        "krea-2": "generate_t2i.json",
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
            continue          # tool/utility lanes: not card families
        check("model %s declares engine" % mid,
              bool(getattr(mcls, "engine", "")),
              "boarding %s with no engine" % card_id)
        check("model %s carries lane facts" % mid,
              getattr(mcls, "lane_inputs", None) is not None,
              "boarding %s with no lane_inputs row" % card_id)
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
                check("model %s carries its %s" % (mid, tmpl),
                      os.path.isfile(os.path.join(mdir, tmpl)),
                      "missing in %s" % mdir)
                # nodes.yaml is deliberately NOT demanded: absence
                # is the honest "no extensions for this lane"
                # (krea-2 uses core nodes only; EXTENSION LAW —
                # declarations are per-lane, optional)

    # ── THE COMPLETENESS WALL (cluster D, 2026-09-04) ────────────
    # The hand tables above pin EXACT names (drift detection); this
    # walk is DERIVED from the registry — a family that declares
    # engine+card is renderable at boot NO MATTER whether anyone
    # remembered the tables. Three derived facts, no hand lists:
    #   1. the model dir carries ≥1 graph template (*.json besides
    #      nodes.yaml) — a boarding family with no template is the
    #      qwen bug class (refuses at render, not at boot);
    #   2. the card dir exists on the golden base with py/compose.py
    #      (dash or underscore variant — the estate has both);
    #   3. the dispatch table routes it (card -> py/compose.py path).
    # DATA families (engine, no card) and husks are NOT walled —
    # the FEEDING LAW boards them the day they can feed.
    _MODELS_ROOT = os.path.join(REPO, "plugins", "engines", "comfyui",
                                "models")
    for mid, mcls in sorted(_mcards.items()):
        card_id = getattr(mcls, "card", "") or ""
        engine = getattr(mcls, "engine", "") or ""
        if not (card_id and engine):
            continue
        genre = getattr(mcls, "genre", "") or ""
        mdir = os.path.join(_MODELS_ROOT, genre, mid)
        if not os.path.isdir(mdir):
            # the census walk found it before under some genre —
            # only a hand-edited genre mismatch lands here
            for g in os.listdir(_MODELS_ROOT):
                d = os.path.join(_MODELS_ROOT, g, mid)
                if os.path.isdir(d):
                    mdir = d
                    break
        # 1. ≥1 graph template in the model dir
        tmpl_jsons = [f for f in os.listdir(mdir)
                      if f.endswith(".json") and f != "nodes.yaml"] \
            if os.path.isdir(mdir) else []
        check("completeness: %s dir carries a graph template" % mid,
              bool(tmpl_jsons),
              "no *.json template in %s (boarding %s)" % (mdir, card_id))
        # 2. the card is DISPATCHED — _CARD_DIR_BY_CARD routes it
        # (the routing SSOT; the existing dispatch loop above then
        # proves the routed dir carries py/compose.py). Deriving
        # the dir by genre convention is wrong twice over:
        # mask-studio's genre FIELD is 'image' (sidebar taxonomy)
        # but its dir is action_cards/mask/; qwen-img-edit-2511
        # lives in models/edit/ but boards image/image-edit.
        check("completeness: %s is dispatched" % card_id,
              card_id in _compose_pkg._CARD_DIR_BY_CARD,
              "card-declaring model %s not in _CARD_DIR_BY_CARD"
              " (never routes)" % mid)

    # bytecode never tracked under action_cards
    tracked = subprocess.run(
        ["git", "-C", REPO, "ls-files", "--",
         "plugins/engines/comfyui/action_cards"],
        capture_output=True, text=True).stdout.splitlines()
    dirty = [t for t in tracked
             if "__pycache__" in t or t.endswith(".pyc")]
    check("no bytecode tracked under action_cards", not dirty, dirty[:3])

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
