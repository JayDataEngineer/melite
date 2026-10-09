---
description: Pixel upscaler run-route registration — the GRL and RRDB routes over one empty-parameter face; unoffered.
kind: package-library
---

# pixel_upscale

pixel_upscale registers the Pixel Upscaler family (label "Pixel Upscaler", genre `image`) as a run-route declaration, unoffered: two variants, no actions, no defaults, no lane inputs, no provisions. The DECL's description is empty; the route names carry the family's identity.

## Routes

- `grl` — route `pixel_apisr_grl`; the DECL gives the variant's quant cell no label.
- `rrdb` — route `pixel_apisr_rrdb`; likewise unlabeled.
- `default` recipe — no-op stamp.

Both routes belong to the pixel-API super-resolution lane; which weights each loads and at what scale is the serving lane's truth, not this DECL's.

## Model Experience

### Request context and condition

Cards bind this family by id and pick a route; scale factor, tiling, and model weights belong to the lane that serves the route.

#### What the model sees

Undeclared here — no params, weights, or node inputs are named by this DECL.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — nothing shared is declared.

## Known Limitations and Deferred Work

- **Empty description** — the DECL's description block is empty; documentation has to lean on route ids alone.
- **Unlabeled cells** — both variants' quant cells carry empty labels, so pickers render bare route names.
- **No action surface** — upscale knobs ride the serving lane's vocabulary; this package cannot tune or fetch them.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
