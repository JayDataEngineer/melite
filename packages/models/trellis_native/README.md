---
description: Trellis (Native) family record — the trellis.cpp GGML engine lane producing UV-textured GLBs with the C++ postprocess chain, unoffered with no actions.
kind: package-library
---

# @melite/models-trellis_native

`@melite/models-trellis_native` is the model family package for Trellis Native (`form_3d_trellis_native`, genre 3d): the trellis.cpp GGML engine lane that turns an image into a UV-textured GLB, followed by the C++ postprocess — weld, fill, DC remesh, CuMesh QEM decimation, xatlas unwrapping, and a trilinear PBR bake. The DECL describes about 50 seconds per asset on a 4090 and names the upstream source `ilintar/trellis2-gguf`. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is `unoffered`: no actions, no defaults, no write plane — the engine lane owns invocation.

## Declaration

One variant row, `standard` with a `native` cell, plus the `Recipe` group whose `Default` row stamps nothing. No `lane_inputs`, no provisions, no actions — the DECL records identity, source, and the variant face.

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

- **No declared actions** — nothing here composes a run; the trellis.cpp engine lane owns invocation and postprocess.
- **Weight custody unstated** — no provisions, so GGML weight presence depends on the engine lane's own loading.
- **Performance figures** — the ~50s-on-4090 number is the DECL's description, not verified against the running engine.
