---
description: SkinTokens auto-rigging family — static mesh GLB to generated skeleton and learned skin weights on the dedicated GGML/CPU skintokens engine.
kind: package-library
---

# @melite/models-skintokens

`@melite/models-skintokens` is the model family package for SkinTokens (`form_auto_rig`, genre 3d): a static mesh GLB goes in, and a generated skeleton with learned skin weights comes out as a rigged GLB. The family runs on its own `skintokens` engine (TokenRig on GGML, CPU) — not ComfyUI — and the DECL declares no engine defaults: the engine lane owns its device choice. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is unoffered: no actions, no write plane — the auto-rig surface calls the engine lane, and this package owns the family record.

## Declaration

One variant row, `standard` with a `native` cell, plus the `Recipe` group whose `Default` row stamps nothing. No `lane_inputs`, no `actions`, no weights declared here.

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

- **No declared actions** — nothing here composes a run; the auto-rig surface and the engine lane own invocation and device.
- **CPU inference** — TokenRig rides GGML on CPU; rigging speed is the engine's, and no GPU lane is declared.
- **Rig quality** — skeleton and weight quality on arbitrary meshes is not verified against the running engine.
