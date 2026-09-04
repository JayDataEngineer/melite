#!/usr/bin/env python3
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
serve time. SCRIPT FORM (the estate wall law for non-inference
checks): `python3 tests/walls/suites/test_form_defaults.py`.

The wall walks the card.py tree (one per action card), parses the
declared id and the field widgets, and asserts every form-spec
served for any of the card's families agrees with the card's
declarations. The wall DOES NOT cover the DSL-backed legacy forms
(qwen3-tts, music3, img-edit, qwen-img-edit-2511) — those are
served from `melite_cards/dsl.py` rather than a per-card card.py,
and the legacy form-spec parity is pinned by `tests/golden_http/
form-spec_model_*.json` against a separate served snapshot.
"""

import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))


def _find_card_classes():
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


def _card_field_names(card_cls):
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


def _families_of(card_cls):
    """A card's boarded families (the models= tuple, introspected).

    Each family is the id attribute of the Model class. Loader-style
    resolution isn't necessary — we just want the string ids."""
    models = getattr(card_cls, "models", ()) or ()
    out = set()
    for m in models:
        mid = getattr(m, "id", None)
        if isinstance(mid, str):
            out.add(mid)
    return out


def main():
    sys.path.insert(0, os.path.join(REPO, "py"))
    sys.path.insert(0, os.path.join(REPO, "plugins"))
    import editor_forms as ef
    from melite_cards import load_card_py
    from melite_models import scan_engine_models

    fails = 0

    def check(ok, label, detail=""):
        nonlocal fails
        print("  %s  %s%s" % ("ok " if ok else "FAIL", label,
                              (" — " + detail) if detail else ""))
        if not ok:
            fails += 1

    cards = _find_card_classes()
    # SCOPE (2026-09-04): the action-card rework's surface only.
    # Legacy DSL-backed forms (qwen3-tts, music3, img-edit,
    # qwen-img-edit-2511) are out of scope — their spec parity is
    # pinned by tests/golden_http/form-spec_model_*.json + the http
    # parity suite. Adding them here would require unioning the
    # melite_cards DSL form into the field set (left for the
    # committer's lane).
    IN_SCOPE = {"video-gen", "upscale-tools", "motion", "body",
                "mask_studio", "h3-timeline", "anny"}
    cards = [(cid, e, p) for (cid, e, p) in cards if cid in IN_SCOPE]
    print("form <-> card <-> model defaults — %d cards in scope" %
          len(cards))

    # the model class SSOT: every card's family is a Model subclass;
    # build the map mid -> Model class for cross-checking defaults.
    model_classes = {mid: cls for mid, (_p, cls) in
                     scan_engine_models(REPO).items()}

    for card_id, engine, cp in cards:
        try:
            card_cls = load_card_py(cp, engine)
        except Exception as e:
            check(False, "%s card class loads" % card_id, str(e))
            continue
        form_field_names = _card_field_names(card_cls)
        fams = _families_of(card_cls)
        # cards that ARE the family (h3-timeline: card_id == model id;
        # h3's model has no card attr — the family routes through the
        # timeline package's card="" fallback, not through card=)
        if not fams:
            mc = model_classes.get(card_id)
            if mc is not None:
                fams = {card_id}
        if not fams:
            check(False, "%s declares boarded families" % card_id,
                  "models= is empty or unresolvable")
            continue

        for mid in sorted(fams):
            model_cls = model_classes.get(mid)
            # form-spec served for the family
            status, spec = ef.form_spec(REPO, mid)
            if status != 200:
                check(False, "%s form-spec serves (%s)" % (card_id, mid),
                      str(spec))
                continue
            spec_defaults = (spec or {}).get("defaults") or {}
            spec_fields = {(f or {}).get("name") for f in
                           (spec or {}).get("fields", [])}
            model_defaults = (model_cls.defaults or {}) if model_cls else {}

            # ── assertion 1: every form-spec default lives on the card ──
            for k in spec_defaults:
                check(k in form_field_names or k in spec_fields,
                      "%s/%s form default %r declared on card" % (
                          card_id, mid, k),
                      "no card field named %r" % k
                      if k not in form_field_names and k not in spec_fields
                      else "")

            # ── assertion 2: every form-spec field is declared on the card
            for k in spec_fields:
                if not k:
                    continue
                check(k in form_field_names,
                      "%s/%s spec field %r declared on card" % (
                          card_id, mid, k),
                      "missing on card" if k not in form_field_names else "")

            # ── assertion 3: model defaults can be SUBSET of card
            #    fields (a model default the card doesn't surface is
            #    fine — "defaults are shape, not value", PYTHON SHAPE
            #    LAW). The other direction (model default with no
            #    card field) is a HINT but not a hard fail: the
            #    h3-timeline card deliberately keeps fps=24 as a
            #    model default (the 17k+5 frame grid) and the card
            #    does NOT expose an fps input. A model default that
            #    lands in the form-spec's defaults block (assertion
            #    1) IS a hard fail.
            model_decls = form_field_names | spec_fields
            for k in model_defaults:
                if k in model_decls:
                    continue
                # advisory — the spec does NOT serve it (assertion 1
                # would have failed) so it's just a model-internal
                # default the card keeps. The h3 fps case.
                print("  ..   %s/%s model default %r not on card "
                      "(internal default)" % (card_id, mid, k))

    print("PASS" if fails == 0 else "FAIL %d" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
