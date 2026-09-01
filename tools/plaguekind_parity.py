#!/usr/bin/env python3
"""PlagueKind 1:1 parity — STATIC proof (2026-09-02).

Both sides are static files on disk:
  HIS:  plaguekind_ref/plaguekindMinimaxH3SparseAttention_h3V7.json
        (his exported V7 ComfyUI workflow — the SSOT of his recipe)
  OURS: plugins/comfyui/models/video/h3-timeline/window*_t4*.json
        (the templates the h3-timeline card splices — OUR defaults,
        because the card's defaults: block carries only seed/fps)

The wrapper law: our timeline card is a wrapper around his work. ALL
DEFAULTS, HIS. This script diffs every quality-relevant value between
his V7 widgets and our template bakes, and fails on ANY divergence.

No gateway, no GPU, no compose call — pure statics, pure truth.

Fields compared (canonical extraction from HIS file, by node id):
  gen node  b3c1dd80-…  widgets: [w, h, shift_v, shift_a, …,
                 "euler", "simple", steps, …, "match", prompt,
                 film_ckpt, film_mult, 2, 2, "HIGH", 0.3]
  modelpack 7104b5b8-…  widgets: [unet, vae_video, vae_audio, clip,
                 "comfy_kitchen", sparsity, min_seq_len, …]
  lora      LTX_lora_loader widgets: ["minimax", "<json stack>"]

Usage: python3 tools/plaguekind_parity.py [--json]
Exit:  0 = 1:1 everywhere; 1 = at least one divergence.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir))
HIS = os.path.join(ROOT, "plaguekind_ref",
                   "plaguekindMinimaxH3SparseAttention_h3V7.json")
TDIR = os.path.join(ROOT, "plugins", "comfyui", "models", "video",
                    "h3-timeline")

# every lora root ComfyUI sees (extra_model_paths ray_models + local)
LORA_ROOTS = [
    "/mnt/data/models/image-gen/comfyui/loras",
    "/opt/ComfyUI/loras",
]
UNET_ROOTS = [
    "/mnt/data/models/image-gen/comfyui/unet",
    "/mnt/data/models/image-gen/comfyui/diffusion_models",
]
FILM_ROOTS = [
    "/mnt/data/models/image-gen/comfyui/frame_interpolation",
    "/mnt/data/models/image-gen/comfyui",
]

ROWS = []


def row(field, his, ours, ok, note=""):
    ROWS.append((field, his, ours, bool(ok), note))


def his_nodes(doc):
    return {n["id"]: n for n in doc.get("nodes", [])}


def his_values():
    """Extract the canonical recipe from HIS V7 file, by node."""
    doc = json.load(open(HIS))
    nodes = his_nodes(doc)
    gen = pack = lora = None
    for nid, n in nodes.items():
        t = n.get("type", "")
        if t.startswith("b3c1dd80"):
            gen = n.get("widgets_values", [])
        elif t.startswith("7104b5b8"):
            pack = n.get("widgets_values", [])
        elif t == "LTX_lora_loader":
            lora = n.get("widgets_values", [])
    if not gen or not pack or not lora:
        raise SystemExit("FATAL: his V7 file lost a core node "
                         "(gen=%s pack=%s lora=%s)" % (bool(gen),
                                                       bool(pack),
                                                       bool(lora)))
    stack = json.loads(lora[1])
    v = {
        "width":        gen[0],
        "height":       gen[1],
        "shift_video":  gen[2],
        "shift_audio":  gen[3],
        "sampler":      gen[5],
        "scheduler":    gen[6],
        "steps":        gen[7],
        "ref_image_size": gen[9],
        "film_ckpt":    gen[11],
        "film_mult":    gen[12],
        "unet":         pack[0],
        "vae_video":    pack[1],
        "vae_audio":    pack[2],
        "clip":         pack[3],
        "attention":    pack[4],
        "sparsity":     pack[5],
        "min_seq_len":  pack[6],
        # (v1.4.2+) block_size 32 is BAKED inside his component (the
        # pack exposes no block_size outer input; inner H3SLAAttention
        # carries ["0.9","32",8192,...] in the definitions section)
        "block_size":   "32",
        "lora_stack":   [(e["lora"], e["str"]) for e in stack
                         if e.get("on")],
    }
    return v


def on_disk(name, roots):
    """Resolve a weight filename across roots (subpaths allowed)."""
    for r in roots:
        p = os.path.join(r, name)
        if os.path.exists(p):
            return p
        # subpath form "H3/turbo/x.safetensors" — try basename walks
        for dirpath, _dirs, files in os.walk(r):
            if name in files or os.path.basename(name) in files:
                return os.path.join(dirpath, name)
    return None


def basename(s):
    return os.path.basename(str(s))


def strip_prefix(s):
    """his files carry folder prefixes (video/, H3/turbo/); ours carry
    h3/. Compare basenames — prefixes are per-install layout."""
    return basename(str(s)).replace(".safetensors", "")


def template_values(path):
    """Read OUR template (API format) into the comparable shape."""
    w = json.load(open(path))
    get = lambda node, key, d=None: (
        w.get(node, {}).get("inputs", {}).get(key, d))
    loras = []
    i = 0
    while "LoraLoader.%d" % i in w:
        n = w["LoraLoader.%d" % i]["inputs"]
        loras.append((n.get("lora_name"), n.get("strength_model")))
        i += 1
    return {
        "width":   get("MiniMaxH3ReferenceToVideo.0", "width"),
        "height":  get("MiniMaxH3ReferenceToVideo.0", "height"),
        "shift_video": get("MiniMaxH3SigmaShift.0", "shift_video"),
        "shift_audio": get("MiniMaxH3SigmaShift.0", "shift_audio"),
        "sampler": get("SamplerSel.0", "sampler_name"),
        "scheduler": get("Scheduler.0", "scheduler"),
        "steps":   get("Scheduler.0", "steps"),
        "ref_image_size":
            get("MiniMaxH3ReferenceToVideo.0", "ref_image_size"),
        "film_ckpt":  get("FILMVFI.0", "ckpt_name"),
        "film_mult":  get("FILMVFI.0", "multiplier"),
        "unet":    get("UNETLoader.0", "unet_name"),
        "vae_video": get("VAELoader.0", "vae_name"),
        "vae_audio": get("VAELoader.1", "vae_name"),
        "clip":    get("CLIPLoader.0", "clip_name"),
        "attention": get("ModelAttentionBackend.0", "attention"),
        "sparsity": get("H3SLAAttention.0", "sparsity_ratio"),
        "min_seq_len": get("H3SLAAttention.0", "min_seq_len"),
        "block_size": get("H3SLAAttention.0", "block_size"),
        "sla_enabled": get("SLASwitch.0", "switch"),
        "vram_chain": (
            get("MiniMaxLowVRAMAttention.0", "head_chunks"),
            get("MiniMaxChunkFeedForward.0", "chunks"),
            get("MiniMaxChunkFeedForward.0", "seq_threshold"),
            get("H3SLAAttention.0", "model", [None])[0]),
        "lora_stack": loras,
    }


def main():
    his = his_values()
    as_json = "--json" in sys.argv

    # ---- every template in the family must carry HIS defaults ----
    names = sorted(f for f in os.listdir(TDIR)
                   if f.startswith("window") and "_t4" in f
                   and f.endswith(".json"))
    if not names:
        print("FATAL: no window*_t4*.json templates found")
        return 1
    ref = None
    diverged = 0
    for name in names:
        ours = template_values(os.path.join(TDIR, name))
        if ref is None:
            ref = (name, ours)
        else:
            # family-internal consistency: same bakes everywhere
            for k in ours:
                if ours[k] != ref[1][k]:
                    row("%s.%s" % (name, k),
                        "same as %s" % ref[0], ours[k], False,
                        "template family disagrees internally")
                    diverged += 1

    name, ours = ref
    L = lambda k: row  # noqa (placeholder to keep flake quiet)

    def cmp_scalar(field, hisv, ourv, xf=lambda x: x, note=""):
        ok = xf(hisv) == xf(ourv)
        row(field, hisv, ourv, ok, note)
        return ok

    def cmp_file(field, hisv, ourv, roots=(), note=""):
        ok = strip_prefix(hisv) == strip_prefix(ourv)
        row(field, basename(str(hisv)), basename(str(ourv)), ok, note)
        if ok and roots and not on_disk(str(ourv), roots):
            row(field + " on disk", basename(str(ourv)),
                "MISSING WEIGHT FILE", False,
                "referenced by template but not on disk")
        return ok

    # ---------------- the table ----------------
    cmp_scalar("width", his["width"], ours["width"])
    cmp_scalar("height", his["height"], ours["height"])
    cmp_scalar("shift_video", his["shift_video"], ours["shift_video"])
    cmp_scalar("shift_audio", his["shift_audio"], ours["shift_audio"])
    cmp_scalar("sampler", his["sampler"], ours["sampler"])
    cmp_scalar("scheduler", his["scheduler"], ours["scheduler"])
    cmp_scalar("steps", his["steps"], ours["steps"])
    cmp_scalar("ref_image_size", his["ref_image_size"],
               ours["ref_image_size"])
    cmp_file("film_ckpt", his["film_ckpt"], ours["film_ckpt"],
             FILM_ROOTS)
    cmp_scalar("film_mult", his["film_mult"], ours["film_mult"])
    cmp_file("unet", his["unet"], ours["unet"], UNET_ROOTS)
    cmp_file("vae_video", his["vae_video"], ours["vae_video"])
    cmp_file("vae_audio", his["vae_audio"], ours["vae_audio"])
    cmp_file("clip", his["clip"], ours["clip"])
    cmp_scalar("attention", "comfy_kitchen",
               str(ours["attention"]).replace(" attention", ""),
               xf=lambda s: str(s).replace("comfy kitchen",
                                           "comfy_kitchen"))
    cmp_scalar("sparsity", his["sparsity"], ours["sparsity"])
    cmp_scalar("min_seq_len", his["min_seq_len"], ours["min_seq_len"])
    cmp_scalar("block_size", his["block_size"], ours["block_size"],
               xf=str, note="v1.4.2+ re-legalized 32 — his bake")
    cmp_scalar("vram_chain", (4, 2, 4096, "UNETLoader.0"),
               tuple(ours["vram_chain"]),
               note="his pack: UNET->SLA->LowVRAM[4]->ChunkFF[2,4096]")
    row("sla_enabled", "on (in his active model pack)",
        "on" if ours["sla_enabled"] else "OFF (bypassed)",
        bool(ours["sla_enabled"]),
        "SLASwitch must be true — his pack runs sparse 0.9")

    # his LoRA stack: EVERY entry, exact basename + strength
    hs = his["lora_stack"]
    os_ = ours["lora_stack"]
    row("lora_count", len(hs), len(os_), len(hs) == len(os_),
        "his LTX_lora_loader stacks %d LoRAs" % len(hs))
    for i, (hl, hstr) in enumerate(hs):
        if i < len(os_):
            ol, ostr = os_[i]
            ok = (strip_prefix(hl) == strip_prefix(ol)
                  and abs(float(hstr) - float(ostr)) < 1e-9)
            row("lora[%d]" % i,
                "%s @ %s" % (basename(hl), hstr),
                "%s @ %s" % (basename(ol), ostr), ok)
            if strip_prefix(hl) == strip_prefix(ol) and \
                    not on_disk(str(ol), LORA_ROOTS):
                row("lora[%d] on disk" % i, basename(hl),
                    "MISSING WEIGHT FILE", False,
                    "his stack needs it; not in any lora root")
        else:
            row("lora[%d]" % i, "%s @ %s" % (basename(hl), hstr),
                "ABSENT — template loads no LoRA here", False,
                "chain LoraLoader.%d" % i)

    if as_json:
        print(json.dumps(
            [{"field": f, "his": h, "ours": o, "ok": ok, "note": n}
             for f, h, o, ok, n in ROWS], indent=1))
    else:
        print("PlagueKind V7 vs our window*_t4* templates "
              "(static proof)\n" + "=" * 72)
        for f, h, o, ok, n in ROWS:
            mark = "PASS" if ok else "FAIL"
            line = "%-4s %-16s his=%-42s ours=%s" % (
                mark, f, str(h), str(o))
            if n:
                line += "   [%s]" % n
            print(line)
    bad = sum(1 for r in ROWS if not r[3])
    print("=" * 72)
    print("%d/%d fields 1:1, %d DIVERGED" % (
        len(ROWS) - bad, len(ROWS), bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
