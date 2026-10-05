export const DECL = {
    "id": "moss",
    "label": "MOSS",
    "description": "MOSS text-to-speech — Nano, VoiceGenerator, and Local Transformer",
    "engine": "audio_cpp",
    // No defaults: the declared-plane door's catch (2026-10-12) — the
    // family declares no actions, so it declares no write plane, and
    // the engine lane owns its own backend choice.
    "source": {
        "type": "huggingface",
        "repo_id": "audio-cpp/audio.cpp-gguf",
        "note": ""
    },
    "genre": "audio",
    "variants": [
        {
            "id": "tts",
            "label": "TTS Nano",
            "description": "the Nano 100M checkpoint — plain text-to-speech",
            "group": "Variant",
            "route": "moss-tts",
            "cells": [
                {
                    "source": {
                        "filename": "MOSS-TTS-Nano-100M-GGUF"
                    },
                    "quant": "native",
                    "label": "Native",
                    "route": "moss-tts",
                }
            ]
        },
        {
            "id": "voicegen",
            "label": "VoiceGenerator",
            "description": "voice design",
            "group": "Variant",
            "route": "moss_voicegenerator",
            "cells": [
                {
                    "source": {
                        "filename": "MOSS-VoiceGenerator-GGUF"
                    },
                    "quant": "native",
                    "label": "Native",
                    "route": "moss_voicegenerator",
                }
            ]
        },
        {
            "id": "tts-local",
            "label": "TTS Local",
            "description": "the Local Transformer v1.5 checkpoint",
            "group": "Variant",
            "route": "moss-tts-local",
            "cells": [
                {
                    "source": {
                        "filename": "MOSS-TTS-Local-v1.5-GGUF"
                    },
                    "quant": "native",
                    "label": "Native",
                    "route": "moss-tts-local",
                }
            ]
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": [],
        }
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
            "default": "default"
        }
    ],
};
export const family = {
    name: "family-moss",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
