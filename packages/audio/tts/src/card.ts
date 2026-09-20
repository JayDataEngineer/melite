// Tier 3 — the tts card (the tts_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ttsT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

export const schema = z.object({
  text: z.string().description("Text").extra('extra', { order: null, placeholder: "The words to speak", tooltip: "The text to synthesize — the design sample on the VoiceDesign lane", required: true, wtype: 'textarea', }),
  // ported voice surface (purge S-decls: the card is deleted
  // 0.7, seed -1; style_instruction/qvoice/voice_pca are ABSENT/defaultless
  // (bare = optional at parse, ''-absent at compose via ?? '' below).
  // NO speed/top_p (declares no such knobs — they ride the
  // AUDIACORE_TTS_AUTOFILL pin; old drafts naming them still parse via
  // the door's non-strict overlay but compose never reads them).
  voice: vocabulary(["ryan", "serena", "vivian", "aiden", "eric", "dylan", "sohee", "ono_anna", "uncle_fu"]).description("Voice").default("ryan").extra('extra', { order: null, tooltip: "Preset speaker persona (the CustomVoice lane only)", wtype: 'select', visible_when: 'model=qwen3-tts' }),
  style_instruction: z.string().description("Style Instruction").extra('extra', { order: null, tooltip: "Emotion and delivery control (e.g. 'speak with warm confidence') — the CustomVoice lane only", wtype: 'textarea', visible_when: 'model=qwen3-tts' }),
  // THE CLONE INPUTS (the README stroke 2026-09-21 — the 0.6B Base
  // lane clones from a 3-second reference): reference audio + its
  // transcript, base-lane only.
  ref_audio: z.string().role('path').description("Reference Audio").extra('extra', { order: null, tooltip: "3 seconds of the voice to clone (the Base lane only)", wtype: 'file', visible_when: 'model=qwen3-tts-base' }),
  ref_text: z.string().description("Reference Transcript").extra('extra', { order: null, tooltip: "What the reference audio says (the Base lane only)", wtype: 'textarea', visible_when: 'model=qwen3-tts-base' }),
  // the 0.05 floor is the ENGINE's truth (GPU receipt, hour 15: the
  // native node refuses temperature 0 — "must be positive when
  // sampling"); the schema declares the smallest positive tick of
  // its own step. The declaration follows the engine, never vice.
  // Synth sampling renders on the synthesis lanes only — design
  // sampling lives in the Design entry.
  temperature: z.number().description("Temperature").min(0.05).max(2).step(0.05).default(0.7).extra('extra', { order: null, visible_when: 'model=qwen3-tts|qwen3-tts-base' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: null, visible_when: 'model=qwen3-tts|qwen3-tts-base' }),
})

// THE BOARDED FAMILIES (2026-09-21 — three honest families: 0.6B
// CustomVoice, 0.6B Base, 1.7B VoiceDesign. The voice-lock card is
// dead — design boards here through the qvoice_save mod.)
export const BOARDED: string[] = ['qwen3-tts', 'qwen3-tts-base', 'qwen3-tts-voicedesign']

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'TTS',
  description: 'Text-to-speech — Qwen3-TTS: CustomVoice personas, 3-second voice clone, and instruction voice design',
  genre: 'audio',
  icon: 'microphone',
  principles: [
    'text is required — empty text fails',
    'the Base lane clones: reference audio + transcript required',
    'the VoiceDesign lane designs: state the Design mod (name + prompt)',
    'Use Voice Embedding (.qvoice) for consistent character voices',
    'Style Instruction controls emotion and delivery',
    'One line per call — serial execution for multi-line sequences',
  ],
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'tts',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'tts',
    boarded: [...BOARDED],
    tags: ['audio', 'tts', 'voice', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'audio', order: 3 },
    flowKinds: {
      inputs: { prompt: 'text' },
      outputs: { default: 'audio' },
      requiresModel: true,
    },
    // Load + TTS ride the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the h3 admission precedent): the card's
      // own schemastery walk validates types + bounds (temperature
      // is 0–2 — anything else refuses LOUD, never composes), fills
      // defaults; the composer reads the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      if (!(doc.text as string)?.trim()) {
        throw new Error("required param 'text' missing or empty on the tts card (the words to speak)")
      }
      // PER-LANE ADMISSION (the README stroke — each model takes
      // only its own inputs, refused loud, never silently skipped):
      // the cloner needs its 3-second reference; the designer needs
      // its Design entry (name + prompt).
      if (model.id === 'qwen3-tts-base') {
        if (!(doc.ref_audio as string)?.trim() || !(doc.ref_text as string)?.trim()) {
          throw new Error("required params 'ref_audio' + 'ref_text' missing or empty on the tts card (the Base lane clones — it needs its 3-second reference and transcript)")
        }
      }
      if (model.id === 'qwen3-tts-voicedesign') {
        const bag = doc.qvoice_save as Array<Record<string, unknown>> | undefined
        const first = Array.isArray(bag) ? bag[0] : undefined
        if (!first || !(first.voice_name as string)?.trim() || !(first.style_instruction as string)?.trim()) {
          throw new Error("required Design entry missing or promptless on the tts card (the VoiceDesign lane designs — state the Design mod with a name + style instruction)")
        }
      }
      ttsT1(doc, model, g, runId)
    },
  }))
}
