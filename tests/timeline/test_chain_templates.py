#!/usr/bin/env python3
"""Latent-chain template + seam-math contracts (CPU-only, no GPU).

Guards the 2026-08-30 latent-chain law end to end at the file layer:

  1. PURITY: every window template is a pure ComfyUI node map — any
     non-node key (like the "_law" docstring) breaks submission.
  2. EXTERMINATION: no template may reference a class from the dead
     packs (MiniMaxH3MotionContext*, MiniMaxH3SaveLatent) or carry the
     context_steps/audio_context_steps inputs that the live
     MiniMaxH3ImageToVideo schema no longer has.
  3. CHAIN WIRING: window1 saves a tail (RayH3SaveLatentTail) and does
     NOT chain; every seam window chains (RayH3ChainLatentAV) AND saves
     its own tail; the decoders read THROUGH the tail node (the save
     must execute, not dangle).
  4. INJECT MAPS: the pipeline yamls inject exactly the tail-path vars
     the templates expect (window k saves $tailpathK, chains
     $tailpath(k-1)) and never inject a dead node's key.
  5. SEAM MATH: the gateway plan fixpoint (python mirror of the C++ in
     server.cpp) must agree EXACTLY with the shipped plugin's
     _carried_pixel_frames for a sweep of carries and tiles — the meta
     cross-check's two sides.

Run: python3 tests/timeline/test_chain_templates.py
"""
import json, os, sys, glob, types, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
TL = os.path.join(REPO, "pipelines", "h3-timeline")

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond: fails.append(name)

DEAD_CLASSES = {
    "MiniMaxH3MotionContext", "MiniMaxH3MotionContextTrim",
    "MiniMaxH3MotionContextSaveLatent", "MiniMaxH3MotionContextLoadLatent",
    "MiniMaxH3SaveLatent", "H3SLAAttention",
}

# ── 1+2+3: templates ────────────────────────────────────────────────────────
templates = {}
for f in sorted(glob.glob(os.path.join(TL, "window*.json"))):
    name = os.path.basename(f)
    if name == "window1.json":      # probe-fit VRAM graph, no chain role
        continue
    with open(f) as fh:
        d = json.load(fh)
    templates[name] = d

    check(f"{name}: pure node map",
          all(isinstance(v, dict) and "class_type" in v for v in d.values()),
          [k for k, v in d.items() if not (isinstance(v, dict) and "class_type" in v)])

    classes = {v["class_type"] for v in d.values()}
    check(f"{name}: no exterminated classes", not (classes & DEAD_CLASSES),
          classes & DEAD_CLASSES)

    itv = next((v for v in d.values() if v["class_type"] == "MiniMaxH3ImageToVideo"), None)
    if itv:
        check(f"{name}: ItV has no dead context inputs",
              "context_steps" not in itv["inputs"] and
              "audio_context_steps" not in itv["inputs"],
              [k for k in itv["inputs"] if "context" in k])

    has_chain = "RayH3ChainLatentAV.0" in d
    has_save = "RayH3SaveLatentTail.0" in d
    is_w1 = name.startswith("window1")
    is_seam = not is_w1

    if is_w1 and name != "window1_load.json":
        check(f"{name}: source window saves tail, no chain", has_save and not has_chain)
    elif is_seam or name == "window1_load.json":
        check(f"{name}: seam window chains AND saves", has_chain and has_save)

    if has_save:
        # the decoders must read THROUGH the tail node (save executes)
        dec = [v for v in d.values() if v["class_type"] in ("VAEDecode", "VAEDecodeAudio")]
        check(f"{name}: decoders read through RayH3SaveLatentTail",
              all(v["inputs"]["samples"][0] == "RayH3SaveLatentTail.0" for v in dec),
              [v["class_type"] for v in dec
               if v["inputs"]["samples"][0] != "RayH3SaveLatentTail.0"])
        check(f"{name}: tail path is inject-managed",
              d["RayH3SaveLatentTail.0"]["inputs"]["path"] == "REPLACED_BY_INJECT")
        # (container law 2026-08-30) the save node AUTHORS the tail meta
        # from its carry widget — the template must declare it so the
        # gateway's carry splice validates
        sc = d["RayH3SaveLatentTail.0"]["inputs"].get("carry_latent_frames")
        check(f"{name}: save carry widget in 1..64",
              isinstance(sc, int) and 1 <= sc <= 64, sc)

    if has_chain:
        ch = d["RayH3ChainLatentAV.0"]["inputs"]
        check(f"{name}: chain latent comes from ItV",
              ch["latent"] == ["MiniMaxH3ImageToVideo.0", 1])
        check(f"{name}: chain tail_path is inject-managed",
              ch["tail_path"] == "REPLACED_BY_INJECT")
        c = ch.get("carry_latent_frames")
        check(f"{name}: carry widget in 1..64", isinstance(c, int) and 1 <= c <= 64, c)
        # the sampler must consume the CHAINED latent
        ks = next(v for v in d.values() if v["class_type"] == "KSampler")
        check(f"{name}: KSampler samples the chained latent",
              ks["inputs"]["latent_image"] == ["RayH3ChainLatentAV.0", 0])

# ── 4: pipeline yaml inject maps ────────────────────────────────────────────
import re
for yf in sorted(glob.glob(os.path.join(TL, "pipeline*.yaml"))):
    y = open(yf).read()
    check(f"{os.path.basename(yf)}: no dead inject keys",
          "MotionContext" not in y and "MiniMaxH3SaveLatent" not in y)
    # window k: save $tailpathK, chain $tailpath(k-1)
    for wid in range(1, 5):
        m = re.search(rf"id: window{wid}\b.*?params: \{{(.*?)\}}\n", y, re.S)
        if not m:
            continue
        params = m.group(1)
        check(f"{os.path.basename(yf)} w{wid}: saves $tailpath{wid}",
              f'"RayH3SaveLatentTail.0.path":"$tailpath{wid}"' in params)
        if wid > 1:
            check(f"{os.path.basename(yf)} w{wid}: chains $tailpath{wid-1}",
                  f'"RayH3ChainLatentAV.0.tail_path":"$tailpath{wid-1}"' in params)

# ── 5: seam math — gateway plan fixpoint vs the SHIPPED plugin ──────────────
# (torch stubbed: the grid helpers are pure integer math)
sys.modules.setdefault("torch", types.ModuleType("torch"))
pack = os.path.join(REPO, "plugins", "comfyui", "custom_nodes",
                    "melite-h3-motion-nodes")
spec = importlib.util.spec_from_file_location(
    "h3_chain", os.path.join(pack, "h3_chain.py"))
h3_chain = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(h3_chain)
except Exception as e:  # pragma: no cover
    print(f"FAIL import h3_chain: {e}")
    sys.exit(1)

def snap(n, resid):    # mirror of tl_snap_grid (nearest grid point)
    k = (n - resid + 8) // 17
    return max(17 * k + resid, resid)

def plan_window(tile, carry, prev_sampled):
    """Mirror of the C++ seam branch in compile_calls_windows.

    Carries EXACTLY what the node will splice:
        c = max(1, min(carry, total_slots-1, tail_slots))
    (tail_slots = slots of the PREVIOUS window's sampled tail), then
    bumps until the tile is covered — or declares the combo impossible
    (the C++ returns -3 -> 4xx)."""
    tail_S = h3_chain._video_latent_t(prev_sampled)
    sampled = tile
    for _ in range(8):
        S = h3_chain._video_latent_t(sampled)
        c = max(1, min(carry, S - 1, tail_S))
        cp = h3_chain._carried_pixel_frames(c, S)
        want = snap(tile + cp, 5)
        if want == sampled:
            break
        sampled = want
    cp = 0
    for _ in range(220):
        S = h3_chain._video_latent_t(sampled)
        c = max(1, min(carry, S - 1, tail_S))
        cp = h3_chain._carried_pixel_frames(c, S)
        if sampled - cp >= tile:
            return sampled, cp            # covered
        if sampled >= 17 * 128 + 5:
            break
        sampled = snap(sampled + 17, 5)
    return None, None                     # -3: carry/tile incompatible

ok = True
for prev in (22, 56):                     # window1 sampled lengths
    for carry in (1, 2, 3, 5, 6, 7, 10, 12, 20, 32, 64):
        for tile in (17, 34, 51, 68, 85, 102, 119):
            sampled, cp = plan_window(tile, carry, prev)
            # invariants of the latent-chain law
            if sampled is None:
                # incompatible only when the carry can eat the whole tile
                S_min = h3_chain._video_latent_t(tile)
                if carry < (tile + 4) // 17 + 2:
                    ok = False; print(f"FAIL spurious rejection (carry={carry}, tile={tile}, prev={prev})")
                continue
            if sampled % 17 != 5: ok = False; print(f"FAIL sampled {sampled} off-grid (carry={carry}, tile={tile})")
            if sampled - cp < tile: ok = False; print(f"FAIL tile uncovered (carry={carry}, tile={tile})")
            if cp <= 0: ok = False; print(f"FAIL non-positive trim (carry={carry}, tile={tile})")
            # the trim must equal the plugin formula at the CLAMPED carry
            S = h3_chain._video_latent_t(sampled)
            tail_S = h3_chain._video_latent_t(prev)
            c_eff = max(1, min(carry, S - 1, tail_S))
            if cp != h3_chain._carried_pixel_frames(c_eff, S):
                ok = False; print(f"FAIL trim mismatch (carry={carry}, tile={tile})")
check("seam math: plan fixpoint == node-clamped plugin formula (154 cases)", ok)

# THE FAIL THIS CATCHES: raw-carry planning (pre-fix) diverges from the
# node's clamp at high carry — carry=32, tile=17, prev=22 MUST be
# plannable with the clamp (c_eff <= tail_S=7 -> span grows) while the
# raw-carry arithmetic can never cover the tile.
s, cp = plan_window(17, 32, 22)
check("high carry plans via the node clamp (32-slot carry, 17px tile)", s is not None and s - cp >= 17)
# the plugin's grid inverse must round-trip with its align
for f in (5, 22, 39, 56, 73, 90, 107, 124):
    if h3_chain._align_frame_count(f) != f:
        check("plugin align is identity on grid", False, f); break
else:
    check("plugin align is identity on grid", True)

print()
if fails:
    print(f"CHAIN TEMPLATE SUITE: {len(fails)} FAILURES -> {fails}")
    sys.exit(1)
print("CHAIN TEMPLATE SUITE: ALL PASS")
