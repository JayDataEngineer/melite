---
description: Qwen3-TTS 0.6B text-to-speech family — preset-persona and reference-clone speech plus persona (.qvoice) export, on the ComfyUI engine.
kind: package-library
---

# @melite/models-qwen3-tts

`@melite/models-qwen3-tts` is the model family package for Qwen3-TTS 0.6B. It declares the family (`form_tts`, genre audio), the `speak` and `export` actions, and the `qvoice` / `qvoice_save` flavor mods. The estate boot mounts it as a Cordis plugin; the family registers through `ctx.models.registerFamily` inside `ctx.effect`, so a dispose retracts it whole. The TTS card binds the actions, and `@melite/models-qwen3-tts-voicedesign` (the 1.7B family) depends on this package and re-exports its `variantRoute` helper. Synthesis mechanics live in `@melite/comfyui-card-kit/tts-segments`; this package owns the family facts, not the nodes.

## Declaration

Two variants on one `Variant` group. `customvoice` (default) performs text through a `PRESET_SPEAKERS` persona (nine named voices; `none` clears the persona) or through a saved `.qvoice` embedding loaded by the `qvoice` mod. `base` is the three-second voice-clone lane: the reference pair (`ref_audio` + `ref_text`) or a `.qvoice` persona, one complete source. The `export` action writes a persona embedding (`qvoice: AUDIO` output); it requires `voice_name` + `design_prompt` together and conflicts with `ref_audio`, `style_instruction`, and a stated `.qvoice`. The declared surface carries the sampling knobs (`temperature` 0.05–2, `top_p` 0–1, `top_k` 0–1000, `speed` 0.5–2, `repetition_penalty` 0.8–2) plus `seed`; `speak` mints its seed branch-locally under the voice-lock law, and only the export row carries the seed-sentinel rule.

```
.
./package.json
./mods/qvoice
./mods/qvoice_save
```

## Weights

`snapshot_provisions` pins `Qwen/Qwen3-TTS-12Hz-0.6B-Base` at revision `5d83992436eae1d760afd27aff78a71d676296fc`. The `CustomVoice-merged` checkpoint is a hand-placed operator merge and is not fetchable; a fresh estate must merge it before the `customvoice` lane runs.

## Model Experience

### Request context and condition

#### What the model sees

- **text** — required; the words synthesized (a blank refuses in the field's voice).
- **voice / style_instruction** — persona pick and steer on the `customvoice` lane.
- **ref_audio + ref_text** — the clone pair on the `base` lane.
- **voice_name + design_prompt** — the export action's persona halves.
- **temperature, top_p, top_k, speed, repetition_penalty, seed** — generation knobs.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; the text the model speaks is engine-side, never harness context.

#### KV Cache effect

Independent — each synthesis is its own engine request; the package contributes no shared prefix.

## Known Limitations and Deferred Work

- **No instruction control on 0.6B** — `LANE_TOPOLOGY` marks both lanes `instruction_control: false`; style steering belongs to the 1.7B `qwen3-tts-voicedesign` family.
- **Hand-merged CustomVoice weight** — the `customvoice` lane cannot run on a fresh estate until the operator merges the checkpoint; nothing here fetches it.
- **Unstated seeds mint at compose** — identical requests can yield different takes unless the seed is stated.
- **Persona quality** — voice similarity and export fidelity are not verified against the running model.
