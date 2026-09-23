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
  // 0.7, seed -1; style_instruction is ABSENT/defaultless
  // (bare = optional at parse, ''-absent at compose via ?? '' below).
  // NO speed/top_p (declares no such knobs — they ride the
  // AUDIACORE_TTS_AUTOFILL pin; old drafts naming them still parse via
  // the door's non-strict overlay but compose never reads them).
  // THE QVOICE SURFACE IS MOD-OWNED (the interlock, 2026-09-08): the
  // qvoice + qvoice_save PACK CONTRACTS (comfyui-cordis mods/packs.ts)
  // declare the flat fields — qvoice/voice_strength on the CustomVoice
  // lane, voice_name/style_instruction/design sampling on the
  // VoiceDesign lane — and the compose door's phase-1 admission
  // absorbs them per boarded family. The card schema stays OFF them
  // (a nested bag here broke the carrier envelope — the pack is the
  // one declared surface, never two).
  voice: vocabulary(["ryan", "serena", "vivian", "aiden", "eric", "dylan", "sohee", "ono_anna", "uncle_fu"]).description("Voice").default("ryan").extra('extra', { order: null, tooltip: "Preset speaker persona (the CustomVoice variant only — style control over the target timbre)", wtype: 'select', visible_when: 'model=qwen3-tts&variant=customvoice' }),
  style_instruction: z.string().description("Style Instruction").extra('extra', { order: null, tooltip: "Emotion and delivery control (e.g. 'speak with warm confidence') — styles the CustomVoice persona; the VoiceDesign variant takes its own instruction in the Design entry, the Base variant takes none", wtype: 'textarea', visible_when: 'model=qwen3-tts&variant=customvoice' }),
  // THE CLONE INPUTS (the Base variant clones from a 3-second
  // reference): reference audio + its transcript, Base only.
  ref_audio: z.string().role('path').description("Reference Audio").extra('extra', { order: null, tooltip: "3 seconds of the voice to clone (the Base variant only)", wtype: 'file', visible_when: 'model=qwen3-tts&variant=base' }),
  ref_text: z.string().description("Reference Transcript").extra('extra', { order: null, tooltip: "What the reference audio says (the Base variant only)", wtype: 'textarea', visible_when: 'model=qwen3-tts&variant=base' }),
  // the 0.05 floor is the ENGINE's truth (GPU receipt, hour 15: the
  // native node refuses temperature 0 — "must be positive when
  // sampling"); the schema declares the smallest positive tick of
  // its own step. The declaration follows the engine, never vice.
  // Synth sampling renders on the synthesis lanes only — design
  // sampling lives in the Design entry (mod-owned, the qvoice_save
  // pack contract).
  temperature: z.number().description("Temperature").min(0.05).max(2).step(0.05).default(0.7).extra('extra', { order: null, visible_when: 'model=qwen3-tts' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: null, visible_when: 'model=qwen3-tts' }),
})

// THE BOARDED MODELS (the operator's table: SIZES are models —
// the .6 and the 1.7B checkpoints. Base is a VARIANT of the .6
// (route 'qwen3-tts-base'), never a third model.)
export const BOARDED: string[] = ['qwen3-tts', 'qwen3-tts-voicedesign']

// THE VARIANT ROUTE (agents can't pick matrix variants — the tool's
// closed model enum additionally offers the Base variant's compose
// address; the drafts door resolves route mids through the facts
// rows, krea-2-raw precedent).
export const VARIANT_ADDRESSES: string[] = ['qwen3-tts-base']

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'TTS',
  description: 'Text-to-speech — Qwen3-TTS: CustomVoice personas, 3-second voice clone, and instruction voice design',
  genre: 'audio',
  icon: 'microphone',
  principles: [
    'text is required — empty text fails',
    'the Base variant clones: reference audio + transcript required, no persona, no instruction',
    'CustomVoice instruction styles the persona (voice + style text); VoiceDesign instruction designs the voice (Design mod name + prompt) — different controls, never one knob',
    'the VoiceDesign variant designs: state the Design mod (name + prompt)',
    'Use Voice Embedding (.qvoice) for consistent character voices',
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
      // PER-LANE ADMISSION (each variant takes only its own inputs,
      // refused loud, never silently skipped): the branch key is the
      // resolved lane_inputs DATA (synth_lane — the lane-branch law),
      // never a family id. The cloner needs its 3-second reference;
      // instruction control differs per variant (the operator's
      // table): style text styles the PERSONA — on the person-less
      // Base variant it fires nothing, so a stated one refuses;
      // embeddings load nothing there either. The designer needs its
      // Design entry (name + prompt).
      const lane = typeof (model.lane_inputs as Record<string, unknown> | undefined)?.synth_lane === 'string'
        ? (model.lane_inputs as Record<string, unknown>).synth_lane as string
        : '';
      const blank = (v: unknown): boolean => !(typeof v === 'string' ? v.trim() : v);
      if (lane === 'clone') {
        if (blank(doc.ref_audio) || blank(doc.ref_text)) {
          throw new Error("required params 'ref_audio' + 'ref_text' missing or empty on the tts card (the Base variant clones — it needs its 3-second reference and transcript)")
        }
        if (!blank(doc.style_instruction)) {
          throw new Error("param 'style_instruction' fires nothing on the tts card's Base variant (style control styles the CustomVoice persona — the cloner has none; drop the instruction or switch to the CustomVoice variant)")
        }
        const bag = doc.qvoice as Array<Record<string, unknown>> | string | undefined;
        const stated = Array.isArray(bag)
          ? bag.some((e) => !blank((e as Record<string, unknown>)?.qvoice))
          : !blank(bag);
        if (stated) {
          throw new Error("param 'qvoice' fires nothing on the tts card's Base variant (the cloner loads no embeddings — drop the Voice entry or switch to the CustomVoice variant)")
        }
      } else {
        if (!blank(doc.ref_audio) || !blank(doc.ref_text)) {
          throw new Error("params 'ref_audio'/'ref_text' fire nothing on the tts card outside the Base variant (reference audio only clones — switch to the Base variant or drop the reference)")
        }
      }
      if (lane === 'design') {
        // FLAT SURFACE (2026-09-23, the unrunnable-lane fix): the
        // qvoice_save PACK CONTRACT admits voice_name +
        // style_instruction (+ design sampling) as FLAT params. The
        // old bag read (qvoice_save[0].voice_name) demanded the one
        // shape phase-1 admission refuses as an unknown param — no
        // spelling ever passed both gates, so the design lane never
        // ran. The card now requires exactly what the pack admits.
        if (blank(doc.voice_name) || blank(doc.style_instruction)) {
          throw new Error("required Design params 'voice_name' + 'style_instruction' missing or empty on the tts card (the VoiceDesign lane designs — state the Design mod's name + style instruction)")
        }
        const stale = doc.qvoice_save as unknown
        if (stale !== undefined) {
          throw new Error("param 'qvoice_save' names no surface on the tts card (the Design entry is FLAT — voice_name + style_instruction + sampling, the qvoice_save pack contract)")
        }
        const useBag = doc.qvoice as Array<Record<string, unknown>> | string | undefined;
        const useStated = Array.isArray(useBag)
          ? useBag.some((e) => !blank((e as Record<string, unknown>)?.qvoice))
          : !blank(useBag);
        if (useStated) {
          throw new Error("param 'qvoice' fires nothing on the tts card's VoiceDesign variant (design exports a new voice — it performs no saved persona; drop the Voice entry or switch to the CustomVoice variant)")
        }
      }
      ttsT1(doc, model, g, runId)
    },
  }))
}
