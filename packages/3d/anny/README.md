---
description: Parametric human form card that bakes a GLB body from identity numbers, morph sliders, and an optional reference body.
kind: package-library
---

# @melite/3d-anny

`@melite/3d-anny` is the `anny` form card. It composes a parametric human body through the `AnnyParamsToGlb` ComfyUI node, with model facts from the `@melite/models-anny` family declaration. The cardPackages SSOT (`packages/engines/comfyui-cordis/src/cardDefs.ts`) composes it from `./card`; there is no tool face and no client face.

## Contract

- `./card` — the card definition (`id: 'anny'`). Schema: eleven identity dimensions (gender, age, muscle, weight, height, proportions, cupsize, firmness, african, asian, caucasian — each 0..1, default 0.5), 254 morph sliders (labels from `@melite/comfyui-card-kit/morphs`), an optional `body_glb` reference body, `resolution` (256..2048, default 768), and `framing` (1..3). The card is parametric end to end: `AnnyParamsToGlb` bakes the GLB from the numbers alone. Compose emits an eight-view turnaround sheet as the figure preview (`identityModel: 'anny'`).
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the anny graph only when the card composes; the package ships no agent tool face.

#### What the model sees

The graph receives the gated identity, morph, resolution, and framing values; `AnnyParamsToGlb` bakes the body from those numbers, optionally matched against `body_glb`.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Photo-to-body is not a card param** — an image drives the body only through the `hmr-estimate` verb; in-card photo intake is deferred.
- **Morph labels are a fixed catalog** — the 254 names ride `@melite/comfyui-card-kit/morphs`; arbitrary morph targets refuse at the schema gate.
