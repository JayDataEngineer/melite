---
description: Mask form card whose modifiers bar declares three mask sources — SAM3 selection, automated SAM2 detection, and ordered paint strokes.
kind: package-library
---

# @melite/image-mask

`@melite/image-mask` is the mask FORM card: an Inputs rail (`input_image`) plus a Modifiers bar. Every knob a mask source owns rides its bag entry, and each modifier leaf carries an embedded canvas preview. The cardPackages SSOT composes the card from `./card`; there is no tool or client face.

## Contract

- `./card` — the card definition. Three declared modifier kinds: `sam3[]` standalone — SAM3 selection from a CLIP text prompt, or RT-DETR person boxes refined by SAM3 (`via_rtdetr`), with an optional REGION scoping the search; `sam2[]` standalone — the automated detector-plus-SAM2 arm (Impact pack; the card declares its packs and weights, then provisions them); `draw[]` ordered — the painted payload whose alpha IS the strokes, stacking onto the combined mask in bag order. Standalone entries each produce their own mask export (order is void); the first standalone entry is primary and saves `mask_combined`, every further entry exports per name. A draw without a standalone source refuses loudly. Detector vocabulary is the three Impact specialized detectors — person (segm), face and hand (bbox); `figures` rides the primary `sam2` entry only. Weights live beside the lane in `@melite/models-mask` (`MASK_WEIGHTS`), and the card's provisions declare the downloads; a spec pins the two halves agree.
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the segmentation graph only when the card composes; no agent tool face ships.

#### What the model sees

The active segmentation models receive `input_image` plus each modifier's payload — the text prompt, detector boxes, or stroke alpha — as graph inputs.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Detector vocabulary is closed** — the 80-class COCO dropdown is gone by operator order; the three specialized detectors are the whole list.
- **Paint strokes need a standalone anchor** — a `draw`-only mask refuses; the ordered chain always stacks onto a source.
