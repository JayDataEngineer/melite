---
name: mask-studio
description: "Mask Studio — detect people/subjects, refine masks, paint corrections → mask artifacts for inpaint flows. Entry point for the mask-studio card."
---

# Mask Studio

You are the agent interface for the **mask-studio card** (model
`mask-studio`): detect people/subjects in an image, refine the detected
mask (SAM3), accept paint corrections, and emit mask artifacts —
the input layer for every inpaint/outpaint flow.

## When to use this card

- The user wants to **mask a person/subject** in a photo (for inpaint,
  outpainting, background replacement, character isolation).
- The user needs **separate masks** — face, hands, body — from one photo.
- The user wants to **paint a correction** onto a mask (brush stroke →
  `mask_paint`).

## The recipe form (PREFERRED — phase C, 2026-08-16)

Author ONE entry per mask you want, two levels — Filter (where) over
Selection (how). When `outputs` is present it IS the recipe (the flat
`detect_mode`/`export_*`/`roi`/`instance_filter` params are OVERRIDDEN;
thresholds + `paint_mask` stay flat):

```python
outputs = [
  {"filter": {"kind": "instance", "keep": [0]},      # BBox1 only
   "selection": {"kind": "detect", "class": "body", "mode": "segm"}},
  {"selection": {"kind": "detect", "class": "hands"}},   # rides along
  {"filter": {"kind": "scope", "roi": [0.1, 0.1, 0.5, 0.5]},
   "selection": {"kind": "sam3", "prompt": "hat"}},
]
```

* SELECTION kinds: `detect` (class REQUIRED: face|hands|body; `mode`
  segm|bbox optional; `boxes` primary-only, manifest defaults ON) |
  `sam3` (prompt REQUIRED) | `paint` (payload = flat `paint_mask`).
* FILTER kinds: absent/`full` | `scope` (roi [x,y,w,h] fractions,
  RUN-GLOBAL — identical scopes only) | `instance` (`keep`:
  "largest" | [0,2] | "0,2", detect only) | `canvas` (paint only).
* FIRST detect entry = primary (owns `mask_combined`); later detect
  entries = per-class exports, each may carry its OWN instance filter.
* Single-pass, strict vocabulary: duplicate class / second sam3 /
  second paint / differing scopes / conflicting modes / unknown keys
  are HARD ERRORS. The manifest (`detect_boxes`) reports every found
  instance — run once with `boxes`, read it, then refine `keep`.

The flat params still work (the editor authors flat); use `outputs`
whenever you compose more than one mask — it is the simpler model.

## The flow (2026-09-04 B-cluster: native core, no extension pack)

1. **Detect** — RT-DETR (`rt_detr_v4-x-hgnet`, Comfy-Org/SDPose) proposes
   person boxes (`detection_threshold`, COCO `person` class). The mask
   lane's primary `body` selection rides the boxes → SAM3 refines.
2. **Segment** — SAM3 (`sam3.1_multiplex` checkpoint) refines proposals
   AND takes open-vocabulary text selections directly (`face`, `hands`,
   any prompt via `sam3_prompt` / sam3 entries; `sam_threshold`,
   `sam_dilation` = GrowMask pixels).
3. **Paint** (optional) — a brush stroke flips `export_paint=true` and
   sends the brushed PNG as `paint_mask`; its ALPHA channel is the mask.
4. **Export** — `export_face` / `export_hands` / `export_body` /
   `export_paint` flags emit the requested masks; the first selection
   owns `mask_combined`; `export_boxes` draws the RT-DETR manifest
   (`detect_boxes`) — the instance readback.
5. **Scope** — `roi [x, y, w, h]` fractions crop every selection
   (run-global); the compose reads the input's header and converts to
   the pixel bbox SAM3 takes.

**v1 lane truth (honest edges)**: `instance`/`canvas` recipe filters
validate but REFUSE loudly — core has no bbox-select node yet; the
workflow is manifest-first (run `export_boxes`, read `detect_boxes`,
cap with `max_instances`). One sam3 selection per run (one
conditioning lane).

## How to use this bundle

- `skills/advanced-usage/SKILL.md` — the full mask workflow.
- `tools.ts` — `get_flow_spec` (pre-flight: authoritative fields +
  defaults), `submit_mask_run` (the run door), `get_run_status` (polling).

## Delegation

This bundle is self-contained: it can be delegated as a subagent with
isolated context, passing `tools.ts` as its tool set — the workflow lives
in the `advanced-usage` skill, the entry point is this file.
