---
name: advanced-usage
description: "Full mask-studio workflow — pre-flight spec, detect → SAM3 refine → paint → export, submit, poll."
---

# Mask Studio Workflow

## 1. Pre-flight — ALWAYS

Call `tools.get_flow_spec("mask-studio")` first. It returns the live
form fields + defaults; the compile layer rejects unknown params loudly,
so the spec IS the vocabulary.

## 2. The run shape

```
tools.submit_mask_run(
    input_image=<artifact id of the photo>,
    detect_mode="body",           # the detector: body / face / hands / ...
    detection_threshold=0.35,
    sam_threshold=0.93,           # SAM3 region threshold
    sam_dilation=0,
    export_body=True,             # which masks to emit
)
```

## 3. The stages

1. **Detect** — the detector proposes the region (`detect_mode` +
   `detection_threshold`).
2. **Segment** — SAM3 refines it into the subject mask (`sam_threshold`,
   `sam_dilation`).
3. **Paint** — if the user brushes a correction, `export_paint=true` and
   the brushed mask arrives as `paint_mask` (data URL); the brick uploads
   it and emits `mask_paint`.
4. **Export** — the flags decide which masks the run outputs; the outputs
   feed downstream inpaint/outpaint flows (FLUX-Fill, lanpaint, ...).

## 4. The BBox refine loop (phase B/C)

The run emits `detect_boxes` — one JSON entry per found instance
(`index` by area DESC: BBox1 is the biggest). REFINE, don't guess:

1. Submit with the recipe (the primary's manifest defaults ON).
2. Read `detect_boxes` from the result artifacts.
3. Re-submit with the primary entry's filter set:
   `{"kind": "instance", "keep": [0]}` — "the left person only".
   `keep` accepts "largest", [0, 2], "0,2". An index outside the
   manifest HARD-ERRORS (never silently clamps) — read the manifest
   first, every time.

## Gotchas

- `sam3_prompt` (the SAM3 producer prompt) is off by default — the editor
  writes it when the user prompts the segmenter; as the agent, prefer
  detect_mode over sam3_prompt unless the user describes the subject.
- Masks are the INPUT layer — a mask-studio run's outputs are mask
  artifacts, not images; the user's next step is an inpaint model run.
- A failed submission returns the compile-layer violation list — surface
  the actual error to the user, never a summary.
