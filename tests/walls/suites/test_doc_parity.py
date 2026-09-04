#!/usr/bin/env python3
"""test_doc_parity.py — typed step docs: the knob SSOT cross-validation
(typed-step-docs plan, rung 2).

Pins, all offline (pinned object_info, no GPU, no network):
  1. REGISTRY: every registered renderer family carries a pydantic doc
     class — no new raw-dict renderers may ship.
  2. KNOB SSOT (h3): every card_knobs inject address on the model class
     is a valid H3WindowInject alias (or a documented GUI-era pin
     prefix) — the knob map can never drift from the doc schema.
  3. CARD ↔ DOC (image-gen / image-edit): every doc knob is speakable
     on the card surface (doc fields ⊆ card fields, run-scoped
     filename_prefix excepted).
  4. WIRE FORMS: the renderers bake the run-inputs SSOT string forms
     ("%d" / "%.0f" / "%g") — the parity the flip acceptance recorded.

Run: python3 tests/walls/suites/test_doc_parity.py   (exit 0 = pass)
"""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
PLUGIN = REPO / "plugins" / "engines" / "comfyui"
sys.path.insert(0, str(PLUGIN / "compose"))
sys.path.insert(0, str(REPO / "py"))

import _coscript  # noqa: E402
from co_script import registry, render  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# ── load the four CARD renderer modules (self-registering; models
#    don't render — cards do) ────────────────────────────────────────────
_CARD_DIRS = [
    PLUGIN / "action_cards" / "image" / "image-gen",
    PLUGIN / "action_cards" / "image" / "image-edit",
    PLUGIN / "action_cards" / "audio" / "music",
    PLUGIN / "action_cards" / "video" / "h3-timeline",
]
_MODEL_DIRS = [
    PLUGIN / "models" / "image" / "krea-2",
    PLUGIN / "models" / "image" / "img-edit",
    PLUGIN / "models" / "audio" / "music3",
    PLUGIN / "models" / "video" / "h3-timeline",
]
_DOCS = {}
for d in _CARD_DIRS:
    mod = _coscript.load_card_renderer(d)
    assert mod is not None, "renderer module missing: %s" % d

# 1. every family carries a doc class ───────────────────────────────────
for name, (fn, doc) in sorted(registry().items()):
    check("registry: %s has doc class" % name, doc is not None,
          "registered without doc= — raw-dict renderers are banned")

# 2. h3 knob SSOT: card_knobs ⊆ doc aliases (or pin prefixes) ──────────
from melite_models import load_model_py  # noqa: E402

h3_cls = load_model_py(str(_MODEL_DIRS[3] / "model.py"), "comfyui")
h3_doc = registry()["h3_window"][1]
inject_model = h3_doc.model_fields["inject"].annotation
_PIN_PREFIXES = ("PlagueKindBundleIn.0.", "UnifiedResizeImageMask.", "cc_pin.")
aliases = set()
for f in inject_model.model_fields.values():
    a = getattr(f, "validation_alias", None) or f.alias
    if a:
        aliases.add(a)
for row in getattr(h3_cls, "card_knobs", ()):
    addr = row.get("inject", "")
    ok = addr in aliases or any(addr.startswith(p) for p in _PIN_PREFIXES)
    check("h3 knob %s -> %s" % (row.get("card"), addr), ok,
          "not a H3WindowInject alias (knob map drifted from the doc)")

# 3. card surface covers the doc knobs ─────────────────────────────────
from melite_cards import load_card_py  # noqa: E402

_CARD_DOCS = [
    (PLUGIN / "action_cards" / "image" / "image-gen" / "py" / "card.py", "image_t2i", ()),
    # 'shift' is a renderer-internal knob (ModelSamplingAuraFlow template
    # value the C port read from params but the card surface never
    # offered — it rides the 1.0 default). Review round: surface it on
    # the card or retire it from the doc.
    (PLUGIN / "action_cards" / "image" / "image-edit" / "py" / "card.py", "image_edit",
     ("shift",)),
]
for card_path, family, internal in _CARD_DOCS:
    card = load_card_py(str(card_path), "comfyui")
    card_fields = {f.name for f in card._fields_}
    doc = registry()[family][1]
    for fname in doc.model_fields:
        if fname == "filename_prefix" or fname in internal:
            continue      # run-scoped / renderer-internal, not card knobs
        check("%s: doc knob %r on card" % (family, fname),
              fname in card_fields,
              "doc field absent from %s card surface" % card.id)

# 4. wire-form spot checks (run-inputs SSOT strings) ────────────────────


def _node(graph, cls):
    for n in graph.values():
        if n.get("class_type") == cls:
            return n["inputs"]
    raise AssertionError("no %s node in graph" % cls)


from _coscript import load_model_cls  # noqa: E402
_KREA2 = load_model_cls("krea-2")
_IMGEDIT = load_model_cls("img-edit")
_MUSIC3 = load_model_cls("music3")


g = render("image_t2i", {"prompt": "a red fox"}, model=_KREA2)
check("image_t2i wire: seed '%d'", _node(g, "KSampler")["seed"] == "42",
      repr(_node(g, "KSampler")["seed"]))
check("image_t2i wire: steps '%.0f'", _node(g, "KSampler")["steps"] == "8",
      repr(_node(g, "KSampler")["steps"]))
check("image_t2i wire: cfg '%g'", _node(g, "KSampler")["cfg"] == "4.5",
      repr(_node(g, "KSampler")["cfg"]))
check("image_t2i wire: width '%.0f'",
      _node(g, "EmptySD3LatentImage")["width"] == "1024",
      repr(_node(g, "EmptySD3LatentImage")["width"]))

g = render("image_edit", {"prompt": "a red fox", "input_image": "a.png"}, model=_IMGEDIT)
check("image_edit wire: shift '%g'",
      _node(g, "ModelSamplingAuraFlow")["shift"] == "1",
      repr(_node(g, "ModelSamplingAuraFlow")["shift"]))
check("image_edit wire: steps '%.0f'",
      _node(g, "KSampler")["steps"] == "4",
      repr(_node(g, "KSampler")["steps"]))

g = render("music_t1", {"caption": "a song"}, model=_MUSIC3)
check("music_t1 wire: seconds '%.0f'",
      _node(g, "EmptyMiniMaxMusic3LatentAudio")["seconds"] == "30",
      repr(_node(g, "EmptyMiniMaxMusic3LatentAudio")["seconds"]))
check("music_t1 wire: seed '%d'",
      _node(g, "KSampler")["seed"] == "42",
      repr(_node(g, "KSampler")["seed"]))

# ── report ──────────────────────────────────────────────────────────────
print()
for n in PASS:
    print("  ok   %s" % n)
for n in FAIL:
    print("  FAIL %s" % n)
print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
