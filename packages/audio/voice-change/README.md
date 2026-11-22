---
description: Voice-change card over the upstream SeedVCRun node — re-voice speech or singing into a reference voice.
kind: package-library
---

# @melite/audio-voice-change

`@melite/audio-voice-change` is the voice-change card (sidebar key `audio`). One family boards: `seed-vc`, and the card owns only dispatch — the convert segment lives in the family package (`@melite/models-seed-vc` `actions.ts`), resolved through the guarded dynamic seat in `./src/family-seats.ts` (the plugin law: a missing family package costs its own seat, never this card's load). The schema is upstream 1:1 (SeedVCRun's own INPUT_TYPES): `source_audio` + `ref_audio` (both required paths), `steps` 30, `speed` 1, `inference_cfg_rate` 0.7, `pitch_shift` 0, `f0_condition` false, `auto_f0_adjust` true, `unload_model` true. `f0_condition=true` is the singing lane (the 44.1k base-f0 DiT + RMVPE pitch tracking); false is the speech lane (the 22.05k small-wavenet DiT) — a params stamp, never a second route.

## Contract

- `.` / `./card` — the card definition (`lib/card.js`): registers through `ctx.effect(() => ctx.comfyui.registerCard(...))` with its `identity` rung; the cardPackages SSOT composes the card from `./card`. No `src/index.ts` host marker and no tool face — the sfx precedent's bare-card shape.
- `./package.json` — the manifest.

## Gates

```sh
pnpm run test
node tools/check-package-readmes.mjs --only audio/voice-change
```

## Model Experience

### Request context and condition

The card is a compose surface; it conditions a ComfyUI run when the bench presses its stage.

#### What the model sees

Nothing directly — the card has no agent tool. An agent reaches the lane through the bench: `melite_discover` names the card, `melite_load` opens its schema and boarded family, `melite_construct add_stage` lands the stage with the two audio paths.

#### Token effect

No request tokens; the schema's tooltips and defaults ride the UI form, not the transcript. A composed stage row carries the card id and params in the saved bench doc.

#### KV Cache effect

None — no agent-loop participation.

## Known Limitations and Deferred Work

The pack self-loads every weight at first run (~5GB resident); `unload_model=true` frees it per run. The engine must carry the upstream ComfyUI_Seed-VC extension (the family's provisions land the weights; the extension pack is the engine's own seat).
