---
description: NVIDIA Kimodo-SOMA text-to-pose motion family — SOMA-77 NPZ clips plus an optional rigged-GLB bake at 30 fps.
kind: package-library
---

# kimodo

kimodo registers the NVIDIA Kimodo-SOMA family (form `form_motion_kimodo`, genre `motion`): text-to-motion generation over the SOMA-77 skeleton, shipped as pose NPZ clips, with an optional bake onto a rigged GLB. Weights come from the nvidia/Kimodo-SOMA-RP-v1.1 release; the family provisions `skin_standard.npz`, the SOMA-77 skin template.

## The compose action

`compose` outputs two handles: `motion_npz` (kind MOTION) and `animated_glb` (kind GLB). The build wires KimodoLoader → KimodoTextToPose, then — when chained motion inputs or a rigged GLB are present — RaySomaxBake at 30 fps.

Params: `prompt` (required — the family's one relation), `duration_sec` [1, 10] (default 5), `diffusion_steps` [10, 200] (default 25), `num_samples` [1, 4] (default 1), `num_transition_frames` [0, 60] (default 10), `cfg_type` (`separated` / `regular` / `nocfg`; default `separated`), `cfg_weight_a` and `cfg_weight_b` [0, 15] (defaults 2.5 and 5), the chaining inputs `motion_npz`, `motion_prompts`, `motion_constraints`, `preview_glb`, and `seed` (seed-sentinel rule; default 42).

## Recipes

Two recipe rows plus the no-op: `draft` (10 diffusion steps — fast iteration) and `polished` (200 steps — final quality).

## Model Experience

### Request context and condition

A run needs the prompt and the duration; everything else has a declared default. Chained `motion_npz` / `motion_prompts` / `motion_constraints` extend or stitch a clip; `preview_glb` carries the rigged mesh the bake arm dresses.

#### What the model sees

The prompt, duration, step count, the CFG type and weight pair, any chained motion inputs, and the optional rigged GLB; the graph is the loader → text-to-pose chain above, with the bake at 30 fps when rigged output is requested.

#### Token effect

Zero-direct: the action composes an engine graph, not a token stream. No value this family declares is measured in model tokens.

#### KV Cache effect

Independent: each run is self-contained; no shared context is declared.

## Known Limitations and Deferred Work

- **Single skeleton** — SOMA-77 only; no retargeting or skeleton-choice surface is declared.
- **Fixed bake rate** — RaySomaxBake runs at 30 fps; the params surface offers no fps override.
- **Live behavior unobserved** — defaults and bounds are documented from the DECL and the action build, not verified against the running model.

Exports: the plugin root, `./package.json`.
