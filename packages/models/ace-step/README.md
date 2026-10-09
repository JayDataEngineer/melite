---
description: ACE-Step 1.5 music generation family declared for the audio_cpp engine lane.
kind: package-library
---

# @melite/models-ace-step

The ACE-Step 1.5 music generation family. The package owns the family declaration — variants, checkpoint routes, and the plugin that registers them with the models service; it does not render a card or compose the audio lanes itself.

The DECL's source points at the huggingface repo `audio-cpp/audio.cpp-gguf`. Four variants cover the family: Standard is Turbo (q8 routes to `ace-step`, bf16 to `ace-step-bf16`), Base routes q8 to `ace-step-base` and bf16 to `ace-step-base-bf16`, the sft variant is the finetune (`ACE-Step1.5-SFT-GGUF`, q8), and xl is the XL Turbo flagship (`ACE-Step1.5-XL-GGUF`, bf16). A Recipe default row is the fresh-card landing. The flat checkpoint ids survive as variant cell routes, not as standalone models. Cards on the music lane board the family id and resolve checkpoint coordinates through the declaration; the family plugin `family-ace_step` composes through the engine's family table.

## Declaration

`src/index.ts` is the family's truth. The plugin injects `models` and registers the DECL inside `ctx.effect`, fiber-owned and transactional at boot. The DECL declares no defaults and no actions or mods.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The audio_cpp engine lane is not the comfyui engine, so the catalog emission serves the family no row (catalog law: only offered comfyui-engine families serve); the declaration registers in the models registry, where the music lane's cards resolve it.

#### Token effect

Zero-direct token effect — the package registers a model family; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **No defaults** — the DECL carries no defaults block, so nothing pre-stamps sampling settings; every caller states what it needs.
- **No actions or mods** — the family owns facts and variants only; all lane composition lives with the cards and flows that resolve its routes.
- **Flat ids ride as cell routes** — the four flat checkpoint ids (`ace-step`, `ace-step-bf16`, `ace-step-base`, `ace-step-base-bf16`) survive as variant cell routes; a draft addressing one resolves through the variant matrix, never as a standalone model.
