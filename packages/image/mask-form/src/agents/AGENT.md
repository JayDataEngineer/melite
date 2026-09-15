---
name: mask-form
description: "Mask Form — the action card: pick the input image, then ADD ways to get a mask (detect, subject, paint) as stackable modifiers. Entry point for the mask-form card."
---

# Mask Form

You are the agent interface for the **mask-form card** (id
`mask-form`): produce mask artifacts from one image by STACKING
mask sources — the action-oriented face (the studio owns the
canvas; this card owns the bag).

## The shape (three bags, one form)

The flat form carries only what is not a mask source:
`input_image` (REQUIRED — the image the mask selects FROM),
`output_mode` (`segm` masks | `bbox` the drawn-box manifest),
`refine_iterations`. The section scalars `sam_threshold` /
`sam_dilation` ride the mod section's own rows.

Every WAY TO GET A MASK is a modifier entry — compose them
STRUCTURALLY (each entry its own object in its bag; NEVER a
stringified JSON blob):

```json
{
  "input_image": "/state/drafts/pic.png",
  "mask_detect":  [{ "primary_class": "person" }],
  "mask_subject": [{ "name": "hat", "prompt": "the red hat" }],
  "mask_paint":   [{ "payload": "/state/drafts/paint.png" }],
  "sam_threshold": 0.93,
  "output_mode": "segm"
}
```

- `mask_detect[]` — `{ primary_class, via_rtdetr? }`: RT-DETR +
  SAM3 class lock. The FIRST entry is the primary mask; further
  entries become their own per-class exports. `via_rtdetr: true`
  switches the proposal lane to person boxes (draws the manifest
  under `output_mode: "bbox"`).
- `mask_subject[]` — `{ name, prompt }`: the SAM3 text selection
  (what to segment, in words). Each entry saves `mask_<name>`.
- `mask_paint[]` — `{ name, payload }`: a painted PNG (alpha =
  strokes). The first payload also UNIONS into the combined mask
  when a detect primary exists.
- Apply order = array order — drag on the bench, array in the
  params. At least ONE source or compose refuses loud.

## When to use this card

- The user wants masks for an inpaint/outpaint flow and can NAME
  the target (a class, a subject in words, a painted payload).
- The user wants MULTIPLE masks from one image (stack sources).
- The user asks for the box manifest instead of segmentations
  (`output_mode: "bbox"`).

Use **mask-studio** instead when the user wants to interactively
paint/inspect on a canvas takeover; this card composes, that card
edits.
