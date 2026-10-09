---
description: LTX 2.3 Director-workflow registration — Dev, Distilled, and hidden Legacy routes; unoffered.
kind: package-library
---

# ltx-director-distilled

ltx-director-distilled registers the Director-workflow face of LTX 2.3 text- and image-to-video generation (genre `video`), unoffered: three run routes, no actions, no defaults, no lane inputs, no provisions.

## Routes

- `dev` — route `ltx-director-dev`: 30+ steps, maximum quality, a different checkpoint than the distilled tier.
- `distilled` — route `ltx-director-distilled` (order 0, the family's landing pick): 8 steps, roughly 3 seconds per segment on a 4090-class card — the fast preview tier.
- `legacy` — route `ltx2`, hidden: the pre-Director LTX 2 route, kept reachable for old cards.
- `default` recipe — no-op stamp.

## Model Experience

### Request context and condition

The card names the family and picks a route; segment length, resolution, and conditioning belong to the Director lane that serves the route, not to this DECL.

#### What the model sees

Undeclared here — the DECL names no weights or params; the serving lane owns the graph.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — nothing shared is declared.

## Known Limitations and Deferred Work

- **Hidden legacy route** — `ltx2` remains resolvable for old cards but is not advertised, and its checkpoint era differs from the Director tiers.
- **No provisions or actions** — the Director graph's weights and knobs are the serving lane's truth; this package cannot tune or fetch them.
- **Throughput claim is a hint** — the ~3 s/segment figure is the variant hint's own wording, not verified against the running model.

Exports: the plugin root, `./package.json`.
