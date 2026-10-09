---
description: MOSS-SFX v2 sound-effect generation — text-to-SFX on the ComfyUI engine, hand-placed weights, durations from 0.5 to 300 seconds.
kind: package-library
---

# moss-sfx

moss-sfx registers the MOSS-SFX v2 family (form `form_sound`, label "MOSS-SFX v2", genre `audio`, engine `comfyui`): sound-effect generation from a text prompt — describe the SOUND, not the scene. Weights are hand-placed: `hand_placed_weights` names the `MOSS-SoundEffect-v2.0-src` tree with no per-file URL, so the operator places the directory and the engine validates it. The `lane_inputs` pin `family: moss_sfx_v2` and `model_path: MOSS-SoundEffect-v2.0-src`.

## The sfx action

`sfx` composes a three-node chain: LoadAudiocore → AudiocoreTTS (mode `tts`, the `AUDIACORE_TTS_AUTOFILL` pin) → SaveAudio under `<run>/sfx`.

Params: `prompt` (required — the family's one relation, with the describe-the-sound cure), `duration` [0.5, 300] seconds, `guidance_scale` [0, 20], `n_diffusion_steps` [1, 500], `seed` (seed-sentinel rule).

## Variants and recipes

One variant (`standard`, native route `moss-sfx`). Recipes stamp duration: `one_shot` (0.5 s — the card-schema floor), `ambience_bed` (300 s — the ceiling), and the no-op `default`.

## Model Experience

### Request context and condition

A run needs the prompt; duration, guidance, and step count ride defaults tuned to the sound's length class. Pick `one_shot` for short hits and `ambience_bed` for long beds — or state `duration` directly.

#### What the model sees

The prompt, the duration, guidance, and step count; the graph is the audiocore chain above.

#### Token effect

Zero-direct: an engine graph, not a token stream.

#### KV Cache effect

Independent: each run is self-contained.

## Known Limitations and Deferred Work

- **Hand-placed weights** — no provision row exists; a missing `MOSS-SoundEffect-v2.0-src` tree fails at engine validation, loudly but late.
- **Duration extremes are recipe-flavored** — 0.5 s and 300 s are the declared bounds; quality at the extremes is not verified against the running model.
- **One architecture** — this family is SFX v2 only; the MOSS TTS and VoiceGenerator checkpoints are the moss package's routes.

Exports: the plugin root, `./package.json`.
