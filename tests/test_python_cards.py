"""Python-cards parity wall — a flipped card's class fragment must equal
the yaml parser's fragment, recursively, per served family.

This is the migration's safety net (docs/plans/python-action-cards.md):
a card.py that disagrees with the yaml it replaces is a regression, not
a refactor. When the yaml parameters: block is deleted, this test pins
the class against the golden form-spec instead (same deep compare).
"""

import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))
sys.path.insert(0, os.path.join(REPO, "py"))

import editor_forms as ef                    # noqa: E402
from melite_cards import load_card_py, field_spec  # noqa: E402

PASS = FAIL = 0


def check(name, ok, note=""):
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def deep_diff(a, b, path="$"):
    """First divergence path (None when equal) — key order matters for
    'fields' arrays; dicts compare by content (the wire JSON is an
    object; the C's emission order is preserved by construction)."""
    if type(a) is not type(b):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                return "%s.%s: missing in class" % (path, k)
            if k not in b:
                return "%s.%s: missing in yaml" % (path, k)
            d = deep_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = deep_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None if a == b else "%s: %r != %r" % (path, a, b)


def main():
    card_py = os.path.join(REPO, "plugins", "engines", "comfyui",
                           "action_cards", "image-gen", "card.py")
    check("image-gen card.py loads", os.path.isfile(card_py))
    cls = load_card_py(card_py, "comfyui")
    check("card id", cls.id == "image-gen", cls.id)

    engine_dir = os.path.join(REPO, "plugins", "engines", "comfyui")
    vocab = {
        "samplers": ef._option_list(REPO, "samplers", engine_dir),
        "schedulers": ef._option_list(REPO, "schedulers", engine_dir),
    }
    check("vocab resolves", len(vocab["samplers"]) == 12
          and len(vocab["schedulers"]) == 9,
          "%d samplers / %d schedulers" % (len(vocab["samplers"]),
                                           len(vocab["schedulers"])))

    # families gate: the flip deleted image-gen's yaml parameters block —
    # the yaml parser no longer produces a fragment, so parity pins
    # against the GOLDEN form-spec (the wire the editor consumes). The
    # class fragment must equal the golden's card tail, recursively.
    model = "krea-2"
    golden = json.load(open(os.path.join(
        REPO, "tests", "golden_http", "form-spec_model_krea-2.json")))
    py_frag = field_spec(cls, model, vocab, service=golden["service"])
    want = {k: golden[k] for k in ("form", "service", "fields",
                                   "schema_groups") if k in golden}
    d = deep_diff(py_frag, want)
    check("fragment parity vs golden (%s)" % model, d is None, d or "")

    # the served route itself must serve the class fragment (round trip:
    # _card_spec loads card.py — proves the serving path is class-driven)
    served = ef._card_spec(REPO, model)
    d2 = deep_diff(served, py_frag)
    check("served fragment is class-driven", d2 is None, d2 or "")

    check("z-image gate parity",
          ef._card_spec(REPO, "z-image") is None
          and "z-image" not in tuple(cls.families_of()))

    # ── the 2026-09-02 full card flip: every flipped card pinned the
    # same way — class fragment == golden form-spec (captured from the
    # yaml-era serving BEFORE the parameters blocks died), and the
    # served route must be class-driven for each family model.
    FLIPPED = [
        ("image-edit", "comfyui", "img-edit"),
        ("h3-timeline", "comfyui", "h3-timeline"),
        ("tts", "audio-cpp", "qwen3-tts"),
        ("voice-lock", "audio-cpp", "qwen3-tts-voicedesign"),
        ("music", "audio-cpp", "music3"),
    ]
    for cid, engine, model in FLIPPED:
        cpath = os.path.join(REPO, "plugins", "engines", engine, "cards",
                             cid, "card.py")
        fcls = load_card_py(cpath, engine)
        check("%s id" % cid, fcls.id == cid, fcls.id)
        gpath = os.path.join(REPO, "tests", "golden_http",
                             "form-spec_model_%s.json" % model)
        gold = json.load(open(gpath))
        edir = os.path.join(REPO, "plugins", "engines", engine)
        fvocab = {
            "samplers": ef._option_list(REPO, "samplers", edir),
            "schedulers": ef._option_list(REPO, "schedulers", edir),
        }
        frag = field_spec(fcls, model, fvocab, service=gold["service"])
        want = {k: gold[k] for k in ("form", "service", "fields",
                                     "schema_groups") if k in gold}
        dd = deep_diff(frag, want)
        check("%s fragment parity vs golden (%s)" % (cid, model),
              dd is None, dd or "")
        served = ef._card_spec(REPO, model)
        dd2 = deep_diff(served, frag)
        check("%s served fragment is class-driven" % cid,
              dd2 is None, dd2 or "")

    # cross-validation: models declaring a card attr must keep defaults
    # inside the owning card's field domains (the killer feature, live
    # across engines now that both sides are python)
    import catalog as _cat
    from melite_models import (scan_engine_models,
                               validate_against_cards)
    models = {mid: cls for mid, (_p, cls)
              in scan_engine_models(REPO).items()}
    cards = {}
    for cid, engine, model in [("image-gen", "comfyui", "krea-2")] + FLIPPED:
        cards[cid] = load_card_py(os.path.join(
            REPO, "plugins", "engines", engine, "cards", cid, "card.py"),
            engine)
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location(
        "audio_compose", os.path.join(
            REPO, "plugins", "engines", "audio-cpp", "engines", "audio",
            "compose.py"))
    _ac = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_ac)
    pairs = validate_against_cards(models, cards,
                                   engine_truth=_ac.ENGINE_TRUTH_KEYS)
    check("cross-validation pairs (krea-2, img-edit, music3)",
          pairs == [("img-edit", "image-edit"),
                    ("krea-2", "image-gen"),
                    ("music3", "music")], repr(pairs))

    # boot-loud validation contracts
    from melite_cards import ActionCard, ValidationError, Number, Select, VocabRef

    try:
        Number(label="x", min=10, max=1)
        check("bad range refused", False, "no refusal")
    except ValidationError:
        check("bad range refused", True)
    try:
        Number(label="x", step=0)
        check("zero step refused", False, "no refusal")
    except ValidationError:
        check("zero step refused", True)

    class _BadCard(ActionCard):
        id = "bad-card"
        f = Select(label="x", options=VocabRef("$nope"))

    try:
        field_spec(_BadCard, "m", vocab)
        check("unresolved vocab refused", False, "no refusal")
    except ValidationError:
        check("unresolved vocab refused", True)

    # two-SSOTs refusal: a card dir with BOTH card.py and a yaml
    # parameters: block never serves (loud, before the wire).
    import tempfile
    import editor_forms as _ef
    with tempfile.TemporaryDirectory() as td:
        cdir = os.path.join(td, "engine", "cards", "duo")
        os.makedirs(cdir)
        open(os.path.join(cdir, "card.py"), "w").write(
            "from melite_cards import ActionCard, Text\n\n\n"
            "class DuoCard(ActionCard):\n    id = 'image-gen'\n"
            "    families = ('krea-2',)\n"
            "    t = Text(label='t')\n")
        yml = os.path.join(cdir, "card.yaml")
        open(yml, "w").write(
            "card:\n  id: image-gen\nfamilies:\n  - id: krea-2\n"
            "parameters:\n  t:\n    type: text\n")
        orig_iter = _ef._iter_plugin_engines
        _ef._iter_plugin_engines = lambda root: [("engine",
                                                  os.path.join(td, "engine"))]
        try:
            try:
                _ef._card_spec(td, "krea-2")
                check("two-SSOTs refused", False, "no refusal")
            except _ef.ValidationError:
                check("two-SSOTs refused", True)
        finally:
            _ef._iter_plugin_engines = orig_iter

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
