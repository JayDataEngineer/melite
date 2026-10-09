---
description: Stretchy Rig family record — DWPose TensorRT whole-body keypoint detection backing Stretchy Studio's 2D character auto-rig, unoffered and weightless.
kind: package-library
---

# @melite/models-stretchy-rig

`@melite/models-stretchy-rig` is the model family package for Stretchy Rig (`form_image_stretchy_rig`, genre other): Stretchy Studio's auto-rig backend, which reads whole-body keypoints from DWPose running on TensorRT to animate 2D characters. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`. The family is `unoffered`: no actions, no defaults, no write plane — the run router and the engine lane own their truths, and this package owns the family record.

## Declaration

One variant row, `standard` ("Native (weightless)"), plus the `Recipe` group whose `Default` row stamps nothing. No `lane_inputs`, no provisions, no actions — the DECL deliberately records identity only.

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

- **No declared actions** — nothing here composes a run; the Stretchy Studio lane owns invocation.
- **Weightless record** — the DECL carries no provisions, so TensorRT engine and DWPose weight custody live with the engine lane.
- **Keypoint quality** — detection accuracy is not verified against the running engine.
