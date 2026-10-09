---
description: LTX 2.3 video family — the 30-step Dev and 8-step Distilled routes, unoffered: route registration only.
kind: package-library
---

# ltx-2-3

ltx-2-3 registers the LTX 2.3 video family (genre `video`) as an unoffered declaration: two run routes, no actions, no defaults, no lane inputs, no provisions. The DECL's description field is empty — the variant hints carry the family's whole story.

## Routes

- `dev` — routes `ltx-2-3-dev` (INT8 ConvRot cell, about 22 GB VRAM peak) and `ltx-2-3-dev-fp8` (about 25 GB). The 30-step base: highest quality, supports LoRA.
- `distilled` — routes `ltx-2-3-distilled` and `ltx-2-3-distilled-fp8`. The 8-step distilled checkpoint: fast, CFG=1.
- `default` recipe — no-op stamp.

## Model Experience

### Request context and condition

Cards bind this family by id and pick a route; there is no write plane here. Sampling, resolution, and image-conditioning truth live with the engine lane that serves the chosen route.

#### What the model sees

Undeclared here — no params, weights, or node inputs are named by this DECL.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — nothing shared is declared.

## Known Limitations and Deferred Work

- **Empty description** — the DECL's description is an empty block; the family's summary lives only in variant hints.
- **No provisions** — the dev and distilled checkpoint downloads are not declared here; the engine rail or the operator provisions them.
- **No action surface** — every sampling knob rides the serving lane's vocabulary, not this package's.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
