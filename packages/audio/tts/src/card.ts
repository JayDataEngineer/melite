// Tier 3 — the tts card (the tts_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ttsT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

export const schema = z.object({
  text: z.string().description("Text").extra('extra', { order: null, placeholder: "The words to speak", tooltip: "The text to synthesize — the design sample on the VoiceDesign lane", required: true, wtype: 'textarea', }),
  // THE 1:1 SURFACE (operator 2026-09-23: match QwenLM/Qwen3-TTS —
  // capabilities AND models): visibility keys on the VARIANT (the
  // lane), never the family — a flavor's inputs are the same at
  // either size. voice = the CustomVoice speaker (upstream's 9
  // premium timbres — a CustomVoice call REQUIRES one; the other
  // lanes have no speaker at all, so the row hides there — voice is
  // never forced on). style_instruction = instruct-text, an
  // UPSTREAM 1.7B-CustomVoice capability (the 0.6B-CustomVoice
  // table row has NO instruction control — a stated instruct on
  // the small CustomVoice refuses at admission below).
  voice: vocabulary(["ryan", "serena", "vivian", "aiden", "eric", "dylan", "sohee", "ono_anna", "uncle_fu"]).description("Preset Speaker").default("ryan").extra('extra', { order: null, tooltip: "One of the 9 built-in CustomVoice speakers (Ryan, Vivian, …) — the timbre that reads the text. The other lanes take no speaker: Base clones yours, VoiceDesign designs one", wtype: 'select', visible_when: 'variant=customvoice' }),
  // THE TASK-NAMED LABEL LAW (operator 2026-09-23: "they are
  // SPECIFIC TASKS, not INSTRUCT"): every instruction-ish row is
  // labeled by the TASK it performs on its lane, never the upstream
  // param name. Two lanes, two DIFFERENT controls:
  //   CustomVoice → Emotion & Delivery Style (HOW the preset reads)
  //   VoiceDesign → Voice Persona & Timbre (WHO is speaking —
  //                 designs a brand-new voice from the description)
  style_instruction: z.string().description("Emotion & Delivery Style").extra('extra', { order: null, placeholder: "e.g. Speak with immense excitement, laughing slightly", tooltip: "HOW the preset speaker delivers the text — emotion, tone, pacing (excited, whisper, cheerful). The 1.7B CustomVoice lane's capability; the 0.6B has no instruction control, Base clones instead, VoiceDesign designs the speaker itself", wtype: 'textarea', visible_when: 'model=qwen3-tts-voicedesign&variant=customvoice' }),
  design_prompt: z.string().description("Voice Persona & Timbre").extra('extra', { order: null, placeholder: "e.g. A gritty, deep male radio host in his late 50s, unhurried pace, authoritative and warm", tooltip: "WHO speaks — describe the voice itself (age, gender, texture, pitch, cadence) and the lane designs a brand-new speaker from the description. No reference audio needed; the exported .qvoice can later perform any script on the Base lane", wtype: 'textarea', visible_when: 'model=qwen3-tts-voicedesign&variant=voicedesign' }),
  // THE CLONE INPUTS (the Base variant clones from a 3-second
  // reference): reference audio + its transcript, Base only.
  // OPTIONAL when a .qvoice rides instead (upstream's design-then-
  // clone flow: the designed voice IS the clone prompt).
  ref_audio: z.string().role('path').description("Reference Audio").extra('extra', { order: null, tooltip: "3 seconds of the voice to clone (the Base variant only; optional when a Voice Embedding performs instead)", wtype: 'file', visible_when: 'variant=base' }),
  ref_text: z.string().description("Reference Transcript").extra('extra', { order: null, tooltip: "What the reference audio says (the Base variant only; optional when a Voice Embedding performs instead)", wtype: 'textarea', visible_when: 'variant=base' }),
  // GENERATE KWARGS (the 1:1 capability surface — the engine node
  // serves temperature/top_p/top_k/speed/repetition_penalty; the
  // upstream README rides the same HF generate kwargs). Defaults
  // are the NODE's own (0.8 was the old card default; the node + 1:1
  // surface say 0.8→temperature stays the engine floor law below,
  // the rest pin to node defaults: top_p 0.9, top_k 0=off, speed
  // 1.0, repetition_penalty 1.05). Design-lane sampling stays
  // mod-owned (the qvoice_save pack) — these render on the
  // synthesis lanes only.
  // the 0.05 floor is the ENGINE's truth (GPU receipt, hour 15: the
  // native node refuses temperature 0 — "must be positive when
  // sampling"); the schema declares the smallest positive tick of
  // its own step. The declaration follows the engine, never vice.
  temperature: z.number().description("Temperature").min(0.05).max(2).step(0.05).default(0.7).extra('extra', { order: null, visible_when: 'variant=customvoice|base' }),
  top_p: z.number().description("Top P").min(0).max(1).step(0.01).default(0.9).extra('extra', { order: null, visible_when: 'variant=customvoice|base' }),
  top_k: z.number().description("Top K").min(0).max(1000).step(1).default(0).extra('extra', { order: null, tooltip: "0 = off (the node's own default)", visible_when: 'variant=customvoice|base' }),
  speed: z.number().description("Speed").min(0.5).max(2).step(0.1).default(1).extra('extra', { order: null, visible_when: 'variant=customvoice|base' }),
  repetition_penalty: z.number().description("Repetition Penalty").min(0.8).max(2).step(0.01).default(1.05).extra('extra', { order: null, visible_when: 'variant=customvoice|base' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: null, visible_when: 'variant=customvoice|base' }),
})

// THE BOARDED MODELS (the operator's table: SIZES are models —
// the .6 and the 1.7B checkpoints. Base is a VARIANT (route
// 'qwen3-tts-base'), never a third model. THE LARGE DEFAULT
// (operator 2026-09-23): boarded[0] is the default everywhere
// (tool projection + UI preselect — one source) — the 1.7B
// family leads; the 0.6B stays a pick.)
export const BOARDED: string[] = ['qwen3-tts-voicedesign', 'qwen3-tts']

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
    'task-named rows, never "instruct": Emotion & Delivery Style styles HOW the CustomVoice preset reads; Voice Persona & Timbre designs WHO speaks on the VoiceDesign lane — different controls, never one knob',
    'the VoiceDesign variant designs: state the persona description (Voice Persona & Timbre) + the Design mod name',
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
      const qvoiceStated = (doc: Record<string, unknown>): boolean => {
        const bag = doc.qvoice as Array<Record<string, unknown>> | string | undefined;
        return Array.isArray(bag)
          ? bag.some((e) => !blank((e as Record<string, unknown>)?.qvoice))
          : !blank(bag);
      }
      if (lane === 'clone') {
        // THE 1:1 CLONE LAW (operator 2026-09-23): Base clones from
        // ref_audio+ref_text OR performs a designed .qvoice (the
        // upstream design-then-clone flow — the exported voice IS
        // the clone prompt). Either reference satisfies the lane;
        // neither stated = the loud refusal.
        if ((blank(doc.ref_audio) || blank(doc.ref_text)) && !qvoiceStated(doc)) {
          throw new Error("required params 'ref_audio' + 'ref_text' missing or empty on the tts card (the Base variant clones — state the 3-second reference + transcript, or a Voice Embedding to perform the designed voice)")
        }
        if (!blank(doc.style_instruction) || !blank(doc.design_prompt)) {
          throw new Error("params 'style_instruction'/'design_prompt' fire nothing on the tts card's Base variant (style control styles the CustomVoice persona, the persona description designs a VoiceDesign speaker — the cloner takes neither; drop them or switch variants)")
        }
      } else {
        if (!blank(doc.ref_audio) || !blank(doc.ref_text)) {
          throw new Error("params 'ref_audio'/'ref_text' fire nothing on the tts card outside the Base variant (reference audio only clones — switch to the Base variant or drop the reference)")
        }
        if (lane !== 'design' && !blank(doc.design_prompt)) {
          throw new Error("param 'design_prompt' fires nothing on the tts card outside the VoiceDesign variant (the persona description designs a speaker — switch to the VoiceDesign variant or drop it)")
        }
        if (lane === 'design' && !blank(doc.style_instruction)) {
          throw new Error("param 'style_instruction' fires nothing on the tts card's VoiceDesign variant (emotion styling rides the CustomVoice lane; the design lane takes 'design_prompt' — the Voice Persona & Timbre row)")
        }
      }
      // THE 0.6B INSTRUCT WALL (upstream capability table: the
      // 0.6B-CustomVoice row has NO instruction control — instruct
      // is the 1.7B lane's capability): a stated instruct on the
      // small CustomVoice refuses loud, never silently drops.
      if (lane !== 'design' && !blank(doc.style_instruction) && model.id === 'qwen3-tts') {
        throw new Error("param 'style_instruction' fires nothing on the 0.6B CustomVoice lane (instruction control is the 1.7B checkpoint's capability upstream — switch to the 1.7B family's CustomVoice variant or drop the instruction)")
      }
      if (lane === 'design') {
        // THE LANE'S OWN SURFACE (operator 2026-09-23, three
        // variants three inputs): the design prompt rides the card
        // as its own task-named row (design_prompt — Voice Persona
        // & Timbre); the pack keeps the export name + design
        // sampling. Required-field admission stays here.
        if (blank(doc.voice_name) || blank(doc.design_prompt)) {
          throw new Error("required Design params 'voice_name' + 'design_prompt' missing or empty on the tts card (the VoiceDesign lane designs — state the Voice Persona & Timbre description + the Design mod's name for the export)")
        }
        const stale = doc.qvoice_save as unknown
        if (stale !== undefined) {
          throw new Error("param 'qvoice_save' names no surface on the tts card (the Design entry is FLAT — voice_name + design_prompt + sampling, the qvoice_save pack contract)")
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
