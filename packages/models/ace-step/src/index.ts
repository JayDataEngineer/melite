// families/audio/ace-step — the ace-step MODEL declaration (ONE
// model — the correction stroke 2026-09-08, operator order:
// "ACE-STEP ACE-BASE ACE-STEP-BASE-BF16. THEY ARE ONE MODEL").
// The truth: all four flat rows declared the SAME class
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
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
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
      "label": "Turbo Q8",
      "description": "the turbo distill, 8-bit — fast defaults",
      "group": "Variant",
      "route": "ace-step",
      // THE WEIGHTS TRUTH (2026-10-13): one lane, one file, one
      // CLI-verified artifact. The fork's loader takes model_path
      // verbatim; a lane that loads a different file is a different
      // lane (the fold law), so the quant split rides variants and
      // the four flat cell addresses survive as variant routes.
      "lane_inputs": {
        "model_path": "ACE-Step1.5-GGUF/ace-step-1.5-turbo-q8_0.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "ace-step",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/ACE-Step1.5-GGUF/turbo/ace-step-1.5-turbo-q8_0.gguf",
            "size_bytes": 6185460032,
            "sha256": "cd7bf272588f548d4a253f57483132ef0f8f54a549f26471b09caa72c654270b",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/ACE-Step1.5-GGUF",
            "size_hint_gb": 6.3
          }
        }
      ]
    },
    {
      "id": "turbo-bf16",
      "label": "Turbo BF16",
      "description": "the turbo distill at full bfloat16",
      "group": "Variant",
      "route": "ace-step-bf16",
      // THE WEIGHTS TRUTH (2026-10-13): one lane, one file, one
      // CLI-verified artifact. The fork's loader takes model_path
      // verbatim; a lane that loads a different file is a different
      // lane (the fold law), so the quant split rides variants and
      // the four flat cell addresses survive as variant routes.
      "lane_inputs": {
        "model_path": "ACE-Step1.5-GGUF/ace-step-1.5-turbo-bf16.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "ace-step-bf16",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/ACE-Step1.5-GGUF/turbo/ace-step-1.5-turbo-bf16.gguf",
            "size_bytes": 10090398272,
            "sha256": "93974239a29a1a821b3cc1b1ca7e1c6229b1a900a0e44a1a9770bb2271d2be5f",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/ACE-Step1.5-GGUF",
            "size_hint_gb": 10.2
          }
        }
      ]
    },
    {
      "id": "base",
      "label": "Base Q8",
      "description": "the base checkpoint, 8-bit — no turbo distill",
      "group": "Variant",
      "route": "ace-step-base",
      // THE WEIGHTS TRUTH (2026-10-13): one lane, one file, one
      // CLI-verified artifact. The fork's loader takes model_path
      // verbatim; a lane that loads a different file is a different
      // lane (the fold law), so the quant split rides variants and
      // the four flat cell addresses survive as variant routes.
      "lane_inputs": {
        "model_path": "ACE-Step1.5-GGUF/ace-step-1.5-base-q8_0.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "ace-step-base",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/ACE-Step1.5-GGUF/base/ace-step-1.5-base-q8_0.gguf",
            "size_bytes": 6185458880,
            "sha256": "76133710055859477303c21b34f8462d8f9995ee8959e7eca96b09a4db84d5ba",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/ACE-Step1.5-GGUF",
            "size_hint_gb": 6.3
          }
        }
      ]
    },
    {
      "id": "base-bf16",
      "label": "Base BF16",
      "description": "the base checkpoint at full bfloat16",
      "group": "Variant",
      "route": "ace-step-base-bf16",
      // THE WEIGHTS TRUTH (2026-10-13): one lane, one file, one
      // CLI-verified artifact. The fork's loader takes model_path
      // verbatim; a lane that loads a different file is a different
      // lane (the fold law), so the quant split rides variants and
      // the four flat cell addresses survive as variant routes.
      "lane_inputs": {
        "model_path": "ACE-Step1.5-GGUF/ace-step-1.5-base-bf16.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "ace-step-base-bf16",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/ACE-Step1.5-GGUF/base/ace-step-1.5-base-bf16.gguf",
            "size_bytes": 10090397120,
            "sha256": "aa4b0f27122bb93a8da18f82515674ed18c59f985316355b208e48a335b77cf4",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/ACE-Step1.5-GGUF",
            "size_hint_gb": 10.2
          }
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
