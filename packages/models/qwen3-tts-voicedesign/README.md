---
description: Qwen3-TTS 1.7B voice-design family — instructed personas, description-to-voice design with .qvoice export, and reference cloning, on the ComfyUI engine.
kind: package-library
---

# @melite/models-qwen3-tts-voicedesign

`@melite/models-qwen3-tts-voicedesign` is the model family package for Qwen3-TTS 1.7B. It declares the family (`form_tts`, genre audio) with the `speak` and `export` actions and the `qvoice` / `qvoice_save` flavor mods, and it depends on `@melite/models-qwen3-tts`, re-exporting that package's `variantRoute`. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the TTS card binds the actions. Synthesis mechanics live in `@melite/comfyui-card-kit/tts-segments`; this package owns the three-lane facts.

## Declaration

Three lanes on one `Variant` group, one lane per released checkpoint. `customvoice` (default) performs text through preset personas with optional `style_instruction` — the 1.7B instruct lane; upstream reserves instruction control for the large checkpoint. `voicedesign` designs a voice from `design_prompt` and exports the `.qvoice` embedding; the lane requires `voice_name` + `design_prompt`, and its C++ task gate (`vdes`) refuses a steered task `tts`. `base` is the three-second clone lane: the `ref_audio` + `ref_text` pair or a `.qvoice` persona. The declared surface is the kit's 13-row TTS shape (text, persona and clone fields, sampling knobs, seed); the export row carries the seed-sentinel rule and `speak` mints branch-locally under the voice-lock law.

```
.
./package.json
./mods/qvoice
./mods/qvoice_save
```

## Weights

`snapshot_provisions` pins `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` at revision `5ecdb67327fd37bb2e042aab12ff7391903235d3`. The `CustomVoice-merged` and `Base-merged` checkpoints are hand-placed operator merges; the estate must merge them before those lanes run.

## Model Experience

### Request context and condition

#### What the model sees

- **text** — required; the words synthesized.
- **voice / style_instruction** — persona pick and instruct steer on the `customvoice` lane.
- **design_prompt + voice_name** — the voice description and persona name on the `voicedesign` lane.
- **ref_audio + ref_text** — the clone pair on the `base` lane.
- **temperature, top_p, top_k, speed, repetition_penalty, seed** — generation knobs.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; the spoken text is engine-side, never harness context.

#### KV Cache effect

Independent — each synthesis is its own engine request; the package contributes no shared prefix.

## Known Limitations and Deferred Work

- **Two hand-merged weights** — the `customvoice` and `base` lanes cannot run on a fresh estate until the operator merges their checkpoints; nothing here fetches them.
- **Design lane is export-only** — the `vdes` task gate refuses plain speech on the `voicedesign` lane; performance belongs to the other two lanes.
- **Unstated seeds mint at compose** — identical requests can yield different takes unless the seed is stated.
- **Voice quality** — design and instruct behavior are not verified against the running model.
