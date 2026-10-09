---
description: YuE2 music family — YuE2-3B style-plus-lyrics song generation with ABC planning, on the ComfyUI engine from the official Comfy-Org release.
kind: package-library
---

# @melite/models-yue2

`@melite/models-yue2` is the model family package for YuE2-3B music generation (`form_music`, genre audio, engine comfyui): a style caption plus lyrics go in, an ABC plan is drafted, and a song comes out as mp3. The DECL boards the official Comfy-Org release (`Comfy-Org/YuE2`, the `audio_yue2_text2music` template) and declares the `compose` action, one provision, and the required `prompt` relation. The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the music card binds the action. The lane is this package's own `actions.ts`, pinned to committed goldens in `tests/golden/`.

## Declaration

One checkpoint carries model, clip, and VAE (`yue2_3b_int8_convrot.safetensors`, provisioned from Comfy-Org at ~3.96 GB, sha256-pinned; the INT8 ConvRot cell declares an ~8 GB VRAM peak). Variant recipes: `short_sting` stamps `duration` 5 (the schema floor) and `full_length` stamps 360 (the ceiling); `Default` stamps nothing. The `compose` action's params: `prompt` (required — every music lane states what the song is), `lyrics`, `mode` (`full` / `melody` / `off`), `duration` (bounds 5–360), `n_diffusion_steps` (1–200), and a seed-sentinel `seed`. The build plans ABC with `YuE2GenerateABC` (mode `off` composes no planner), sizes the latent from `YuE2GenerateMusic`'s seconds output, samples with KSampler dpm_2 / sgm_uniform at cfg 1, and saves mp3 V0 under `<run>/music`.

```
.
./package.json
```

## Model Experience

### Request context and condition

#### What the model sees

- **prompt** — required; the style caption.
- **lyrics** — the sung words (absent rides as empty).
- **mode** — the ABC-planning pick.
- **duration / n_diffusion_steps / seed** — length, sampler depth, and the minted seed.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; the caption and lyrics are engine-side, never harness context.

#### KV Cache effect

Independent — each composition is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **One quant boarded** — only the INT8 ConvRot cell exists; the bf16 cell and the SheetSage2 cover encoder stay unboarded until a cover lane exists (the DECL's own source note).
- **Guidance is fixed** — cfg rides at 1 by design (guidance lives on the AR side); there is no cfg knob.
- **Song quality** — musicality and lyric adherence are not verified against the running model.
