---
description: See-Through anime layer-decomposition family record — character, clothing, and background layer splits, declared weightless with no actions.
kind: package-library
---

# @melite/models-see-through

`@melite/models-see-through` is the model family package for See-Through, the anime layer-decomposition model (`form_image_seethrough`): an image goes in, and character, clothing, and background layers come out. The DECL names the upstream source `layerdifforg/seethroughv0.0.2_layerdiff3d`. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is `unoffered`: no actions, no defaults, no provisions — the weightless record whose weights ride the engine's own loading, and the composing surface owns the knobs.

## Declaration

One variant row, `standard` ("Native (weightless)"), plus the `Recipe` group whose `Default` row stamps nothing. No `lane_inputs`, no `actions` — the declaration is the family identity and its variant face.

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect — the family declares no request fields.

#### KV Cache effect

Independent — the family issues no request and contributes no cache prefix.

## Known Limitations and Deferred Work

- **No declared actions** — nothing here composes a graph or provisions weights; a flow stage that wants the split owns its own loading.
- **Weight custody unstated** — the DECL carries no provisions, so weight presence depends on the engine lane, and this package cannot vouch for it.
- **Split quality** — layer accuracy is not verified against the running engine.
