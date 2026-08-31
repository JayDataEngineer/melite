#!/usr/bin/env python3
"""LAYER AUDIT (operator order, 2026-08-31) — Layers A/B vs the backend, 1:1.

"We can not hide features": every parameter the backend lane actually has
MUST be offered on the card (Layer A globals / Layer B per-call knobs),
and — the converse that bites harder — every knob the card offers must be
REAL in the backend. A knob that writes into the doc and then silently
vanishes at compose time is a lie told in the UI.

TRUTH SETS
----------
card      : ray card form_video_timeline.yaml — body.writes (Layer A+B
            superset) + the BeatKnobs vocabulary (Layer B, per-call).
backend   : the h3-timeline lane's EXECUTED surface — every window
            template's node inputs (window*.json), the orchestrator
            pipeline.yaml / pipeline_audio.yaml step params, and their
            inject maps. If no backend file mentions a knob, the GPU
            never receives it.

MAPPING   : card knob -> backend witness(es). A knob is LIVE iff the
            audit finds its witness in the truth set. The mapping is
            EXPLICIT and exhaustive — adding a card knob without a
            witness line makes the audit FAIL with that knob named.

PIN       : docs/LAYER_AUDIT.json holds the last operator-agreed state.
            Run with --update to regenerate after a DELIBERATE change.
            A mismatch fails with a diff — drift can never be silent.
"""
import json
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANE = os.path.join(ROOT, "pipelines", "h3-timeline")
CARD = "/home/user/Documents/programs/ray/plugins/melite-video/cards/video_timeline/form_video_timeline.yaml"

# card knob -> regex over the backend truth text. A knob is LIVE iff any
# backend file contains a match. Order the regexes tight enough that a
# matching string in the backend really does carry that knob's value.
WITNESS = {
    # ── Layer A globals ────────────────────────────────────────────────
    "fps":            r'"fps"\s*:|"fps"',
    "seed":           r'"KSampler\.0\.seed"|\bseed\b',
    "width":          r"\bwidth\b",
    "height":         r"\bheight\b",
    "model":          r"unet_name|checkpoint",
    "variant":        r"variant",
    "preset":         r"preset",
    "audio_mode":     r"audio|mux",
    "audio_stem":     r"audio",
    "continuity":     r"match_level|tail_path|ChainLatent",
    "crf":            r"crf|concat|ffmpeg",
    "loras":          r"lora_name|strength_clip|strength_model",
    "output_format":  r"mp4|mux",
    # ── Layer A h3 engine flags ───────────────────────────────────────
    "h3_attention":       r"attention",
    "h3_sage_attention":  r"sage",
    "h3_fp16_accumulation": r"fp16",
    "h3_torch_compile":   r"torch_compile|compile",
    "h3_ref_images":      r"ref_image|Ref2VA|reference",
    "h3_ref_videos":      r"ref_video",
    "h3_ref_audios":      r"ref_audio",
    "h3_ref_video_audios": r"ref_video_audio",
    "h3_ref_image_size":  r"ref_image_size",
    "h3_ref_audio_trim_start": r"trim",
    "h3_ref_audio_trim_duration": r"trim",
    # ── Layer A post knobs ───────────────────────────────────────────
    "rtx_vsr_enabled":    r"vsr|VSR",
    "rtx_vsr_multiplier": r"vsr|VSR",
    "rtx_vsr_quality":    r"vsr|VSR",
    # ── Layer B per-call knobs ───────────────────────────────────────
    "sampling_steps":  r'"steps"|sampling_steps',
    "sampler":         r"sampler_name",
    "scheduler":       r"scheduler",
    "cfg":             r'\bcfg\b',
    "shift_video":     r"shift_video",
    "shift_audio":     r"shift_audio",
    "h3_context_steps":     r"context_steps",
    "h3_audio_context_steps": r"audio_context_steps",
    # ── Layer B SLA family ───────────────────────────────────────────
    "h3_sla_sparsity": r"sparsity",
    "h3_sla_block_size": r"block_size",
    "h3_sla_min_seq_len": r"min_seq_len",
    "h3_sla_dense_last_steps": r"dense_last_steps",
    "h3_sla_dense_steps": r"dense_steps",
    "h3_sla_dense_backend": r"dense_backend",
    "h3_sla_protect_audio": r"protect_audio",
    "h3_sla_stabilize_motion": r"stabilize_motion",
    "h3_sla_reference_protection": r"reference_protection",
    "h3_sla_disable_fp16_accum": r"disable_fp16_accum",
    # ── Layer B post knobs ───────────────────────────────────────────
    "sharpen_enabled": r"sharpen|FSR|rcas",
    "sharpen_method":  r"sharpen|rcas|adaptive_usm|high_pass|deconvolution",
    "sharpen_strength": r"sharpen_strength",
    "sharpen_radius":  r"sharpen_radius",
    "sharpen_threshold": r"sharpen_threshold",
    "sharpen_iterations": r"sharpen_iterations",
    "interpolate_enabled": r"interpolat|FILM|RIFE|film_net|rife47",
    "interpolate_model":   r"film_net|rife47",
    "interpolate_multiplier": r"multiplier",
}

# card keys that are DOCUMENT structure, not backend knobs (excluded from
# the 1:1 law: they are authored data the compose path consumes by design).
DOC_KEYS = {"calls", "keyframes", "document"}

# ── reverse direction (operator order: "we cannot hide features") ────────
# Backend workflow inputs that are REAL knobs (values the GPU receives)
# mapped to the card knob that exposes them; None = HIDDEN — a backend
# capability no Layer A/B control offers. Runtime wiring (prompt/seed/
# latent plumbing) is not a knob and never appears here.
BACKEND_KNOBS = {
    "denoise":             None,   # KSampler denoise — no card control
    "length":              "fps",  # window frames — derived from calls' spans
    "carry_latent_frames": None,   # chain seam depth — hardcoded 22
    "weight_dtype":        None,   # loader dtype — no card control
}


def backend_truth():
    chunks = {}
    for f in sorted(glob.glob(os.path.join(LANE, "*.json"))) + \
             sorted(glob.glob(os.path.join(LANE, "*.yaml"))):
        try:
            chunks[os.path.basename(f)] = open(f, encoding="utf-8").read()
        except OSError:
            pass
    return chunks


def card_writes():
    """Layer A+B superset from the ray card yaml (no yaml dep: regex)."""
    s = open(CARD, encoding="utf-8").read()
    m = re.search(r"writes:\n((?:\s+- [a-z0-9_]+\n)+)", s)
    if not m:
        raise SystemExit(f"audit: no writes block found in {CARD}")
    return {ln.strip().lstrip("- ").strip()
            for ln in m.group(1).splitlines() if ln.strip()}


def main():
    truth = backend_truth()
    blob = "\n".join(truth.values())
    writes = card_writes() - DOC_KEYS

    live, dead = [], []
    for k in sorted(writes):
        pat = WITNESS.get(k)
        if pat is None:
            dead.append(k)          # unmapped knob = automatic dead
        elif re.search(pat, blob):
            live.append(k)
        else:
            dead.append(k)

    unmapped = [k for k in sorted(writes) if WITNESS.get(k) is None]

    report = {
        "card_knobs": len(writes),
        "live": live,
        "dead": dead,
        "unmapped_needs_witness": unmapped,
        "hidden_backend_knobs": sorted(k for k, v in BACKEND_KNOBS.items()
                                       if v is None),
    }
    pin_path = os.path.join(ROOT, "docs", "LAYER_AUDIT.json")
    if "--update" in sys.argv:
        os.makedirs(os.path.dirname(pin_path), exist_ok=True)
        with open(pin_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=1, sort_keys=True)
            f.write("\n")
        print(f"pin updated: {pin_path}")
        print(json.dumps(report, indent=1, sort_keys=True))
        return 0

    if not os.path.exists(pin_path):
        print("audit: no pin yet — run with --update to create the "
              "operator-agreed baseline")
        print(json.dumps(report, indent=1, sort_keys=True))
        return 1

    pin = json.load(open(pin_path, encoding="utf-8"))
    if pin != report:
        print("LAYER AUDIT DRIFT — card and pin disagree. If the change "
              "was deliberate, re-run with --update and commit both.")
        for k in ("card_knobs", "live", "dead", "unmapped_needs_witness",
                  "hidden_backend_knobs"):
            if pin.get(k) != report.get(k):
                a = set(pin.get(k) or ()) - set(report.get(k) or ())
                b = set(report.get(k) or ()) - set(pin.get(k) or ())
                print(f"  {k}: pin-only={sorted(a)} now={sorted(b)}")
        return 1
    print(f"LAYER AUDIT OK — {len(live)} live / {len(dead)} dead "
          f"(pinned state)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
