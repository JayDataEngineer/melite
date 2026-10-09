---
description: RTX video-upscale family record — the Nomos 4x upscaler weight and variant rail for video super-resolution, with no declared actions.
kind: package-library
---

# @melite/models-rtx-vsr

`@melite/models-rtx-vsr` is the model family package for video upscaling (`form_video_upscale`, genre video). It declares the family and its one provisioned weight, `4xNomos2_hq_dat2.pth` (Phhofm's GitHub release, folder `upscale_models`, sha256-pinned at 140,196,334 bytes). The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is `unoffered`: it declares no actions and no defaults, so it owns no write plane — the composing surface owns the knobs, and this package owns the model facts and the weight receipt.

## Declaration

One variant row, `standard` with a single `native` cell, plus the `Recipe` group whose `Default` row stamps nothing. There is nothing else on the DECL — no `defaults`, no `lane_inputs`, no `actions`.

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect — the family declares no request fields; whatever composes the upscale graph speaks for itself.

#### KV Cache effect

Independent — the family issues no request and contributes no cache prefix.

## Known Limitations and Deferred Work

- **No declared actions** — nothing here composes a graph; a surface that wants the upscaler must bind it elsewhere or the weight stays unused.
- **Upscaler quality** — the Nomos weight's output character is not verified against the running engine.
- **Single weight** — no alternative scale factors or backbones are declared; a second upscaler is a family change.
