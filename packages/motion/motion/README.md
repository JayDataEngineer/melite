---
description: Text-to-motion card, motion agent tool, and browser studio over the Kimodo TextToPose family, with chained re-skinning through RaySomaxBake.
kind: package-bundle
---

# @melite/motion-motion

`@melite/motion-motion` is the motion lane: the `motion` card (a Kimodo TextToPose renderer port producing SOMA-77 pose NPZ), the `motion` agent tool, and the bench studio that authors both. An optional `RaySomaxBake` arm re-skins the pose onto a rigged character GLB as an animated GLB artifact — the melite-poser stopgap. `./card` carries the card def, `./tool` the tool face (registered by melite-tools' cardTools gate), `./client` the browser half, and the manifest's `dsh.bundle.patch` (`./cordis.patch.yml`) inserts the row-mounted plugin (`motion-studio`) into the web profile so the loader materializes the client from `lib/client.js`. The cardPackages SSOT composes `./card`.

## Contract

- `./card` — the card definition (`id: 'motion'`, sidebar key `motion`). Family `kimodo` (DECL `@melite/models-kimodo`), declared `compose` action. Schema: `prompt` (required — verb-first, one continuous action per segment; multi-segment joins `|` and pairs with `motion_prompts`), `seed` (default 42), `duration_sec` (1..10, default 5 — upstream caps one segment at 10 s), `diffusion_steps` (10..200, default 25), `num_samples` (1..4), `num_transition_frames` (0..60, default 10), `cfg_type` (`separated` | `regular` | `nocfg`, default `separated`), `cfg_weight_a`/`cfg_weight_b` (0..15, defaults 2.5 text / 5 action), `motion_npz` (chain from a prior pose), `motion_constraints` (pinned joints, e.g. `left_foot:ground`), and `preview_glb` (a SOMAX-rigged character GLB). Flow seats `prompt`/`motion_npz`/`preview_glb` in, `motion_npz` + `animated_glb` out (`KimodoTextToPose.0`, `RaySomaxBake.0`).
- `./tool` — `buildMotionTool`, the `motion` tool face (preview field `prompt`).
- `./client` — the `defineStageViewRegistration` adapter that mounts `MotionCardEditor` (the pose-authoring tenant) on the bench stage slot; document rides `stage.params`, writes ride `onSave` to `onPatch`.
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

The `motion` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

Kimodo receives the gated prompt, seeds, duration, steps, cfg values, and constraint pins as graph inputs; the agent sees the tool's parameter schema and the caller's values.

#### Token effect

conditional — the schema occupies context only in sessions that register the tool; values ride only tool-call turns.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **One segment per 10 seconds** — upstream caps a single continuous action at 10 s; longer motion must chain segments through `motion_npz`.
- **cfg_type is a closed vocabulary** — the three modes are the whole list; a new mode is a schema change, not a value.
