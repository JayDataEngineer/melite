// families/audio/ace-step — the ace-step MODEL declaration (ONE
// model — the correction stroke 2026-09-08, operator order:
// "ACE-STEP ACE-BASE ACE-STEP-BASE-BF16. THEY ARE ONE MODEL").
// The py truth: all four flat rows declared the SAME class
// AceStep — one model exploded by the flattener. The hierarchy is
// the CASCADE the paper prescribes (§3.2.3 interception: base ←
// variant ← cell, monoid-merged), not sibling re-writes:
//
//   model  ace-step        (the head — Turbo Q8; ONE unit)
//     variant standard    (Turbo)
//       cell native  q8   → route 'ace-step'           (the head row)
//       cell bf16         → route 'ace-step-bf16'      (Turbo BF16)
//     variant base        (Base)
//       cell native  q8   → route 'ace-step-base'      (Base Q8)
//       cell bf16         → route 'ace-step-base-bf16' (Base BF16)
//     variant sft         (the finetune — card 'music-native', its own GGUF)
//       cell native  q8   → route 'ace-step-sft'
//     variant xl          (the flagship — card 'music-native', its own GGUF)
//       cell bf16         → route 'ace-step-xl'
//
// The flat ids SURVIVE as cell routes (derived serving, every
// runtime address unchanged); the DECLARATION is one component.
// Mods would ride the MODEL level (inherited by every variant and
// quant — the mutation law); ace-step boards none.
//
// PLUGIN SHAPE (the discharge stroke): every model is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "ace-step",
  "label": "ACE-Step 1.5",
  "description": "ACE-Step 1.5 music generation",
  "engine": "audio_cpp",
  "defaults": {
    "backend": "cuda"
  },
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
      "resolver_defaults": {
        "duration": 120,
        "sample_rate": 44100
      },
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
      "resolver_defaults": {
        "duration": 120,
        "sample_rate": 44100
      },
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

export const family: Plugin = {
  name: "family-ace-step",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
