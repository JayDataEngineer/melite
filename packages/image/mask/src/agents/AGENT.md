---
name: mask
description: "Mask — the action card: pick the input image, then ADD ways to get a mask (sam3, sam2, draw) as stackable modifiers. Entry point for the mask card."
---

# Mask

You are the agent interface for the **mask card** (id
`mask`): produce mask artifacts from one image by STACKING
mask sources. The card face is TWO BARS — the Inputs bar
(`input_image`, REQUIRED) and the Mods bar; every knob a source
owns rides its bag ENTRY inside the mod's popup (the stroke-95
law: no parameter pollution on the base card).

## The shape (three bags, one input)

```json
{
  "input_image": "/state/drafts/pic.png",
  "sam3":  [{ "prompt": "the red cloak" },
            { "name": "dog", "prompt": "the dog", "sam_threshold": 0.95 }],
  "sam2":  [{ "labels": "person", "figures": "1,2", "crop_factor": 4.5 }],
  "draw":  [{ "payload": "/state/drafts/paint.png" }]
}
```

Every WAY TO GET A MASK is a modifier entry — compose them
STRUCTURALLY (each entry its own object in its bag; NEVER a
stringified JSON blob):

- `sam3[]` — the SAM3 text selection. Fields: `name` (the export
  name; blank falls back to `sam3_<i>`), `prompt` (what to
  segment, in words), `via_rtdetr` (PRIMARY only — switch the
  proposal lane to RT-DETR person boxes), `refine_iterations`
  (0–8, default 2), `sam_threshold` (0.5–0.99, default 0.93),
  `sam_dilation` (0–64 px, default 0), `detection_threshold`
  (0.05–0.95, RT-DETR arm), `max_instances` (0–100, RT-DETR arm),
  `export_boxes` (default true — draw this entry's RT-DETR boxes
  on the manifest), and the region quad `bbox_x/y/w/h` (default -1
  = unscoped; the popup's embedded canvas draws it — an optional
  search REGION, not a detector box).
- `sam2[]` — the detector + SAM2 arm (Impact pack), the FULL
  TWO-STEP: the specialized detector proposes SEGS, SAM2 refines
  each into a mask. `labels` (REQUIRED — a comma-joined SET from
  the closed THREE-word vocabulary `person`, `face`, `hand`;
  any other word refuses loud; ONE detector family per entry —
  person rides the segm model, face/hand ride the bbox models,
  mixing families in one entry refuses loud). `figures`
  (PRIMARY only, chips 1–10 — after detection, pick instance
  numbers; each picked figure gets its own `mask_figure_<n>`
  mask carved by the SAME two-step on the picked subset). The
  knobs (all per-entry, node-faithful ranges): detector side —
  `detection_threshold` (0.05–0.95, default 0.5),
  `detection_dilation` (−512–512, default 10), `crop_factor`
  (1–100, default 3), `drop_size` (1–16384, default 10); SAM
  side — `sam_threshold` (0.5–1, default 0.93),
  `sam_dilation` (−512–512, default 0), `box_expansion`
  (0–1000, default 0), `hint_threshold` (0–1, default 0.7).
  The region quad `bbox_x/y/w/h` scopes the detector search
  exactly like sam3's scopes the text selection.
- `draw[]` — a painted PNG (alpha = strokes): `name`, `payload`
  (REQUIRED — the PNG path). The interactive paint canvas rides
  this leaf EMBEDDED in the popup.

## The laws (compose refuses LOUD)

- The FIRST standalone entry (sam3 before sam2, bag order within)
  is the PRIMARY: it anchors `mask_combined` and owns the primary
  arm (`via_rtdetr` on sam3; the detector labels + figures on
  sam2).
- Every later entry is its own named export carrying ITS OWN tune
  (per-entry thresholds/dilations/crop/drop — never the
  primary's).
- `figures` on a LATER sam2 entry refuses: the instances it picks
  from are the primary's detection.
- `via_rtdetr` on a later entry refuses: the RT-DETR readback is
  the primary's arm; give the entry a `prompt`.
- `draw` stacks ONTO a standalone source (the ordered union chain
  — one MaskComposite hop per payload, terminal
  `mask_combined_union`); draw without a standalone source
  refuses loud.
- A region quad scopes its selection on BOTH detector kinds (the
  shared canvas's face-owned fields; the primary's scopes
  `mask_combined`, an export's scopes its own search); -1
  everywhere = unscoped. A GENUINELY unknown entry key refuses as
  drift (the entry-surface law).
- Missing `input_image`, empty bags, wrong-typed or out-of-bounds
  knobs refuse loud (the popup's fields are the declaration — the
  schema gates every hop).

## When to use this card

- The user wants masks for an inpaint/outpaint flow and can NAME
  the target (a subject in words, a detector class — person,
  face, hand — or a painted payload).
- The user wants MULTIPLE masks from one image (stack sources,
  each with its own tune).
- The user wants the RT-DETR box manifest (`via_rtdetr` on the
  primary; `export_boxes` per entry ORs the draw).

The interactive canvases ride the mod popups EMBEDDED (paint on
`draw`, the region rectangle on BOTH detector kinds — stroke 95).
The studio card RETIRED at parity (2026-09-16, CONTRACT D) — this
card composes AND owns the mask surface.
