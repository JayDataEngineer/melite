"""test_card_boarding — OFFERED MEANS RUNNABLE (operator order
2026-09-05, verbatim: "i NEED THE OPPOSITE OF THAT [REDACTED 2026-11-05] LAW" —
the unboarded data-family era ended).

Every model a form OFFERS must board a compose arm and compose:
  1. resolution — every derived-table cover (comfyui rows) declares
     a card whose arm directory exists;
  2. phase-1 compose — the image form's members compose a real
     run-input pool from a prompt body (the editor's Run shape);
  3. the silent fallback is DEAD — an unboarded model refuses
     LOUD with "boards no action card", NEVER another lane's
     vocabulary (the "a film needs at least one shot" 400 that
     the Image card served for z-image before the boarding).

The h3 trio boards the package arm explicitly (the absence route
died with the fallback); cpp-plugin form rows own their own
compose packages (py/plugins.py bus) — asserted at the module
level.
"""

import os
import sys
from collections.abc import Iterator
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from melite_models import Model

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    """Path setup LAZILY (R5: nothing executes at import/collection —
    the same inserts the loader owns in production, mirrored here
    once per module, before the first test runs)."""
    for p in (os.path.join(REPO, "py"),
              os.path.join(REPO, "plugins", "engines", "comfyui"),
              os.path.join(
                  REPO, "plugins", "engines", "comfyui", "compose")):
        if p not in sys.path:
            sys.path.insert(0, p)
    import compose
    import editor_forms
    globals()["_compose_pkg"] = compose
    globals()["editor_forms"] = editor_forms
    yield


def _comfyui_rows() -> Iterator[tuple[str, dict[str, str | int | bool | tuple[str, ...]]]]:
    for fid, fdef in editor_forms._forms_table(REPO).items():
        if fdef.get("plugin") == "comfyui":
            yield fid, fdef


def _load_model_class(mid: str) -> "type[Model] | None":
    """The class the gateway's compose dispatch loads for mid —
    the same loader path (_coscript.model_pys + load_model_py)."""
    from melite_models import load_model_py
    from _coscript import model_pys
    for mpy in model_pys(mid):
        try:
            engine = mpy.parent.parent.parent.name
            return load_model_py(str(mpy), engine)
        except Exception:
            continue
    return None


def test_every_covered_model_resolves_a_card_arm() -> None:
    """Form covers ⊆ boarded models whose arm directory exists —
    the resolution tier, every comfyui editor form."""
    for fid, fdef in _comfyui_rows():
        for mid in fdef.get("covers") or ():
            cls = _load_model_class(mid)
            assert cls is not None, (
                "form %s covers %s but no model class loads" % (fid, mid))
            card = getattr(cls, "card", "") or ""
            assert card, (
                "form %s covers %s whose class boards no card — an "
                "offered model must board (the unboarded data-family "
                "era ended 2026-09-05)" % (fid, mid))
            assert card in _compose_pkg._CARD_DIR_BY_CARD, (
                "form %s covers %s whose card %r is not in the compose "
                "table" % (fid, mid, card))
            arm = os.path.join(
                REPO, "plugins", "engines", "comfyui", "action_cards",
                _compose_pkg._CARD_DIR_BY_CARD[card], "py", "compose.py")
            assert os.path.isfile(arm), "missing arm %s" % arm


def test_covers_membership_matches_boarding() -> None:
    """The image form's covers are exactly the models boarding its
    arms — no ghost members, no silent absentees among the image
    families the catalog serves."""
    boarded = set()
    from melite_models import scan_engine_models, Genre
    try:
        items = list(scan_engine_models(REPO).items())
    except Exception as e:
        if "refusing to alias" in str(e):
            pytest.skip("catalog scan blocked by parallel-session "
                        "duplicate-genre migration: %s" % e)
        raise
    for mid, (_p, cls) in items:
        card = getattr(cls, "card", "") or ""
        if getattr(cls, "genre", None) == Genre.IMAGE and card:
            boarded.add(mid)
    covers = set(editor_forms._forms_table(REPO)["image-gen"]["covers"])
    assert covers == boarded & covers and covers, (
        "image-gen covers %s but only %s board" % (sorted(covers),
                                                   sorted(boarded)))
    # every boarded image model is offered by SOME form (no runnable
    # model hidden from the editor)
    all_covers = set()
    for _fid, fdef in _comfyui_rows():
        all_covers.update(fdef.get("covers") or ())
    assert boarded <= all_covers, (
        "boarded image models missing from every form: %s"
        % sorted(boarded - all_covers))


def test_image_form_members_compose_phase1() -> None:
    """The compose tier: every image form member composes a run-input
    pool from the editor's Run body shape (prompt + string params) —
    the exact door that served the z-image 400 before boarding.
    The probe body is the UNIVERSAL knob set (the intersection the
    shared Run shape sends every member); per-model extras (sampler
    vocab, scheduler — ideogram serves no scheduler field) are each
    card's own gate suite's business, not the boarding contract's."""
    for mid in editor_forms._forms_table(REPO)["image-gen"]["covers"]:
        body = {"model": mid,
                "params": {"prompt": "wall boarding probe",
                           "width": "1024", "height": "1024",
                           "steps": "8", "cfg": "1.0", "seed": "-1"}}
        rc, _y, extra, err = _compose_pkg.card_compose(body, mid, "", None)
        assert rc == 0, "model %s refused phase-1: %s" % (mid, err)
        inputs = (extra or {}).get("inputs") or {}
        assert inputs.get("prompt") == "wall boarding probe", (
            "model %s composed an input pool without the prompt" % mid)


def test_image_form_members_render_phase2() -> None:
    """Phase-2: the graph actually renders for every image form
    member — a template file existing is not enough; the workflow
    must build (run-graph truth, no GPU)."""
    for mid in editor_forms._forms_table(REPO)["image-gen"]["covers"]:
        body = {"model": mid,
                "params": {"prompt": "wall boarding render",
                           "width": "768", "height": "768"}}
        rc, y, _extra, err = _compose_pkg.card_compose(
            body, mid, "run-boarding-wall", None)
        assert rc == 0, "model %s refused phase-2 render: %s" % (mid, err)
        nodes = y["nodes"] if isinstance(y, dict) else y.nodes
        assert nodes, "model %s rendered an empty node list" % mid


def test_unboarded_model_refuses_loud_never_falls_back() -> None:
    """The banned fallback is dead: a model with no card raises the
    boarding refusal naming the model — and the message carries NO
    other lane's vocabulary (the pre-boarding 400 surfaced h3's
    'a film needs at least one shot' on the Image card)."""
    from melite_cards.dsl import ValidationError
    for ghost in ("auto-detect", "flux-fill-dev", "no-such-model"):
        with pytest.raises(ValidationError) as ei:
            _compose_pkg.card_compose(
                {"model": ghost, "params": {}}, ghost, "", None)
        msg = str(ei.value)
        assert "boards no action card" in msg, (
            "unboarded %s must refuse with the boarding message, got %r"
            % (ghost, msg))
        assert ghost in msg
        for lane_word in ("film", "shot", "timeline", "window"):
            assert lane_word not in msg.lower(), (
                "the refusal for %s leaks timeline vocabulary %r — "
                "the silent fallback is back" % (ghost, msg))


def test_h3_family_boards_the_timeline_package_arm() -> None:
    """The h3 trio composes through the EXPLICIT package arm — no
    member rides an absence route (it no longer exists)."""
    for mid in ("h3-timeline", "h3", "h3-keyframe"):
        cls = _load_model_class(mid)
        assert cls is not None
        assert getattr(cls, "card", "") == "h3-timeline", (
            "%s must declare card='h3-timeline' explicitly" % mid)
    assert "h3-timeline" in _compose_pkg._CARD_DIR_BY_CARD
    assert "h3-timeline" in _compose_pkg._PACKAGE_CARDS


def test_cpp_form_plugins_own_compose_packages() -> None:
    """Non-comfyui editor rows (the cpp engine plugins) resolve
    their own compose package through the plugin bus — offered
    means runnable there too, at the module level."""
    import plugins as _plugins_bus
    for fid, fdef in editor_forms._forms_table(REPO).items():
        if fdef.get("plugin") == "comfyui":
            continue
        mod = _plugins_bus.load_compose(fdef["plugin"])
        assert mod is not None and hasattr(mod, "card_compose"), (
            "form %s (plugin %s) has no compose package with "
            "card_compose — offered means runnable" % (fid,
                                                       fdef["plugin"]))


# Row 3 LANDED (2026-09-06): covers is DERIVED — the uniform Model.card
# scan, sorted. card.models vs covers divergences that remain are the
# card's own shape (the h3 trio declares families, not a models tuple),
# equality-pinned below: shrink-only, every entry needs its reason.
# Deriving covers from card.models would drop ideogram from the image
# picker (it rides the picker while boarding ideogram4) — the scan is
# the offering truth, the models tuple is the render truth.
# PINNED DIVERGENCES (2026-09-06 ledger row 3: the derivation closed
# the table-curated ones — transfer_rig is offered by img-to-mesh and
# ideogram rides ideogram4 alone now, both by the uniform scan rule).
# What remains is the card.models-vs-scan shape (the h3 trio boards
# the PACKAGE arm — Model.card + py/emission twin compose, owned by
# test_h3_family_boards_the_timeline_package_arm); the card declares
# families, not a models tuple. These sets are equality-pinned:
# shrink-only, every entry needs its reason.
_BOARDED_NOT_OFFERED = frozenset()
_OFFERED_NOT_BOARDED_HERE = frozenset({
    ("h3-timeline", "h3-timeline"),  # the h3 trio boards the
    ("h3-timeline", "h3"),  # PACKAGE arm (Model.card +
    ("h3-timeline", "h3-keyframe"),  # py/emission twin compose —
    # test_h3_family_boards_the_timeline_package_arm owns that
    # proof); the card declares families, not a models tuple
})
# THE OPEN GAP — CLOSED 2026-09-06 by operator ruling (ALL MUST:
# every card is offered — fit 20/3d, skin 21/3d). This set stays
# EMPTY: a boarded model with no form row fails LOUD.
_BOARDED_WITH_NO_FORM_ROW = frozenset()


def _card_models() -> dict[str, set[str]]:
    """card id -> boarded model ids, read off the ActionCard classes
    (the card's own `models` tuple — the render truth)."""
    import importlib.util

    from melite_cards import ActionCard
    out: dict[str, set[str]] = {}
    root = os.path.join(REPO, "plugins", "engines", "comfyui",
                        "action_cards")
    for genre in sorted(os.listdir(root)):
        gd = os.path.join(root, genre)
        if not os.path.isdir(gd):
            continue
        for card in sorted(os.listdir(gd)):
            cp = os.path.join(gd, card, "py", "card.py")
            if not os.path.isfile(cp):
                continue
            name = "boarding_%s_%s" % (genre, card)
            name = name.replace("-", "_")
            spec = importlib.util.spec_from_file_location(name, cp)
            mod = importlib.util.module_from_spec(spec)
            sys.modules[name] = mod
            try:
                spec.loader.exec_module(mod)
            except Exception:
                continue  # UI-only cards carry no loadable surface
            for val in vars(mod).values():
                if (isinstance(val, type)
                        and issubclass(val, ActionCard)
                        and val is not ActionCard
                        and getattr(val, "id", "")):
                    mids = set()
                    for m in getattr(val, "models", None) or ():
                        mid = getattr(m, "id", None)
                        if mid:
                            mids.add(mid)
                    out.setdefault(val.id, set()).update(mids)
    return out


def test_covers_match_card_models_up_to_pinned_divergences() -> None:
    """covers == card.models except the two pinned divergences —
    the drift class derivation would have closed, closed by pin."""
    boarded: dict[str, set[str]] = {}
    for cid, mids in _card_models().items():
        boarded.setdefault(cid, set()).update(mids)
    offered: dict[str, set[str]] = {}
    for fid, fdef in _comfyui_rows():
        offered[fid] = set(fdef.get("covers") or ())
    cards = set(boarded) | set(offered)
    bno, onb = set(), set()
    for cid in cards:
        for mid in boarded.get(cid, set()) - offered.get(cid, set()):
            bno.add((cid, mid))
        for mid in offered.get(cid, set()) - boarded.get(cid, set()):
            onb.add((cid, mid))
    assert bno == _BOARDED_NOT_OFFERED | _BOARDED_WITH_NO_FORM_ROW, (
        "boarded-but-unoffered set changed: %s (want exactly %s) — "
        "a newly hidden runnable model (offer it, or pin it "
        "deliberate with its reason)" % (
            sorted(bno),
            sorted(_BOARDED_NOT_OFFERED | _BOARDED_WITH_NO_FORM_ROW)))
    assert onb == _OFFERED_NOT_BOARDED_HERE, (
        "offered-but-unboarded-here set changed: %s (want exactly "
        "%s) — a newly cross-offered model (pin it)" % (
            sorted(onb), sorted(_OFFERED_NOT_BOARDED_HERE)))
