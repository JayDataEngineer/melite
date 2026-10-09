---
description: Sound-effect card over the MOSS-SFX-v2 node in the melite-audio-nodes pack.
kind: package-library
---

# @melite/audio-sfx

`@melite/audio-sfx` is the sfx card: one family (`moss-sfx`, MOSS-SFX-v2) on the `sfx` action, served by the `melite-audio-nodes` extension pack that the card declares under `requires`. The package has a single source module — `src/card.ts` IS the root face the cardPackages SSOT composes (`@melite/audio-sfx`), so there is no separate card subpath and no tool or client face.

## Contract

- `.` — the card definition and registration (`id` per sidebar key `audio`): the root module carries `inject = ['comfyui']` and registers the card. Schema: `prompt` (required — describe the SOUND, not the scene), `guidance_scale` (0..20, default 4), `n_diffusion_steps` (1..500, default 100 — declared 1:1 with the upstream node; the pipeline's declared 100/4.0 defaults are the 2026-09-23 alignment), `duration` (0.5..300 s, default 10), and `seed` (−1).
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the sfx graph only when the card composes; no agent tool face ships.

#### What the model sees

MOSS-SFX-v2 receives the gated sound description and the guidance, steps, duration, and seed values as graph inputs.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **One family, one action** — the card boards only moss-sfx; a second sfx model means a new family DECL plus a dispatch arm.
- **Defaults mirror the upstream node** — parameter drift between this schema and the pipeline shows up as a compose-time refusal, not a silent remap.
