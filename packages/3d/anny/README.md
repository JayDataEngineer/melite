---
description: Parametric human form card that bakes a GLB body from identity numbers, morph sliders, and an optional reference body.
kind: package-library
---

# @melite/3d-anny

`@melite/3d-anny` is the `anny` form card. It composes a parametric human body through the `AnnyParamsToGlb` ComfyUI node, with model facts from the `@melite/models-anny` family declaration. The cardPackages SSOT (`packages/engines/comfyui-cordis/src/cardDefs.ts`) composes it from `./card`; there is no tool face and no client face.

## Contract

- `./card` — the card definition (`id: 'anny'`). Schema: eleven identity dimensions (gender, age, muscle, weight, height, proportions, cupsize, firmness, african, asian, caucasian — each 0..1, default 0.5), 254 morph sliders (labels from `@melite/comfyui-card-kit/morphs`), an optional `body_glb` reference body, and an optional `body_image` body photo (a stated photo becomes the body via SAM-3D-Body estimation — image > glb > parametric bake). The card is parametric end to end: `AnnyParamsToGlb` bakes the GLB from the numbers alone. The figure preview is the native /poser shaped bind mesh (`identityModel: 'anny'`), rendered by the base form's mesh stage — the eight-view turnaround sheet died with the blender lane (2026-11-01).
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the anny graph only when the card composes; the package ships no agent tool face.

#### What the model sees

The graph receives the gated identity, morph, and body values; `AnnyParamsToGlb` bakes the body from those numbers, optionally matched against `body_glb` (a stated `body_image` photo makes the body the SAM-3D-Body estimate instead).

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Person picking stays verb-side** — the `body_image` photo face rides the card (image > glb > sliders precedence); the `person_index` picker stays on the `hmr-estimate` verb.
- **Morph labels are a fixed catalog** — the 254 names ride `@melite/comfyui-card-kit/morphs`; arbitrary morph targets refuse at the schema gate.
