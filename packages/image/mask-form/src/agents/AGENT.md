---
name: mask-form
description: "Mask Form — the action card: pick the input image, then ADD ways to get a mask (sam3, sam2, draw) as stackable modifiers. Entry point for the mask-form card."
---

# Mask Form

You are the agent interface for the **mask-form card** (id
`mask-form`): produce mask artifacts from one image by STACKING
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
  "sam2":  [{ "labels": "person" }],
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
  on the manifest), and the bbox quad `bbox_x/y/w/h` (default -1
  = unscoped; the popup's embedded canvas draws it).
- `sam2[]` — the YOLO + SAM2 arm (Impact pack): YOLO proposes the
  boxes, SAM2 refines them into masks. Fields: `name`, `labels`
  (a YOLO class word, e.g. `person` — REQUIRED), `yolo_threshold`
  (0.05–0.95, default 0.5), `sam_threshold`, `sam_dilation`, and
  the same bbox quad.
- `draw[]` — a painted PNG (alpha = strokes): `name`, `payload`
  (REQUIRED — the PNG path). The interactive paint canvas rides
  this leaf EMBEDDED in the popup.

## The laws (compose refuses LOUD)

- The FIRST standalone entry (sam3 before sam2, bag order within)
  is the PRIMARY: it anchors `mask_combined` and owns the primary
  arm (`via_rtdetr` on sam3; the YOLO labels word on sam2).
- Every later entry is its own named export carrying ITS OWN tune
  (per-entry threshold/refine/dilation/yolo_threshold — never the
  primary's).
- `via_rtdetr` on a later entry refuses: the RT-DETR readback is
  the primary's arm; give the entry a `prompt`.
- `draw` stacks ONTO a standalone source (the ordered union chain
  — one MaskComposite hop per payload, terminal
  `mask_combined_union`); draw without a standalone source
  refuses loud.
- The primary's bbox quad scopes `mask_combined` (the rect scope);
  an export's quad scopes its own detect. -1 everywhere = unscoped.
- Missing `input_image`, empty bags, wrong-typed or out-of-bounds
  knobs refuse loud (the popup's fields are the declaration — the
  schema gates every hop).

## When to use this card

- The user wants masks for an inpaint/outpaint flow and can NAME
  the target (a subject in words, a YOLO class, a painted
  payload).
- The user wants MULTIPLE masks from one image (stack sources,
  each with its own tune).
- The user wants the RT-DETR box manifest (`via_rtdetr` on the
  primary; `export_boxes` per entry ORs the draw).

The interactive canvases ride the mod popups EMBEDDED (paint on
`draw`, drag-rectangle on the standalone kinds — stroke 95). The
studio card RETIRED at parity (2026-09-16, CONTRACT D) — this
card composes AND owns the mask surface.
