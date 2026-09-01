#!/usr/bin/env python3
"""Live-lineage template contracts (CPU-only, no GPU).

Since the node-migration move B (2026-09-02) deleted the RayH3 latent
weave and its dormant templates, this suite guards the LIVE surface —
the PlagueKind t4/t4r family:

  1. PURITY: every window template is a pure ComfyUI node map — any
     non-node key (like a "_law" docstring) breaks submission.
  2. EXTERMINATION: no template may reference a class from the dead
     packs (the retired Ray lineage, the old MiniMaxH3MotionContext*
     core patch, MiniMaxH3SaveLatent) or carry the context_steps
     inputs the live schema no longer has.
  3. CHAIN WIRING (his chain spine): every window SAVES its clip
     latent (CtxSaveLatent = MiniMaxH3MotionContextSaveLatent — the
     base pack's node, ALIVE); windows 2-4 LOAD the prior clip
     (CtxLoadLatent) and carry his in-between nodes (SongContext =
     MiniMaxH3SongMaskedAVContext, GenChainCtx =
     MiniMaxH3GeneratedAVMaskedContext); window1 has neither chain
     node.
  4. SLA SPINE (repair 2026-09-02): every template carries
     H3SLAAttention (his pack) behind SLASwitch — on_true=SLA,
     on_false=the kitchen default (ModelAttentionBackend), switch
     feeds AdaLNFix. His V7 widget values are the template defaults.
  5. BUNDLE BUS (move C): the t4r family carries PlagueKindBundleIn/
     Out; R2V's ref_images.ref_image_0 and (chain windows)
     SongContext.master_audio read THROUGH BundleOut; LoadImage slots
     are exactly 0..8 (core R2V max ref_image_0..8 — the old
     LoadImage.9 off-by-one is exterminated); LoadAudio.1..3 exist for
     the identity audio refs (slots 16-18).
  6. JOINT-AV GRID LAW (pure-python pin): the seam boundaries sit on
     his shared AV grid — (v-5)%17==0 AND v%3==0, minimum 39 — the
     same law the C++ emit snaps to (h3_card.c _snap equivalent).

Run: python3 tests/timeline/test_chain_templates.py
"""
import json, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
TL = os.path.join(REPO, "plugins", "comfyui", "models", "video",
                  "h3-timeline")

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond: fails.append(name)

DEAD_CLASSES = {
    "MiniMaxH3MotionContext", "MiniMaxH3MotionContextTrim",
    "MiniMaxH3SaveLatent",                       # core patch, exterminated
    "RayH3SaveLatentTail", "RayH3ChainLatentAV", # retired lineage (move B)
}

templates = {}
for f in sorted(glob.glob(os.path.join(TL, "window*_t4*.json"))):
    name = os.path.basename(f)
    templates[name] = json.load(open(f))

check("template family discovered (t4+t4r)", len(templates) == 8,
      sorted(templates))

# ── 1+2+3+4+5: per-template laws ───────────────────────────────────────────
for name, d in sorted(templates.items()):
    check(f"{name}: pure node map",
          all(isinstance(v, dict) and "class_type" in v for v in d.values()),
          [k for k, v in d.items() if not (isinstance(v, dict) and "class_type" in v)])

    classes = {v["class_type"] for v in d.values()}
    check(f"{name}: no exterminated classes", not (classes & DEAD_CLASSES),
          classes & DEAD_CLASSES)

    itv = next((v for v in d.values()
                if v["class_type"] == "MiniMaxH3ImageToVideo"), None)
    if itv:
        check(f"{name}: ItV has no dead context inputs",
              "context_steps" not in itv["inputs"] and
              "audio_context_steps" not in itv["inputs"],
              [k for k in itv["inputs"] if "context" in k])

    # 3: chain wiring — his spine, the ORIGINAL nodeset
    is_w1 = name.startswith("window1")
    has_save = "CtxSaveLatent.0" in d
    has_load = "CtxLoadLatent.0" in d
    has_song = "SongContext.0" in d
    has_gen  = "GenChainCtx.0" in d
    if is_w1:
        check(f"{name}: source window saves clip, no chain nodes",
              has_save and not has_load and not has_song and not has_gen)
    else:
        check(f"{name}: seam window chains AND saves (his spine)",
              has_save and has_load and has_song and has_gen)

    # 4: SLA spine — his V7 widget defaults
    sla = d.get("H3SLAAttention.0")
    sw = d.get("SLASwitch.0")
    if check(f"{name}: H3SLAAttention + SLASwitch present", sla and sw):
        exp = {"sparsity_ratio": 0.9, "block_size": "64",
               "min_seq_len": 8192, "dense_last_steps": 0,
               "protect_audio": True, "enabled": True,
               "dense_steps": "0", "dense_backend": "comfy_kitchen",
               "disable_fp16_accum": True, "stabilize_motion": True,
               "reference_protection": "Off"}
        bad = {k: (sla["inputs"].get(k), v) for k, v in exp.items()
               if sla["inputs"].get(k) != v}
        check(f"{name}: SLA widgets = his V7 defaults (block 64: the "
              "installed pack culled 32)", not bad, bad)
        check(f"{name}: SLA model <- LoraLoader",
              sla["inputs"].get("model") == ["LoraLoader.0", 0])
        check(f"{name}: switch on_true=SLA on_false=kitchen",
              sw["inputs"].get("on_true") == ["H3SLAAttention.0", 0] and
              sw["inputs"].get("on_false") == ["ModelAttentionBackend.0", 0])
        check(f"{name}: switch feeds AdaLNFix",
              d["AdaLNFix.0"]["inputs"].get("model") == ["SLASwitch.0", 0])

    # 5: bundle bus (t4r family)
    if name.endswith("_t4r.json"):
        bin_, bout = d.get("PlagueKindBundleIn.0"), d.get("PlagueKindBundleOut.0")
        if check(f"{name}: bundle pair present", bin_ and bout):
            check(f"{name}: BundleOut reads the bundle",
                  bout["inputs"].get("bundle") == ["PlagueKindBundleIn.0", 0])
        r2v = d["MiniMaxH3ReferenceToVideo.0"]["inputs"]
        check(f"{name}: R2V ref_image_0 reads BundleOut slot 1",
              r2v.get("ref_images.ref_image_0") == ["PlagueKindBundleOut.0", 0])
        if not is_w1:
            check(f"{name}: master audio rides bundle slot 19",
                  d["SongContext.0"]["inputs"].get("master_audio") ==
                  ["PlagueKindBundleOut.0", 18])
        li = sorted(int(k.split(".")[1]) for k in d if k.startswith("LoadImage."))
        check(f"{name}: LoadImage slots exactly 0..8 (R2V max)",
              li == list(range(9)), li)
        la = sorted(int(k.split(".")[1]) for k in d if k.startswith("LoadAudio."))
        la_exp = [0, 1, 2, 3] if not is_w1 else [1, 2, 3]
        check(f"{name}: LoadAudio slots {la_exp} (0=master chain, 1-3=refs)",
              la == la_exp, la)
        vhs = sorted(int(k.split(".")[1]) for k in d if k.startswith("VHS_LoadVideoPath."))
        check(f"{name}: VHS_LoadVideoPath slots exactly 0..2 (ref-video gap fix)",
              vhs == [0, 1, 2], vhs)
        check(f"{name}: VHS loaders dangle on placeholder (24fps/15s cap)",
              all(d[f"VHS_LoadVideoPath.{i}"]["inputs"]["video"] == "REPLACED_BY_INJECT"
                  and d[f"VHS_LoadVideoPath.{i}"]["inputs"]["force_rate"] == 24
                  and d[f"VHS_LoadVideoPath.{i}"]["inputs"]["frame_load_cap"] == 360
                  for i in range(3)))
    else:
        check(f"{name}: plain family carries no bundle",
              "PlagueKindBundleIn.0" not in d and
              "PlagueKindBundleOut.0" not in d)
        check(f"{name}: plain family carries no VHS loaders",
              not [k for k in d if k.startswith("VHS_LoadVideoPath.")])

    # 5b: LIVE post chain (dead-wire regression 2026-09-02: the mux used
    # to read raw VAEDecode, making sharpen/interpolate inject no-ops).
    # Now: mux <- SRSwitch <- (upscaler | InterpSwitch <- sharpen chain).
    mux = d.get("VHSVideoCombine.0")
    if check(f"{name}: VHSVideoCombine present", mux):
        check(f"{name}: mux consumes SRSwitch (post chain LIVE)",
              mux["inputs"].get("images") == ["SRSwitch.0", 0],
              mux["inputs"].get("images"))
    sr_sw = d.get("SRSwitch.0")
    if check(f"{name}: SRSwitch present (SeedVR2 gap fix)", sr_sw):
        check(f"{name}: SRSwitch off by default, chain passthrough",
              sr_sw["inputs"].get("switch") is False and
              sr_sw["inputs"].get("on_false") == ["InterpSwitch.0", 0])
        up = d.get("SeedVR2VideoUpscaler.0")
        check(f"{name}: upscaler <- InterpSwitch + local loaders",
              up and up["inputs"].get("image") == ["InterpSwitch.0", 0] and
              up["inputs"].get("dit") == ["SeedVR2LoadDiTModel.0", 0] and
              up["inputs"].get("vae") == ["SeedVR2LoadVAEModel.0", 0])

# ── 6: joint-AV grid law (pure-python pin of the C++ snap) ─────────────────
def on_grid(v):
    return ((v - 5) % 17 == 0) and (v % 3 == 0)

check("grid: 39/90/141/192 are boundaries",
      all(on_grid(v) for v in (39, 90, 141, 192)))
check("grid: 40 and 56 are NOT boundaries",
      not on_grid(40) and not on_grid(56))
def snap(v):
    b = v
    while b > 39 and not on_grid(b):
        b -= 1
    return max(b, 39)
check("grid: snap(100)->90 snap(45)->39 snap(141)->141",
      (snap(100), snap(45), snap(141)) == (90, 39, 141),
      (snap(100), snap(45), snap(141)))

print()
if fails:
    print(f"CHAIN TEMPLATE SUITE: {len(fails)} FAILURES -> {fails}")
    sys.exit(1)
print("CHAIN TEMPLATE SUITE: ALL PASS")
