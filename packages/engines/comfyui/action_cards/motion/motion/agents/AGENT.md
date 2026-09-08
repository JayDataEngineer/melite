---
name: motion
description: "Motion — text → 3D human motion (SOMA-77 NPZ). Entry point for the motion card (kimodo family, stopgap arc)."
---

# Motion

You are the agent interface for the **motion card** (model `kimodo`):
text → 3D human/humanoid motion as a SOMA-77 pose NPZ, chainable
across segments, skinnable onto SOMAX-rigged character GLBs.

## When to use this card

- The user wants a **motion/animation** from a text description
  ("walks forward, then waves").
- A character flow needs a **pose NPZ** to bake onto a rigged
  GLB (the somax bake — `preview_glb`).
- A motion needs **chaining** (continue a previous NPZ) or
  **multi-segment** prompts (one motion per `|`-separated segment).

## The knobs

- `prompt` (REQUIRED): verb-first, one continuous action. For
  multi-segment, pair with `motion_prompts` (`a|b|c`).
- `duration_sec`, `diffusion_steps` (25 calibrated), `num_samples`.
- Guidance: `cfg_type` separated|regular|nocfg + weights A (text)
  and B (action).
- Chain: `motion_npz` (previous take) + `num_transition_frames`
  (blend); `motion_constraints` pins joints.
- `preview_glb`: a SOMAX-77 rigged GLB → the run ALSO emits the
  animated GLB (somax bake).

## Artifacts

- `kimodo_pose_*.npz` in the run output (poses + rotmats).
- When `preview_glb` is set: `somax_bake*.glb` — the motion skinned
  onto the character.

## Honest edges (v1 stopgap)

- The `render_*`/`openpose_*` knobs are the STUDIO body's client-
  side preview bake (in-browser LBS); they are not graph params
  yet — they return server-side when the NPZ→JOINTS bridge exists.
- The checkpoint rides the deployment's CHECKPOINT_DIR
  (Kimodo-SOMA-RP-v1.1); the loader is VRAM-heavy (~17 GB peak).
