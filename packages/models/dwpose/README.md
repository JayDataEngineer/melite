---
description: DWPose family declaration, whole-body pose detection staged as a weightless unoffered row.
kind: package-library
---

# @melite/models-dwpose

The DWPose family — whole-body pose detection, the preprocessor lane for pose-guided generation, declared on the comfyui engine (genre other). The DECL marks the family unoffered and carries no actions; the row exists so pose-guided consumers can resolve the family id.

The `family-dwpose` plugin registers the DECL with the models service. The detection graphs that would consume the family id are composed by the consumers that resolve it, not in this package.

## Declaration

`src/index.ts` declares the DECL and the `family-dwpose` plugin. There is no actions module and no mods tree.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL registers in the models registry only; the catalog emission serves it no row (only offered comfyui-engine families serve), and it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Unoffered** — the family serves no catalog row; it resolves as a registry route only.
- **No actions** — no pose-detection graph is composed here; consumers that resolve the family id own their lanes.
- **Weightless** — no checkpoint rides the action plane; the family carries no provisions of its own account.
