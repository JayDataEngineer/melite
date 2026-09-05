"""test_card_boarding — OFFERED MEANS RUNNABLE (operator order
2026-09-05, verbatim: "i NEED THE OPPOSITE OF THAT [REDACTED 2026-11-05] LAW" —
the unboarded data-family era ended).

Every model a form OFFERS must board a compose arm and compose:
  1. resolution — every _FORMS_TABLE cover (comfyui rows) declares
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

import pytest

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))


@pytest.fixture(scope="module", autouse=True)
def _estate_paths():
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


def _comfyui_rows():
    for fid, fdef in editor_forms._FORMS_TABLE.items():
        if fdef.get("plugin") == "comfyui":
            yield fid, fdef


def _load_model_class(mid):
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


def test_every_covered_model_resolves_a_card_arm():
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


def test_covers_membership_matches_boarding():
    """The image form's covers are exactly the models boarding its
    arms — no ghost members, no silent absentees among the image
    families the catalog serves."""
    boarded = set()
    from melite_models import scan_engine_models
    for mid, (_p, cls) in scan_engine_models(REPO).items():
        card = getattr(cls, "card", "") or ""
        if getattr(cls, "genre", "") == "image" and card:
            boarded.add(mid)
    covers = set(editor_forms._FORMS_TABLE["image-gen"]["covers"])
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


def test_image_form_members_compose_phase1():
    """The compose tier: every image form member composes a run-input
    pool from the editor's Run body shape (prompt + string params) —
    the exact door that served the z-image 400 before boarding."""
    for mid in editor_forms._FORMS_TABLE["image-gen"]["covers"]:
        body = {"model": mid,
                "params": {"prompt": "wall boarding probe",
                           "width": "1024", "height": "1024",
                           "steps": "8", "cfg": "1.0", "seed": "-1",
                           "sampler": "euler", "scheduler": "simple"}}
        rc, _y, extra, err = _compose_pkg.card_compose(body, mid, "", None)
        assert rc == 0, "model %s refused phase-1: %s" % (mid, err)
        inputs = (extra or {}).get("inputs") or {}
        assert inputs.get("prompt") == "wall boarding probe", (
            "model %s composed an input pool without the prompt" % mid)


def test_image_form_members_render_phase2():
    """Phase-2: the graph actually renders for every image form
    member — a template file existing is not enough; the workflow
    must build (run-graph truth, no GPU)."""
    for mid in editor_forms._FORMS_TABLE["image-gen"]["covers"]:
        body = {"model": mid,
                "params": {"prompt": "wall boarding render",
                           "width": "768", "height": "768"}}
        rc, y, _extra, err = _compose_pkg.card_compose(
            body, mid, "run-boarding-wall", None)
        assert rc == 0, "model %s refused phase-2 render: %s" % (mid, err)
        nodes = y["nodes"] if isinstance(y, dict) else y.nodes
        assert nodes, "model %s rendered an empty node list" % mid


def test_unboarded_model_refuses_loud_never_falls_back():
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


def test_h3_family_boards_the_timeline_package_arm():
    """The h3 trio composes through the EXPLICIT package arm — no
    member rides an absence route (it no longer exists)."""
    for mid in ("h3-timeline", "h3", "h3-keyframe"):
        cls = _load_model_class(mid)
        assert cls is not None
        assert getattr(cls, "card", "") == "h3-timeline", (
            "%s must declare card='h3-timeline' explicitly" % mid)
    assert "h3-timeline" in _compose_pkg._CARD_DIR_BY_CARD
    assert "h3-timeline" in _compose_pkg._PACKAGE_CARDS


def test_cpp_form_plugins_own_compose_packages():
    """Non-comfyui editor rows (the cpp engine plugins) resolve
    their own compose package through the plugin bus — offered
    means runnable there too, at the module level."""
    import plugins as _plugins_bus
    for fid, fdef in editor_forms._FORMS_TABLE.items():
        if fdef.get("plugin") == "comfyui":
            continue
        mod = _plugins_bus.load_compose(fdef["plugin"])
        assert mod is not None and hasattr(mod, "card_compose"), (
            "form %s (plugin %s) has no compose package with "
            "card_compose — offered means runnable" % (fid,
                                                       fdef["plugin"]))
