---
description: Step1X-3D texture family record — diffusion multi-view texture synthesis baked onto a UV atlas, unoffered with no actions of its own.
kind: package-library
---

# @melite/models-step1x_texture

`@melite/models-step1x_texture` is the model family package for Step1X-3D Texture (`form_3d_step1x_texture`, genre 3d): diffusion-based texture synthesis that turns one reference image into six multi-view images through the SDXL ig2mv flow and bakes them onto a UV atlas, filling all surfaces with no coverage gaps — the property that separates it from camera projection. The DECL describes the model as 3.5B parameters, about 15 seconds per asset on a 4090. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is `unoffered`: no actions, no defaults, no write plane — the composing surface owns the knobs.

## Declaration

One variant row, `standard` with a `native` cell, plus the `Recipe` group whose `Default` row stamps nothing. No `lane_inputs`, no provisions, no actions — the declaration is the family identity and its variant face.

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

- **No declared actions** — nothing here composes a graph or provisions the 3.5B weights; a flow stage that wants the texture bake owns its own loading.
- **Weight custody unstated** — no provisions means this package cannot vouch for weight presence on any estate.
- **Performance figures** — the 3.5B / ~15s-on-4090 numbers are the DECL's description, not verified against the running engine.
