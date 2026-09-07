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
  4. NATIVE WIRE FORMS (render-kit stroke): the renderers bake the
     doc's TYPED values, never format strings.

Run: python3 tests/walls/suites/test_doc_parity.py   (exit 0 = pass)
"""

import sys
from pathlib import Path

from _anchor import REPO
PLUGIN = REPO / "plugins" / "engines" / "comfyui"
sys.path.insert(0, str(PLUGIN / "compose"))

import _coscript  # noqa: E402
from co_script import registry, render  # noqa: E402

PASS, FAIL = [], []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# ── load the CARD renderer modules (self-registering; models
#    don't render — cards do) ────────────────────────────────────────────
_CARD_DIRS = [
    PLUGIN / "action_cards" / "3d" / "anny",
    PLUGIN / "action_cards" / "3d" / "img_to_mesh",
    PLUGIN / "action_cards" / "audio" / "music",
    PLUGIN / "action_cards" / "audio" / "sfx",
    PLUGIN / "action_cards" / "audio" / "tts",
    PLUGIN / "action_cards" / "audio" / "voice-lock",
    PLUGIN / "action_cards" / "image" / "ideogram4",
    PLUGIN / "action_cards" / "image" / "image-edit",
    PLUGIN / "action_cards" / "image" / "image-gen",
    PLUGIN / "action_cards" / "image" / "input_prep",
    PLUGIN / "action_cards" / "image" / "mask_studio",
    PLUGIN / "action_cards" / "image" / "tagger",
    PLUGIN / "action_cards" / "image" / "upscale-tools",
    PLUGIN / "action_cards" / "motion" / "motion",
    PLUGIN / "action_cards" / "video" / "h3-timeline",
    PLUGIN / "action_cards" / "video" / "video-gen",
]
_MODEL_DIRS = [
    PLUGIN / "models" / "image" / "krea-2",
    # (2026-09-05 image-edit rework) `img-edit` retired — survivor.
    PLUGIN / "models" / "image" / "qwen-img-edit-2511",
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
from melite_cards.validators import JsonDict, JsonValue  # noqa: E402
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
    # 'input_image' is the renderer-internal step_doc key (compose maps
    # the wire anchor image1 onto it; the card surface speaks image1 —
    # 2026-09-06 surface standard. NOT a card knob, never served).
    # 'shift' was HERE as the review-round exemption (surface it or
    # retire it) — the 2026-09-06 audit retired it from the doc (ghost
    # knob: no card field, no family default; the AuraFlow node rides
    # the fixed template-pinned 1.0, graph byte-identical).
    (PLUGIN / "action_cards" / "image" / "image-edit" / "py" / "card.py", "image_edit",
     ("input_image",)),
    # tagger (2026-09-06): all four arms' doc knobs speakable on the
    # card (filename_prefix run-scoped, input_image renderer-internal).
    (PLUGIN / "action_cards" / "image" / "tagger" / "py" / "card.py", "wd14_t1",
     ("input_image",)),
    (PLUGIN / "action_cards" / "image" / "tagger" / "py" / "card.py", "joytag_t1",
     ("input_image",)),
    (PLUGIN / "action_cards" / "image" / "tagger" / "py" / "card.py", "florence2_t1",
     ("input_image",)),
    (PLUGIN / "action_cards" / "image" / "tagger" / "py" / "card.py", "joycaption_t1",
     ("input_image",)),
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


def _node(graph: dict[str, dict[str, str | dict[str, str]]], cls: str) -> dict[str, str]:
    for n in graph.values():
        if n.get("class_type") == cls:
            return n["inputs"]
    raise AssertionError("no %s node in graph" % cls)


from _coscript import load_model_cls  # noqa: E402
_KREA2 = load_model_cls("krea-2")
# (2026-09-05 image-edit rework) `img-edit` retired — survivor.
_IMGEDIT = load_model_cls("qwen-img-edit-2511")
_MUSIC3 = load_model_cls("music3")


# ── THE NODE INTERFACE WALL (2026-09-05 compile-time incident) ──
# Operator order, verbatim: "WE HAVE COMFYUI-SCRIPT THAT CAN
# LITERALLY GIVE YOU THE PARAMETER INTERFACE". It can: co_script
# loads the PINNED object_info (every node's INPUT_TYPES — INT,
# FLOAT, STRING, BOOLEAN, combos, model wires) into comfy-script's
# registry at render time. comfy-script does NOT enforce input types
# at construction (verbatim passthrough) and ComfyUI's execution is
# lax (numeric strings parse) — so a mistyped graph RUNS and the lie
# survives until a strict consumer. This wall enforces the interface
# directly: every scalar a renderer emits must match the
# pin's declared input type for that node+key (links and model-wire
# outputs skip — they are references, not scalars). Estate-wide:
# every rendered graph below is measured, not just the edit lane
# where the incident bit.
def _pin_inputs() -> dict[str, JsonValue]:
    from co_script import nodes as _n
    oi, _sha = _n._load_pin_dict()
    return oi


_PIN = _pin_inputs()
_IFACE_ATOM = {"INT": "int", "FLOAT": "float", "STRING": "str",
               "BOOLEAN": "bool"}


def _iface_mismatches(graph: dict[str, JsonDict]) -> list[str]:
    bad = []
    for nid, node in graph.items():
        cls = node.get("class_type")
        spec = ((_PIN.get(cls) or {}).get("input") or {}).get(
            "required") or {}
        for k, v in (node.get("inputs") or {}).items():
            decl = spec.get(k)
            if not decl or not isinstance(decl, list):
                continue
            if not isinstance(decl[0], str):
                continue  # combo options list — not an atom
            want = _IFACE_ATOM.get(decl[0])
            if want is None:
                continue  # combos / model wires / links — not scalars
            if isinstance(v, (dict, list)):
                continue  # link refs / vectors — not scalars
            got = ("bool" if isinstance(v, bool)
                   else "int" if isinstance(v, int)
                   else "float" if isinstance(v, float)
                   else "str" if isinstance(v, str)
                   else type(v).__name__)
            ok = (got == want) or (want == "float" and got == "int")
            if not ok:
                bad.append("%s[%s].%s: interface %s, emitted %s %r"
                           % (cls, nid, k, decl[0], got, v))
    return bad


g = render("image_t2i", {"prompt": "a red fox"}, model=_KREA2)
# NATIVE NODE TYPES (2026-09-05 render-kit stroke): the doc's typed
# values ride unchanged — the string-format era ("%d"/"%.0f"/"%g")
# is dead on every lane, pinned here per knob (the interface wall
# below owns the general law; these pins name the incident's knots).
check("image_t2i wire: seed native int",
      _node(g, "KSampler")["seed"] == 42
      and type(_node(g, "KSampler")["seed"]) is int,
      repr(_node(g, "KSampler")["seed"]))
check("image_t2i wire: steps native int",
      _node(g, "KSampler")["steps"] == 8
      and type(_node(g, "KSampler")["steps"]) is int,
      repr(_node(g, "KSampler")["steps"]))
check("image_t2i wire: cfg native float",
      _node(g, "KSampler")["cfg"] == 4.5
      and isinstance(_node(g, "KSampler")["cfg"], float),
      repr(_node(g, "KSampler")["cfg"]))
check("image_t2i wire: width native int",
      _node(g, "EmptySD3LatentImage")["width"] == 1024
      and type(_node(g, "EmptySD3LatentImage")["width"]) is int,
      repr(_node(g, "EmptySD3LatentImage")["width"]))
check("image_t2i graph matches the pinned node interface",
      _iface_mismatches(g) == [], _iface_mismatches(g))

# row 3 (8eca726e): the doc speaks card vocabulary — `image1`,
# the retired `input_image` alias (schema comment documents it)
g = render("image_edit", {"prompt": "a red fox", "image1": "a.png"}, model=_IMGEDIT)
# NATIVE NODE TYPES (2026-09-05 compile-time incident): the doc's
# ints/floats ride unchanged — the pinned object_info declares
# shift FLOAT, seed/steps INT, cfg FLOAT (the "%g"/"%d" wire-string
# era died on this lane; t2i/music keep theirs — other strokes).
check("image_edit wire: shift native float",
      _node(g, "ModelSamplingAuraFlow")["shift"] == 1.0
      and isinstance(_node(g, "ModelSamplingAuraFlow")["shift"], float),
      repr(_node(g, "ModelSamplingAuraFlow")["shift"]))
check("image_edit wire: seed/steps native int, cfg native float",
      _node(g, "KSampler")["seed"] == 42
      and type(_node(g, "KSampler")["seed"]) is int
      and _node(g, "KSampler")["steps"] == 4
      and type(_node(g, "KSampler")["steps"]) is int
      and _node(g, "KSampler")["cfg"] == 1.0
      and isinstance(_node(g, "KSampler")["cfg"], float),
      repr(_node(g, "KSampler")))

# (interface wall moved above the t2i block — estate-wide measure)

# ── TAGGER ARMS (2026-09-06 tagger-card stroke) ──
# Four prompt-inversion families, one card. The load-bearing knots
# this stroke live-proved: the caption OUTPUT INDEX (florence2 = 2,
# joycaption = 1 — SaveText must link the caption STRING, never the
# query / IMAGE / MASK / JSON), REQUIRED-with-default inputs riding
# the graph (fill_mask, memory_mode, gen params — stripped = server
# refusal), and the live node names (WD14Tagger|pysssss, CXH_JoyTag,
# JJC_-prefixed JoyCaption).
_TAGGER_MODELS = {m: load_model_cls(m) for m in (
    "wd14", "joytag", "florence2", "joycaption")}

g = render("wd14_t1", {"input_image": "a.png"}, model=_TAGGER_MODELS["wd14"])
check("wd14 wire: seven live knobs, native types",
      _node(g, "WD14Tagger|pysssss") == {
          "model": "wd-v1-4-moat-tagger-v2", "threshold": 0.35,
          "character_threshold": 0.85, "exclude_tags": "",
          "replace_underscore": False, "trailing_comma": False,
          "image": ["LoadImage.0", 0]},
      repr(_node(g, "WD14Tagger|pysssss")))
check("wd14 wire: SaveText links the tags output",
      _node(g, "SaveText")["text"] == ["WD14Tagger|pysssss.0", 0],
      repr(_node(g, "SaveText")["text"]))

g = render("joytag_t1", {"input_image": "a.png"}, model=_TAGGER_MODELS["joytag"])
# (node-side names: comfy-script maps the renderer's snake_case kwargs
# onto the node's declared inputs — THRESHOLD/addTag/removeTag. The
# graph above is what ComfyUI validates; the live run proved it.)
check("joytag wire: threshold native float, tag strings",
      _node(g, "CXH_JoyTag") == {"THRESHOLD": 0.2, "addTag": "",
                                  "removeTag": "",
                                  "image": ["LoadImage.0", 0]},
      repr(_node(g, "CXH_JoyTag")))
check("joytag wire: SaveText links the tags output",
      _node(g, "SaveText")["text"] == ["CXH_JoyTag.0", 0],
      repr(_node(g, "SaveText")["text"]))

g = render("florence2_t1", {"input_image": "a.png"},
           model=_TAGGER_MODELS["florence2"])
check("florence2 wire: loader checkpoint + fp16 fixed",
      _node(g, "DownloadAndLoadFlorence2Model") == {
          "model": "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
          "precision": "fp16"},
      repr(_node(g, "DownloadAndLoadFlorence2Model")))
check("florence2 wire: task + fill_mask rides (required)",
      _node(g, "Florence2Run")["task"] == "more_detailed_caption"
      and _node(g, "Florence2Run")["fill_mask"] is True
      and _node(g, "Florence2Run")["text_input"] == "",
      repr(_node(g, "Florence2Run")))
check("florence2 wire: SaveText links the caption (index 2)",
      _node(g, "SaveText")["text"] == ["Florence2Run.0", 2],
      repr(_node(g, "SaveText")["text"]))

g = render("joycaption_t1", {"input_image": "a.png"},
           model=_TAGGER_MODELS["joycaption"])
check("joycaption wire: loader checkpoint + Default profile rides",
      _node(g, "JJC_DownloadAndLoadJoyCaptionModel") == {
          "model": "fancyfeast/llama-joycaption-beta-one-hf-llava",
          "memory_mode": "Default", "keep_loaded": False},
      repr(_node(g, "JJC_DownloadAndLoadJoyCaptionModel")))
check("joycaption wire: templates + gen params native types",
      _node(g, "JJC_JoyCaption")["caption_type"] == "Descriptive"
      and _node(g, "JJC_JoyCaption")["caption_length"] == "long"
      and _node(g, "JJC_JoyCaption")["extra_option1"] == ""
      and _node(g, "JJC_JoyCaption")["max_new_tokens"] == 512
      and type(_node(g, "JJC_JoyCaption")["max_new_tokens"]) is int
      and _node(g, "JJC_JoyCaption")["temperature"] == 0.6
      and isinstance(_node(g, "JJC_JoyCaption")["temperature"], float)
      and _node(g, "JJC_JoyCaption")["top_p"] == 0.9
      and _node(g, "JJC_JoyCaption")["top_k"] == 0,
      repr(_node(g, "JJC_JoyCaption")))
check("joycaption wire: SaveText links the caption (index 1, not query)",
      _node(g, "SaveText")["text"] == ["JJC_JoyCaption.0", 1],
      repr(_node(g, "SaveText")["text"]))

g = render("image_edit", {"prompt": "a red fox", "image1": "a.png"}, model=_IMGEDIT)
check("image_edit graph matches the pinned node interface",
      _iface_mismatches(g) == [], _iface_mismatches(g))
# the loras stack rides the same law (filenames are STRINGS for the
# loader's STRING input, strengths are FLOATS):
g = render("image_edit", {"prompt": "a red fox", "image1": "a.png",
                          "loras": [{"filename": "krea-2/krea2_realism_lora.safetensors",
                                     "strength": 0.7}]}, model=_IMGEDIT)
check("image_edit lora stack matches the pinned node interface",
      _iface_mismatches(g) == [], _iface_mismatches(g))

g = render("music_t1", {"caption": "a song"}, model=_MUSIC3)
# NATIVE NODE TYPES (render-kit stroke — same law as t2i above).
check("music_t1 wire: seconds native float",
      _node(g, "EmptyMiniMaxMusic3LatentAudio")["seconds"] == 30.0
      and isinstance(
          _node(g, "EmptyMiniMaxMusic3LatentAudio")["seconds"], float),
      repr(_node(g, "EmptyMiniMaxMusic3LatentAudio")["seconds"]))
check("music_t1 wire: seed native int",
      _node(g, "KSampler")["seed"] == 42
      and type(_node(g, "KSampler")["seed"]) is int,
      repr(_node(g, "KSampler")["seed"]))
check("music_t1 graph matches the pinned node interface",
      _iface_mismatches(g) == [], _iface_mismatches(g))

# ── ESTATE-WIDE INTERFACE MEASURE (render-kit stroke) ──
# Every registered family renders from a minimal doc (required Doc
# fields only — dummies by shape, never disk: renders are pure graph
# builds) and the SAME interface wall measures the graph. A lane that
# can't render minimal, or emits a mistyped scalar, fails HERE —
# not at 2am on the queue. Model-free lanes pass model=None; lanes
# reading model rows get their card's first boarded model.
_ESTATE_MODELS = {m: load_model_cls(m) for m in (
    "anny", "ideogram", "mask-studio", "kimodo", "moss-sfx",
    "pixal3d", "trellis2-native", "transfer_rig", "qwen3-tts",
    "qwen3-tts-voicedesign", "qwen-img-edit-2511", "krea-2",
    "music3", "wd14", "joytag", "florence2", "joycaption")}
_ESTATE_FAMILIES = [
    # (family, model-id-or-None, minimal doc)
    ("anny_t1", None, {"body_glb": "x"}),
    ("basic_resize_t1", None, {}),
    ("concat_t1", "mask-studio", {}),
    ("h3_window", None, {"variant": "t4_open"}),
    ("ideogram_t2i", "ideogram", {"prompt": "a red fox"}),
    ("image_edit", "qwen-img-edit-2511", {"prompt": "a red fox",
                                          "image1": "a.png"}),
    ("image_t2i", "krea-2", {"prompt": "a red fox"}),
    ("input_prep", None, {}),
    ("input_t1", None, {}),
    ("mask_t1", "mask-studio", {"input_image": "a.png"}),
    ("motion_t1", "kimodo", {"prompt": "a punch"}),
    ("music_t1", "music3", {"caption": "a song"}),
    ("pixal_t1", "pixal3d", {"input_image": "a.png"}),
    ("pixel_upscale_t1", None, {}),
    ("rtx_vsr_t1", None, {}),
    ("scail2_t1", None, {}),
    ("seedvr2_t1", None, {}),
    ("sfx_t1", "moss-sfx", {"prompt": "boom"}),
    ("wd14_t1", "wd14", {"input_image": "a.png"}),
    ("joytag_t1", "joytag", {"input_image": "a.png"}),
    ("florence2_t1", "florence2", {"input_image": "a.png"}),
    ("joycaption_t1", "joycaption", {"input_image": "a.png"}),
    ("transfer_rig_t1", "transfer_rig",
     {"rigged_glb": "r.glb", "target_glb": "t.glb"}),
    ("trellis_t1", "trellis2-native", {"input_image": "a.png"}),
    ("tts_t1", "qwen3-tts", {"text": "hi"}),
    ("voicelock_t1", "qwen3-tts-voicedesign", {}),
    ("wan_vace_t1", None, {}),
]
for _fam, _mid, _doc in _ESTATE_FAMILIES:
    try:
        _g = render(_fam, dict(_doc),
                    model=_ESTATE_MODELS.get(_mid) if _mid else None)
    except Exception as e:
        check("estate %s renders minimal" % _fam, False,
              "%s: %s" % (type(e).__name__, e))
        continue
    check("estate %s renders minimal" % _fam, True, "")
    check("estate %s matches the pinned node interface" % _fam,
          _iface_mismatches(_g) == [], _iface_mismatches(_g))

# ── report ──────────────────────────────────────────────────────────────
print()
for n in PASS:
    print("  ok   %s" % n)
for n in FAIL:
    print("  FAIL %s" % n)
print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
