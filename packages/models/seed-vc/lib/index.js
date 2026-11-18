import { convert } from "./actions.js";
export const DECL = {
    "id": "seed-vc",
    "form": "form_voice",
    "label": "Seed-VC",
    "description": "Seed-VC voice conversion — re-voice speech or singing into a reference voice, content and rhythm preserved",
    "engine": "comfyui",
    "genre": "audio",
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
    // user-provided seats — the clip to convert and the voice to
    // borrow. No variant-class rows: this family's served face
    // exposes no steps+cfg pair (the census's surface-derived carve).
    "required_defaults": [
        { "name": "source_audio", "class": "user" },
        { "name": "ref_audio", "class": "user" },
    ],
    // THE WHOLE WEIGHT SET, DIGEST-PINNED: the upstream wrapper loads
    // every file below at init from the engine's models/TTS tree
    // (seedvcnode.py: model_path = models_dir/TTS/Seed-VC, the
    // bigvgan + whisper dirs beside it). No hand_placed_weights rows:
    // every file has a per-file upstream URL the provision door can
    // name (the moss-sfx source-tree carve does NOT apply here), so
    // fresh estates provision the lane whole. sha256 + size from the
    // HF LFS API (the resolve endpoint serves these exact bytes).
    "provisions": [
        // — the two DiT lanes (Plachta/Seed-VC) —
        {
            "name": "DiT_seed_v2_uvit_whisper_base_f0_44k_bigvgan_pruned_ft_ema.pth",
            "url": "https://huggingface.co/Plachta/Seed-VC/resolve/main/DiT_seed_v2_uvit_whisper_base_f0_44k_bigvgan_pruned_ft_ema.pth",
            "folder": "TTS/Seed-VC",
            "sha256": "883d19be9fe9c4bb2dce30d545cd77e5ed2b6326c7ed1c4d9a7ce8e555b163f9",
            "size_bytes": 820864573,
        },
        {
            "name": "DiT_seed_v2_uvit_whisper_small_wavenet_bigvgan_pruned.pth",
            "url": "https://huggingface.co/Plachta/Seed-VC/resolve/main/DiT_seed_v2_uvit_whisper_small_wavenet_bigvgan_pruned.pth",
            "folder": "TTS/Seed-VC",
            "sha256": "8ec8841b20bb46df9f7e8e570a6946a4b87b940133c7f0e778487ff33841f720",
            "size_bytes": 440312082,
        },
        // — the speaker embedder + F0 extractor —
        {
            "name": "campplus_cn_common.bin",
            "url": "https://huggingface.co/funasr/campplus/resolve/main/campplus_cn_common.bin",
            "folder": "TTS/Seed-VC",
            "sha256": "3388cf5fd3493c9ac9c69851d8e7a8badcfb4f3dc631020c4961371646d5ada8",
            "size_bytes": 28036335,
        },
        {
            "name": "rmvpe.pt",
            "url": "https://huggingface.co/lj1995/VoiceConversionWebUI/resolve/main/rmvpe.pt",
            "folder": "TTS/Seed-VC",
            "sha256": "6d62215f4306e3ca278246188607209f09af3dc77ed4232efdd069798c4ec193",
            "size_bytes": 181184272,
        },
        // — the 22.05k vocoder (speech lane) —
        {
            "name": "bigvgan_generator.pt",
            "url": "https://huggingface.co/nvidia/bigvgan_v2_22khz_80band_256x/resolve/main/bigvgan_generator.pt",
            "folder": "TTS/bigvgan_v2_22khz_80band_256x",
            "sha256": "e95ba25972d3de0628d99cd156e9315a9c018899bf739988959ebe3544080ced",
            "size_bytes": 449228171,
        },
        {
            "name": "config.json",
            "url": "https://huggingface.co/nvidia/bigvgan_v2_22khz_80band_256x/resolve/main/config.json",
            "folder": "TTS/bigvgan_v2_22khz_80band_256x",
            "sha256": "88a1f47acf747db0b21e97a389d838566147f7a5464583ff5c8d819d870f03ee",
            "size_bytes": 1405,
        },
        // — the 44.1k vocoder (singing/f0 lane) —
        {
            "name": "bigvgan_generator.pt",
            "url": "https://huggingface.co/nvidia/bigvgan_v2_44khz_128band_512x/resolve/main/bigvgan_generator.pt",
            "folder": "TTS/bigvgan_v2_44khz_128band_512x",
            "sha256": "d9fe7ec6bd0b44ed9d66973d5012d8181c1570b01e5c72df51973e241dccd357",
            "size_bytes": 489041291,
        },
        {
            "name": "config.json",
            "url": "https://huggingface.co/nvidia/bigvgan_v2_44khz_128band_512x/resolve/main/config.json",
            "folder": "TTS/bigvgan_v2_44khz_128band_512x",
            "sha256": "65b7f487bfaf15256056a75f6667ef5f640214c981922a111927873705ea4ddb",
            "size_bytes": 1403,
        },
        // — whisper-small content encoding (openai/whisper-small: the
        // weights + every config/tokenizer file from_pretrained reads) —
        {
            "name": "model.safetensors",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/model.safetensors",
            "folder": "TTS/whisper-small",
            "sha256": "1d7734884874f1a1513ed9aa760a4f8e97aaa02fd6d93a3a85d27b2ae9ca596b",
            "size_bytes": 966995080,
        },
        {
            "name": "config.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/config.json",
            "folder": "TTS/whisper-small",
            "sha256": "e6a2b489da1b5aed65a8eb8d1e7466fa867ad5643a8bc138ba708bd56b2875c4",
            "size_bytes": 1967,
        },
        {
            "name": "generation_config.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/generation_config.json",
            "folder": "TTS/whisper-small",
            "sha256": "71565b8ef50d0bf7a1193ed4bbed195b94e70c18894d81bba2f1233dcec3ab53",
            "size_bytes": 3868,
        },
        {
            "name": "preprocessor_config.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/preprocessor_config.json",
            "folder": "TTS/whisper-small",
            "sha256": "9b5cd03a36fbb8a627c64d98a5b5b126ead95a77720723944487311f0110b666",
            "size_bytes": 184990,
        },
        {
            "name": "normalizer.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/normalizer.json",
            "folder": "TTS/whisper-small",
            "sha256": "bf1c507dc8724ca9cf9903640dacfb69dae2f00edee4f21ceba106a7392f26dd",
            "size_bytes": 52666,
        },
        {
            "name": "tokenizer.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/tokenizer.json",
            "folder": "TTS/whisper-small",
            "sha256": "27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566",
            "size_bytes": 2480466,
        },
        {
            "name": "tokenizer_config.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/tokenizer_config.json",
            "folder": "TTS/whisper-small",
            "sha256": "2a4c4281cf9f51ac6ccc406fdc711a087afe6530f671fa7b80953edc498275ce",
            "size_bytes": 282683,
        },
        {
            "name": "vocab.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/vocab.json",
            "folder": "TTS/whisper-small",
            "sha256": "8f680bba319e01a653d2e8a5dbc17a9157179e0576e6ce74ce0c06356c6e24f9",
            "size_bytes": 835550,
        },
        {
            "name": "merges.txt",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/merges.txt",
            "folder": "TTS/whisper-small",
            "sha256": "2df2990a395e35e8dfbc7511e08c12d56018d8d04691e0133e5d63b21e154dc6",
            "size_bytes": 493869,
        },
        {
            "name": "special_tokens_map.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/special_tokens_map.json",
            "folder": "TTS/whisper-small",
            "sha256": "e67ae3a0aaa99abcd9f187138e12db1f65c16a14761c50ef10eef2c174a7a691",
            "size_bytes": 2194,
        },
        {
            "name": "added_tokens.json",
            "url": "https://huggingface.co/openai/whisper-small/resolve/main/added_tokens.json",
            "folder": "TTS/whisper-small",
            "sha256": "9715fd2243b6f06a5858b5e32950d2853f73dd5bc201aafcf76f5082a2d8acd1",
            "size_bytes": 34604,
        },
    ],
    "variants": [
        {
            // THE ONE VARIANT: native weights, the seed-vc route. The
            // wrapper loads BOTH DiT lanes at init (the 22.05k
            // small-wavenet for speech, the 44.1k base-f0 for singing) —
            // the lane pick is a params stamp (f0_condition), never a
            // weights swap, so the variant matrix carries one body.
            "id": "standard",
            "label": "Standard",
            "group": "Variant",
            "route": "seed-vc",
            "cells": [
                {
                    "quant": "native",
                    "label": "Native",
                    "route": "seed-vc",
                },
            ],
        },
        {
            // THE SINGING RECIPE (plane canon L1: wire_defaults is the
            // Recipe plane's macro, never a Variant row's): f0_condition
            //=true stamps the wrapper onto its 44.1k base-f0 DiT + the
            // 44k BigVGAN + RMVPE F0 extraction — the pitch-tracking
            // lane singing conversion needs (upstream's own tooltip:
            // "Must set to true for singing voice conversion"). The
            // speech lane stays the default: f0 unset.
            "id": "singing",
            "label": "Singing (F0)",
            "hint": "The 44.1k f0 lane — pitch-tracking conversion for singing.",
            "group": "Recipe",
            "wire_defaults": { "f0_condition": true },
            "cells": [],
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
        },
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
        },
        {
            "id": "Quant",
            "label": "Quant",
        },
        {
            "id": "Recipe",
            "label": "Recipe",
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
            "default": "default",
        },
    ],
    // THE LANE SURFACE (the z-image precedent): exactly the knobs the
    // voice-change card serves.
    "params": [
        "source_audio", "ref_audio", "steps", "speed",
        "inference_cfg_rate", "f0_condition", "auto_f0_adjust",
        "pitch_shift", "unload_model",
    ],
    // THE DECLARED ACTIONS (the atom vocabulary): the convert action
    // the voice-change card binds (the SeedVCRun lane). The admission
    // gate runs the facts parse at registration.
    "actions": [convert],
};
export const family = {
    name: "family-seed-vc",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { convert } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
