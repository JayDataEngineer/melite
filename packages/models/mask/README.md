---
description: The mask studio's selection lane as a model family — SAM3/RT-DETR detection, the SAM2 arm, and paint exports, bound by the mask card.
kind: package-library
---

# mask

mask registers the model family `mask-select` (label "Mask", genre `image`): the mask studio's selection lane declared as one action — SAM3 CLIP/RT-DETR detection, the SAM2 impact-pack arm, and paint exports — which the mask card binds through the DECL's declared-action interlock. The id is `mask-select`, deliberately not the package name: a family id must not shadow its card.

## Weights

The three weights are the action's own constants (`MASK_WEIGHTS`, the LANE_FILES pattern): `sam3.1_multiplex_fp16.safetensors` (the SAM3 multiplex checkpoint), `rt_detr_v4-x-hgnet_fp32.safetensors` (the RT-DETR detector), and `sam2.1_hiera_large.pt` (the SAM2 arm). No variant swaps them and no row names them; the mask card's provisions declare the downloads, and a card spec pins the agreement between lane constants and provision rows.

## The select action

The family carries one variant (`select`, route `mask-select`, no cells) and one action, `select`. The action declares no params of its own — the card's schema walk owns the knobs (detect hints, the drawn box manifest, paint exports, mask composition), and the build reads the walked shape beneath flat params. Output: one MASK handle. A composed lane also saves intermediates under the run directory: the primary mask, a union composite when a global paint export is stated, and detection-box overlays when box export is requested. `parseMaskLaneFacts` returns the three constants closed — an empty loader name is unrepresentable by construction.

## Model Experience

### Request context and condition

A run needs the image (an upload or an upstream `$spell` tensor) and the card's selection choices; the family contributes the weights and the node tree, the card the vocabulary.

#### What the model sees

One image, the drawn detect hint, and any paint-export paths; the three weights wire into the lane's loaders by constant.

#### Token effect

Zero-direct: the action composes an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Id divergence** — family id `mask-select` versus package name `mask`; deliberate, but a standing search trap across the estate.
- **No declared params** — tuning vocabulary lives on the card schema; this package cannot state it, and the action trusts the walked shape.
- **Weights pinned in code** — a weight-file rename must land in the lane constants and the card spec together, or boarding refuses.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
