"""h3 renderer parity — renderer output vs golden template+inject.

THE FLIP ACCEPTANCE BAR: for every family, the composed graph must be
ISOMORPHIC to the old path (template with inject applied, restricted
to the executed reachable subgraph). Old-path orphans (parked loaders,
dead sampler branches) are excluded on BOTH sides. No GPU, no network.
"""

import copy
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui"))

from constructors.co_script import render, reachable, diff, CoScriptError

MODEL_DIR = REPO / "plugins" / "engines" / "comfyui" / "models" / "video" / "h3-timeline"

# MODEL-LEVEL RENDERER (lane law): the core ships no renderers — load the
# h3 module so it registers "h3_window" before any render() call below.
import importlib.util as _ilu
_RSPEC = _ilu.spec_from_file_location(
    "h3_co_script_renderer", str(MODEL_DIR / "co_script_renderer.py"))
_RMOD = _ilu.module_from_spec(_RSPEC)
sys.modules[_RSPEC.name] = _RMOD  # canonical: visible to sys.modules
_RSPEC.loader.exec_module(_RMOD)
OI = json.loads((REPO / "plugins" / "engines" / "comfyui" / "data" / "object_info.json").read_text())

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


def apply_inject(template, inject):
    """The old-path splice (what engine._splice did), incl. dotted
    leaves inside grouped-widget dict inputs."""
    wf = copy.deepcopy(template)
    for slot, value in inject.items():
        node_id, _, field = slot.rpartition(".")
        # longest node-id prefix wins (ids contain dots)
        parts = slot.split(".")
        node_id = None
        for i in range(1, len(parts)):
            cand = ".".join(parts[:i])
            if cand in wf:
                node_id = cand
                field = ".".join(parts[i:])
        if node_id is None:
            raise AssertionError("old-path: inject %s hits no node" % slot)
        inputs = wf[node_id].get("inputs", {})
        if "." in field:
            head, _, leaf = field.partition(".")
            if head in inputs and isinstance(inputs[head], dict):
                inputs[head][leaf] = value
                continue
        if field not in inputs:
            raise AssertionError("old-path: inject %s hits no input" % slot)
        inputs[field] = value
    return wf


def parity(name, tpl_name, inject):
    tpl = json.loads((MODEL_DIR / tpl_name).read_text())
    old = reachable(apply_inject(tpl, inject), OI)
    new = render("h3_window", {"tpl": tpl_name, "inject": inject})
    d = diff(old, new)
    print("  %-22s %s (old %d / new %d nodes)" % (
        name, "ISOMORPHIC" if d["isomorphic"] else "DIFF", len(old), len(new)))
    if not d["isomorphic"]:
        print("      a_only:", d["a_only"][:8])
        print("      b_only:", d["b_only"][:8])
    check(name, d["isomorphic"],
          "a_only=%s b_only=%s" % (d["a_only"][:6], d["b_only"][:6]))
    return d


# 1. opener, default (no guide image staged)
parity("opener default", "window1_t4r.json", {
    "RandomNoise.0.noise_seed": 59144818769896,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 1,
    "FPSFloat.0.value": 4.0,
    "MiniMaxH3ReferenceToVideo.0.width": 1344,
    "MiniMaxH3ReferenceToVideo.0.height": 768,
})

# 2. opener with guide image staged (resize links + bundle wiring)
parity("opener with guide", "window1_t4r.json", {
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
})

# 3. opener with model/knob overrides
parity("opener knobs", "window1_t4r.json", {
    "RandomNoise.0.noise_seed": 22,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 1,
    "FPSFloat.0.value": 4.0,
    "MiniMaxH3ReferenceToVideo.0.width": 1344,
    "MiniMaxH3ReferenceToVideo.0.height": 768,
    "SLASwitch.0.switch": True,
    "Scheduler.0.steps": 8,
    "SamplerSel.0.sampler_name": "dpmpp_2m",
    "MiniMaxH3SigmaShift.0.shift_video": 9.0,
    "H3SLAAttention.0.sparsity_ratio": 0.8,
    "H3SLAAttention.0.block_size": "64",
})

# 4. chain window 2 default
parity("chain w2 default", "window2_t4.json", {
    "RandomNoise.0.noise_seed": 59144818769896 + 1000003,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt2",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 2,
    "MiniMaxH3ReferenceToVideo.0.length": 56,
    "CtxLoadLatent.0.latent_path": "$ctxdir",
    "CtxLoadLatent.0.clip_index": 1,
    "LayerSwitch.0.switch": False,
    "GenChainCtx.0.context_length": 39,
    "SongContext.0.clip_start_seconds": 0.0,
    "LoadAudio.0.audio": "__OFF__",
})

# 5. chain window 3 with the full post ladder + knobs
parity("chain w3 post knobs", "window3_t4.json", {
    "RandomNoise.0.noise_seed": 7,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt3",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 3,
    "MiniMaxH3ReferenceToVideo.0.length": 56,
    "CtxLoadLatent.0.latent_path": "$ctxdir",
    "CtxLoadLatent.0.clip_index": 2,
    "LayerSwitch.0.switch": False,
    "GenChainCtx.0.context_length": 39,
    "SongContext.0.clip_start_seconds": 0.0,
    "LoadAudio.0.audio": "__OFF__",
    "SharpenSwitch.0.switch": True,
    "ImageSharpenKJ.0.method.strength": 0.55,
    "ImageSharpenKJ.0.method.radius": 2.0,
    "InterpSwitch.0.switch": True,
    "FrameInterpolate.0.multiplier": 3,
    "FrameInterpolationModelLoader.0.model_name": "film_net_fp32.safetensors",
    "SRSwitch.0.switch": True,
    "SeedVR2LoadDiTModel.0.model": "seedvr2_ema_7b.safetensors",
    "SeedVR2VideoUpscaler.0.resolution": 1440,
})

# 6. hard cut (window1_t4)
parity("hard cut w1", "window1_t4.json", {
    "RandomNoise.0.noise_seed": 33,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 1,
    "MiniMaxH3ReferenceToVideo.0.length": 90,
})

# 7. lora stack rebuild rides through verbatim
parity("chain w4 lora override", "window4_t4.json", {
    "RandomNoise.0.noise_seed": 9,
    "MiniMaxH3ReferenceToVideo.0.prompt": "$prompt4",
    "CtxSaveLatent.0.filename_prefix": "$ctxdir/clip",
    "CtxSaveLatent.0.clip_index": 4,
    "MiniMaxH3ReferenceToVideo.0.length": 56,
    "CtxLoadLatent.0.latent_path": "$ctxdir",
    "CtxLoadLatent.0.clip_index": 3,
    "LayerSwitch.0.switch": False,
    "GenChainCtx.0.context_length": 39,
    "SongContext.0.clip_start_seconds": 0.0,
    "LoadAudio.0.audio": "__OFF__",
    "LTX_lora_loader.0.stack_data": "[]",
})

# 8. unsanctioned key = LOUD
try:
    render("h3_window", {"tpl": "window1_t4r.json",
                         "inject": {"EvilNode.0.payload": 1}})
    check("unsanctioned LOUD", False, "no raise")
except CoScriptError as e:
    check("unsanctioned LOUD", "EvilNode.0.payload" in str(e))

print()
for n in PASS:
    print("  ok   %s" % n)
for n in FAIL:
    print("  FAIL %s" % n)
print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
