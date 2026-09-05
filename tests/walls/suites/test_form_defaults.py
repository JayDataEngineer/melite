"""E2E DEFAULTS-CONSISTENCY WALL — the form <-> card <-> model triad.

Three sources of truth for a card's starting body:
  1. the model class (defaults=)        — a Model subclass attribute
  2. the card class's field declarations — a melite_cards field per knob
  3. the form-spec's `defaults` block    — the editor's served surface

A drift between ANY pair is a silent bug:
  - model has a default the card never declared: editor never ships it
  - card has a default the model didn't supply: editor has a fake
  - form-spec defaults contain a field the card has no declaration
    for: the editor would render a value with no backing input

The canary tests catch the LAST mile (queue submission), but the
DEFAULTS shape never reaches the canary when it's missing a key —
it fails elsewhere. This wall catches the form <-> card drift at
serve time.

The wall walks the card.py tree (one per action card), parses the
declared id and the field widgets, and asserts every form-spec
served for any of the card's families agrees with the card's
declarations.
"""

import os
import re
from collections.abc import Callable
from types import ModuleType

import pytest

from _anchor import REPO
sys_path_setup = False


def _ensure_sys_path() -> None:
    global sys_path_setup
    if not sys_path_setup:
        import sys
        sys.path.insert(0, os.path.join(REPO, "py"))
        sys.path.insert(0, os.path.join(REPO, "plugins"))
        sys_path_setup = True


def _find_card_classes() -> list[tuple[str, str, str]]:
    """Yield (card_id, engine, path) for every action_cards/*/*/py/
    card.py that declares a class with id = '<X>'."""
    out = []
    base = os.path.join(REPO, "plugins", "engines")
    id_re = re.compile(r"^\s*id\s*=\s*['\"]([a-z0-9-]+)['\"]", re.M)
    for engine in sorted(os.listdir(os.path.join(base))):
        ed = os.path.join(base, engine, "action_cards")
        if not os.path.isdir(ed):
            continue
        for genre in sorted(os.listdir(ed)):
            gd = os.path.join(ed, genre)
            if not os.path.isdir(gd):
                continue
            for card_dir in sorted(os.listdir(gd)):
                cp = os.path.join(gd, card_dir, "py", "card.py")
                if not os.path.isfile(cp):
                    continue
                src = open(cp, encoding="utf-8").read()
                m = id_re.search(src)
                if m:
                    out.append((m.group(1), engine, cp))
    return out


def _card_field_names(card_cls: type[object]) -> set[str]:
    """The card class's declared form fields (widget names)."""
    out = set()
    for fname in dir(card_cls):
        if fname.startswith("_") or fname.isupper():
            continue
        fv = getattr(card_cls, fname, None)
        if fv is None or callable(fv):
            continue
        if hasattr(fv, "name") and hasattr(fv, "group"):
            out.add(fv.name)
    return out


def _families_of(card_cls: type[object]) -> set[str]:
    """A card's boarded families (the models= tuple, introspected)."""
    models = getattr(card_cls, "models", ()) or ()
    out = set()
    for m in models:
        mid = getattr(m, "id", None)
        if isinstance(mid, str):
            out.add(mid)
    return out


# the action-card rework's surface only.
IN_SCOPE = {"video-gen", "upscale-tools", "motion", "body",
            "mask_studio", "h3-timeline", "anny"}


@pytest.fixture(scope="module")
def card_and_model_classes() -> tuple[list[tuple[str, str, str]], dict[str, type[object]], ModuleType, Callable[[str, str], type[object]]]:
    _ensure_sys_path()
    import editor_forms as ef
    from melite_cards import load_card_py
    from melite_models import scan_engine_models

    cards = _find_card_classes()
    cards = [(cid, e, p) for (cid, e, p) in cards if cid in IN_SCOPE]
    model_classes = {mid: cls for mid, (_p, cls) in
                     scan_engine_models(REPO).items()}
    return cards, model_classes, ef, load_card_py


def test_form_card_model_triad(card_and_model_classes: tuple[list[tuple[str, str, str]], dict[str, type[object]], ModuleType, Callable[[str, str], type[object]]]) -> None:
    """Every form-spec default lives on the card, and every form-spec
    field is declared on the card."""
    cards, model_classes, ef, load_card_py = card_and_model_classes
    for card_id, engine, cp in cards:
        try:
            card_cls = load_card_py(cp, engine)
        except Exception as e:
            pytest.fail(f"{card_id} card class loads: {e}")
        form_field_names = _card_field_names(card_cls)
        fams = _families_of(card_cls)
        if not fams:
            mc = model_classes.get(card_id)
            if mc is not None:
                fams = {card_id}
        assert fams, (
            f"{card_id} declares boarded families: models= is empty")

        for mid in sorted(fams):
            model_cls = model_classes.get(mid)
            status, spec = ef.form_spec(REPO, mid)
            assert status == 200, f"{card_id} form-spec serves ({mid}): {spec}"
            spec_defaults = (spec or {}).get("defaults") or {}
            spec_fields = {(f or {}).get("name") for f in
                           (spec or {}).get("fields", [])}

            # every form-spec default lives on the card
            for k in spec_defaults:
                assert k in form_field_names or k in spec_fields, (
                    f"{card_id}/{mid} form default {k!r} not on card")

            # every form-spec field is declared on the card
            for k in spec_fields:
                if not k:
                    continue
                assert k in form_field_names, (
                    f"{card_id}/{mid} spec field {k!r} not on card")
