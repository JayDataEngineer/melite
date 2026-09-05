"""h3 renderer parity — renderer output vs RECORDED goldens.

THE BAR, REHOMED (2026-09-05): the flip acceptance bar (2026-09-02)
compared the renderer against the hand-written window templates
(template + inject, restricted to the executed reachable subgraph).
The templates retired (dcfa4c7, 2026-09-03 — the comfy-script
authoring path supersedes the hand-written graph files per operator),
so the parity ground truth is now the RECORDED renderer output — the
estate doctrine for parity everywhere else (C RETIREMENT: recorded
outputs, never a live twin). A graph change surfaces as a diff
against the recording: the bump is deliberate or the change is a
regression.

The inject-address vocabulary SURVIVES (validation_alias on the typed
H3WindowInject fields — the lane still speaks it); what died with the
templates is wiring the lane now composes in code (LayerSwitch
audio-off, GenChainCtx/SongContext chain glue) — those keys are no
longer inject inputs and are absent from these cases on purpose.

Regenerate the recordings (a deliberate graph change):
    H3_PARITY_REGEN=1 .venv/bin/python tests/walls/suites/test_h3_renderer_parity.py
"""

import json
import os
import sys
from pathlib import Path

from _anchor import REPO
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))

from co_script import render, reachable, diff, CoScriptError

# MODELS DON'T RENDER — the renderer is CARD-owned
CARD_DIR = (REPO / "plugins" / "engines" / "comfyui" / "action_cards"
            / "video" / "h3-timeline")

# CARD-OWNED RENDERER (models-don't-render law): load the card
# module so it registers "h3_window" before any render() call below.
import importlib.util as _ilu
_RSPEC = _ilu.spec_from_file_location(
    "h3_card_renderer", str(CARD_DIR / "py" / "renderer.py"))
_RMOD = _ilu.module_from_spec(_RSPEC)
sys.modules[_RSPEC.name] = _RMOD  # canonical: visible to sys.modules
_RSPEC.loader.exec_module(_RMOD)
OI = json.loads((REPO / "plugins" / "engines" / "comfyui" / "data"
                 / "object_info.json").read_text())

GOLDEN_DIR = Path(__file__).resolve().parent / "golden_h3"
REGEN = bool(os.environ.get("H3_PARITY_REGEN"))

PASS, FAIL = [], []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# ── the cases: one per shape the card actually composes ─────────────────
# t4r DEMANDS a staged guide image (the validator refuses without one —
# compose always injects LoadImage.0.image on that family), so every
# t4r case carries image_name. GUI-era wiring (bundle fan-out, resizer
# links) rides the admitted pin prefixes verbatim.
CASES = [
    ("opener default", {
        "variant": "t4r",
        "inject": {
            "RandomNoise.0.noise_seed": 59144818769896,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 1,
            "FPSFloat.0.value": 4.0,
            "MiniMaxH3ReferenceToVideo.0.width": 1344,
            "MiniMaxH3ReferenceToVideo.0.height": 768,
            "LoadImage.0.image": "ref1_0_guide.png",
        },
    }),
    ("opener with guide wiring", {
        "variant": "t4r",
        "inject": {
            "RandomNoise.0.noise_seed": 11,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 1,
            "FPSFloat.0.value": 4.0,
            "MiniMaxH3ReferenceToVideo.0.width": 1344,
            "MiniMaxH3ReferenceToVideo.0.height": 768,
            "LoadImage.0.image": "ref1_0_guide.png",
            "UnifiedResizeImageMask.G.image": ["LoadImage.0", 0],
            "UnifiedResizeImageMask.R.image": ["LoadImage.0", 0],
            "PlagueKindBundleIn.0.input_1": ["UnifiedResizeImageMask.R", 0],
            "MiniMaxH3ReferenceToVideo.0.ref_image_size": "704x1280",
        },
    }),
    ("opener knobs", {
        "variant": "t4r",
        "inject": {
            "RandomNoise.0.noise_seed": 22,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 1,
            "FPSFloat.0.value": 4.0,
            "MiniMaxH3ReferenceToVideo.0.width": 1344,
            "MiniMaxH3ReferenceToVideo.0.height": 768,
            "LoadImage.0.image": "ref1_0_guide.png",
            "SLASwitch.0.switch": True,
            "Scheduler.0.steps": 8,
            "SamplerSel.0.sampler_name": "dpmpp_2m",
            "MiniMaxH3SigmaShift.0.shift_video": 9.0,
            "H3SLAAttention.0.sparsity_ratio": 0.8,
            "H3SLAAttention.0.block_size": "64",
        },
    }),
    ("chain w2 default", {
        "variant": "t4_chain",
        "inject": {
            "RandomNoise.0.noise_seed": 59144818769896 + 1000003,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt2",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 2,
            "MiniMaxH3ReferenceToVideo.0.length": 56,
            "CtxLoadLatent.0.latent_path": "$ctxdir",
            "CtxLoadLatent.0.clip_index": 1,
        },
    }),
    ("chain w3 post knobs", {
        "variant": "t4_chain",
        "inject": {
            "RandomNoise.0.noise_seed": 7,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt3",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 3,
            "MiniMaxH3ReferenceToVideo.0.length": 56,
            "CtxLoadLatent.0.latent_path": "$ctxdir",
            "CtxLoadLatent.0.clip_index": 2,
            "SharpenSwitch.0.switch": True,
            "ImageSharpenKJ.0.method.strength": 0.55,
            "ImageSharpenKJ.0.method.radius": 2.0,
            "InterpSwitch.0.switch": True,
            "FrameInterpolate.0.multiplier": 3,
            "FrameInterpolationModelLoader.0.model_name":
                "film_net_fp32.safetensors",
            "SRSwitch.0.switch": True,
            "SeedVR2LoadDiTModel.0.model": "seedvr2_ema_7b.safetensors",
            "SeedVR2VideoUpscaler.0.resolution": 1440,
        },
    }),
    ("hard cut w1", {
        "variant": "t4_open",
        "inject": {
            "RandomNoise.0.noise_seed": 33,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 1,
            "MiniMaxH3ReferenceToVideo.0.length": 90,
        },
    }),
    ("chain w4 lora override", {
        "variant": "t4_chain",
        "inject": {
            "RandomNoise.0.noise_seed": 9,
            "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt4",
            "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
            "CtxSaveLatent.0.clip_index": 4,
            "MiniMaxH3ReferenceToVideo.0.length": 56,
            "CtxLoadLatent.0.latent_path": "$ctxdir",
            "CtxLoadLatent.0.clip_index": 3,
            "LTX_lora_loader.0.stack_data": "[]",
        },
    }),
]


def parity(name: str, doc: dict[str, str | dict[str, str | int | float | bool | list[str | int]]]) -> None:
    """Renderer output vs the recording — reachable-subgraph isomorphism."""
    new = reachable(render("h3_window", doc), OI)
    golden = GOLDEN_DIR / ("%s.json" % name.replace(" ", "_"))
    if REGEN:
        GOLDEN_DIR.mkdir(exist_ok=True)
        golden.write_text(json.dumps(new, indent=1, sort_keys=True) + "\n")
        check(name + " (regen)", bool(new), "renderer emitted nothing")
        print("  %-24s RECORDED %d nodes" % (name, len(new)))
        return
    if not golden.is_file():
        check(name, False, "no recording at %s — regenerate" % golden)
        return
    rec = json.loads(golden.read_text())
    d = diff(rec, new)
    print("  %-24s %s (rec %d / new %d nodes)" % (
        name, "ISOMORPHIC" if d["isomorphic"] else "DIFF",
        len(rec), len(new)))
    if not d["isomorphic"]:
        print("      a_only:", d["a_only"][:8])
        print("      b_only:", d["b_only"][:8])
    check(name, d["isomorphic"],
          "a_only=%s b_only=%s" % (d["a_only"][:6], d["b_only"][:6]))


for _name, _doc in CASES:
    parity(_name, _doc)

# 8. unsanctioned key = LOUD (the typed inject refuses unknown keys —
# extra=forbid — before any graph is built)
try:
    render("h3_window", {"variant": "t4r",
                         "inject": {"EvilNode.0.payload": 1}})
    check("unsanctioned LOUD", False, "no raise")
except CoScriptError as e:
    check("unsanctioned LOUD", "EvilNode.0.payload" in str(e))

# 8b. t4r without a staged guide image refuses LOUD (the family gate)
try:
    render("h3_window", {"variant": "t4r", "inject": {}})
    check("t4r-no-image LOUD", False, "no raise")
except CoScriptError as e:
    check("t4r-no-image LOUD", "image-anchored" in str(e))

print()
for n in PASS:
    print("  ok   %s" % n)
for n in FAIL:
    print("  FAIL %s" % n)
print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
