export const DECL = {
    "id": "ace-step",
    "form": "form_music",
    "label": "ACE-Step 1.5",
    "description": "ACE-Step 1.5 music generation",
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
            "id": "standard",
            "label": "Turbo",
            "description": "the turbo distill — fast defaults",
            "group": "Variant",
            "route": "ace-step",
            "cells": [
                {
                    "source": {
                        "filename": "ACE-Step1.5-GGUF"
                    },
                    "quant": "native",
                    "label": "Q8",
                    "route": "ace-step",
                },
                {
                    "source": {
                        "filename": "ACE-Step1.5-GGUF"
                    },
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "ace-step-bf16",
                }
            ]
        },
        {
            "id": "base",
            "label": "Base",
            "description": "the base checkpoint — no turbo distill",
            "group": "Variant",
            "route": "ace-step-base",
            "cells": [
                {
                    "source": {
                        "filename": "ACE-Step1.5-GGUF"
                    },
                    "quant": "native",
                    "label": "Q8",
                    "route": "ace-step-base",
                },
                {
                    "source": {
                        "filename": "ACE-Step1.5-GGUF"
                    },
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "ace-step-base-bf16",
                }
            ]
        },
        {
            "id": "sft",
            "label": "SFT",
            "description": "the finetune",
            "group": "Variant",
            "route": "ace-step-sft",
            // No resolver_defaults: the declared-plane door's catch
            // (2026-10-12) — the actionless family declares no write
            // plane, and duration/sample_rate had no estate reader (the
            // engine lane owns both).
            "cells": [
                {
                    "source": {
                        "filename": "ACE-Step1.5-SFT-GGUF"
                    },
                    "quant": "native",
                    "label": "Q8",
                    "route": "ace-step-sft",
                }
            ]
        },
        {
            "id": "xl",
            "label": "XL Turbo",
            "description": "the audio.cpp flagship",
            "group": "Variant",
            "route": "ace-step-xl",
            // No resolver_defaults: the declared-plane door's catch
            // (2026-10-12) — the actionless family declares no write
            // plane, and duration/sample_rate had no estate reader (the
            // engine lane owns both).
            "cells": [
                {
                    "source": {
                        "filename": "ACE-Step1.5-XL-GGUF"
                    },
                    "quant": "bf16",
                    "label": "BF16",
                    "route": "ace-step-xl",
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
    "has_agent": true,
};
export const family = {
    name: "family-ace-step",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
//# sourceMappingURL=index.js.map
