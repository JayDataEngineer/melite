---
description: Model-less quad-remesh card that runs the AutoRemesher node over an input mesh with quad-count and edge-shape controls.
kind: package-library
---

# @melite/3d-quad-remesh

`@melite/3d-quad-remesh` is a single-node card: one AutoRemesher graph over a required input mesh. It is model-less (`requiresModel: false`) — the remesher is deterministic engine-side code in the `melite-autoremesher-nodes` pack, which the card declares under `requires`. The cardPackages SSOT composes it from `./card`; there is no tool or client face.

## Contract

- `./card` — the card definition (`id: 'quad-remesh'`, sidebar key `3d`). Schema: `input` (required mesh), `target_quads` (0..200000, default 50000), `edge_scaling` (0..4, default 1), `sharp_edge` (0..180 degrees, default 90), `smooth_normal` (0..1, default 0), `adaptivity` (0..2, default 1), `anisotropy` (0..4, default 1). The node hardcodes `--smooth-normal 0.0`, so a non-zero `smooth_normal` refuses at compose rather than silently dropping. There is no preset and no `filename_prefix` knob — the compose stamps the output under `<runId>/remeshed`.
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

The card never loads a model; it runs whenever a flow stages a mesh through it.

#### What the model sees

Nothing — no model is on the lane; the AutoRemesher node receives the mesh and the seven gated numbers.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Un-textured output** — textures and UVs do not survive the remesh; re-baking is downstream work.
- **smooth_normal is acceptance-only** — the knob exists to refuse loudly; the node itself always runs with smoothing off.
