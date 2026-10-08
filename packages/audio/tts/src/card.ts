import { laneBlank, judgeLaneRelations } from '@melite/contracts/laneRelations'
// Tier 3 — the tts card (the tts_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body rides @melite/comfyui-card-kit (ttsT1).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { declaredAction, qvoiceUse, instantiateAction, type ActionBinding as Binding } from '@melite/comfyui-card-kit'
import { DECL as qwen3TtsDecl, PRESET_SPEAKERS, variantRoute, laneTopologyOf as ttsLaneTopologyOf, type TtsLaneTopology } from '@melite/models-qwen3-tts'
import { DECL as qwen3TtsVoicedesignDecl, laneTopologyOf as voicedesignLaneTopologyOf } from '@melite/models-qwen3-tts-voicedesign'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { bag } from '@melite/contracts/extraKeys'
import { gatedResolve, QVOICE_RIDERS, QVOICE_SAVE_RIDERS } from '@melite/comfyui-cordis'

export const schema = z.object({
  text: z.string().description("Text").extra('extra', bag({ order: null, placeholder: "The words to speak", tooltip: "The text to synthesize — the design sample on the VoiceDesign lane", required: true, wtype: 'textarea', })),
  // THE 1:1 SURFACE (operator 2026-09-23: match QwenLM/Qwen3-TTS —
  // capabilities AND models): visibility keys on the VARIANT (the
  // lane), never the family — a flavor's inputs are the same at
  // either size. voice = the CustomVoice speaker (upstream's 9
  // premium timbres — a CustomVoice call REQUIRES one; the other
  // lanes have no speaker at all, so the row hides there — voice is
  // never forced on). "none" = NO preset (operator 2026-09-24: "you
  // didn't even add an option to turn off the forced voice like
  // Vivian"): the node normalizes it to an EMPTY speaker so the
  // loaded .qvoice owns the timbre; no qvoice riding refuses loud
  // at the engine ("requires speaker or voice reference") — never a
  // silent fallback to a default preset. style_instruction =
  // instruct-text, an UPSTREAM 1.7B-CustomVoice capability (the
  // 0.6B-CustomVoice table row has NO instruction control — a
  // stated instruct on the small CustomVoice refuses at admission
  // below).
  voice: vocabulary([...PRESET_SPEAKERS]).description("Preset Speaker").default("ryan").extra('extra', bag({ order: null, tooltip: "none = no preset — the loaded .qvoice owns the timbre (refuses loud if no voice rides). Otherwise one of the 9 built-in CustomVoice speakers (Ryan, Vivian, …). The other lanes take no speaker: Base clones yours, VoiceDesign designs one", wtype: 'select' })),
  // THE TASK-NAMED LABEL LAW (operator 2026-09-23: "they are
  // SPECIFIC TASKS, not INSTRUCT"): every instruction-ish row is
  // labeled by the TASK it performs on its lane, never the upstream
  // param name. Two lanes, two DIFFERENT controls:
  //   CustomVoice → Emotion & Delivery Style (HOW the preset reads)
  //   VoiceDesign → Voice Persona & Timbre (WHO is speaking —
  //                 designs a brand-new voice from the description)
  style_instruction: z.string().description("Emotion & Delivery Style").extra('extra', bag({ order: null, placeholder: "e.g. Speak with immense excitement, laughing slightly", tooltip: "HOW the preset speaker delivers the text — emotion, tone, pacing (excited, whisper, cheerful). The 1.7B CustomVoice lane's capability; the 0.6B has no instruction control, Base clones instead, VoiceDesign designs the speaker itself", wtype: 'textarea' })),
  design_prompt: z.string().description("Voice Persona & Timbre").extra('extra', bag({ order: null, placeholder: "e.g. A gritty, deep male radio host in his late 50s, unhurried pace, authoritative and warm", tooltip: "WHO speaks — describe the voice itself (age, gender, texture, pitch, cadence) and the exporter designs a brand-new speaker from the description. No reference audio needed; the exported .qvoice performs any script on every qwen3-tts lane. Pairs with the Design mod's name (voice_name) — the save fires from ANY lane", wtype: 'textarea' })),
  // THE CLONE INPUTS (the Base variant clones from a 3-second
  // reference): reference audio + its transcript, Base only.
  // OPTIONAL when a .qvoice rides instead (upstream's design-then-
  // clone flow: the designed voice IS the clone prompt).
  ref_audio: z.string().role('path').description("Reference Audio").extra('extra', bag({ order: null, tooltip: "3 seconds of the voice to clone (the Base variant only; optional when a Voice Embedding performs instead)", wtype: 'file' })),
  ref_text: z.string().description("Reference Transcript").extra('extra', bag({ order: null, tooltip: "What the reference audio says (the Base variant only; optional when a Voice Embedding performs instead)", wtype: 'textarea' })),
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
  temperature: z.number().description("Temperature").min(0.05).max(2).step(0.05).default(0.7).extra('extra', bag({ order: null })),
  top_p: z.number().description("Top P").min(0).max(1).step(0.01).default(0.9).extra('extra', bag({ order: null })),
  top_k: z.number().description("Top K").min(0).max(1000).step(1).default(0).extra('extra', bag({ order: null, tooltip: "0 = off (the node's own default)" })),
  speed: z.number().description("Speed").min(0.5).max(2).step(0.1).default(1).extra('extra', bag({ order: null })),
  repetition_penalty: z.number().description("Repetition Penalty").min(0.8).max(2).step(0.01).default(1.05).extra('extra', bag({ order: null })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: null })),
})

/** The schema's callable face — ONE cast serving both seams (the
 *  registration's schema carrier and the compose strict resolve's
 *  judge): schemastery schemas are callable (Schema.resolve) but
 *  carry a typed data parameter, while both card-seam consumers
 *  take unknown. */
const schemaFn = schema as unknown as (v: unknown) => Record<string, unknown>

// THE BOARDED MODELS (the operator's table: SIZES are models —
// the .6 and the 1.7B checkpoints. Base is a VARIANT (route
// 'qwen3-tts-base'), never a third model. THE LARGE DEFAULT
// (operator 2026-09-23): boarded[0] is the default everywhere
// (tool projection + UI preselect — one source) — the 1.7B
// family leads; the 0.6B stays a pick.)
// THE FAMILY IDS COME FROM THEIR DECLS (the card audit's M1: a
// retyped id breaks the card at RUNTIME — not-boarded — with every wall
// green; image-gen has been doing it this way all along)
export const BOARDED: string[] = [qwen3TtsVoicedesignDecl.id, qwen3TtsDecl.id]

/** THE ACTION BINDINGS (the atom vocabulary, stroke 3): the owning
 * family's declared speak + export actions — the card owns only
 * dispatch; the segment factories live in the family packages.
 * Keyed by OWNING FAMILY (`model.family ?? model.id` at dispatch —
 * a route id keys nothing, the derived-row law); an unbound family
 * refuses loud at the dispatch. */
export const ACTION_BINDINGS: Record<string, { save: Binding; speak: Binding }> = {
  [qwen3TtsDecl.id]: {
    save: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsDecl, 'export'), p, model, g, runId) },
    speak: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsDecl, 'speak'), p, model, g, runId) },
  },
  [qwen3TtsVoicedesignDecl.id]: {
    save: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsVoicedesignDecl, 'export'), p, model, g, runId) },
    speak: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsVoicedesignDecl, 'speak'), p, model, g, runId) },
  },
}

/** The resolved lane topology (the per-family map keyed on the
 *  variant pick — the compose-side twin of the actions' dispatch):
 *  the family field owns the pick (the ACTION_BINDINGS law), the
 *  variant id owns the lane. */
const laneTopology = (model: ModelFacts): TtsLaneTopology =>
  (model.family === qwen3TtsVoicedesignDecl.id ? voicedesignLaneTopologyOf : ttsLaneTopologyOf)(model)

// THE VARIANT ROUTE (agents can't pick matrix variants — the tool's
// closed model enum additionally offers the Base variant's compose
// address; the drafts door resolves route mids through the facts
// rows, krea-2-raw precedent).
// The design lane's own route joined 2026-09-24 (transcript-015 -
// the head serves the family default CustomVoice; the design variant
// re-keys only through its own address).
// THE ROUTE ADDRESSES ARE THE DECLS' OWN VARIANT ROUTES (the card
// audit's M5: this list restated two route strings by hand, so a
// rename left the card boarding an address that resolves to nothing)
export const VARIANT_ADDRESSES: string[] = [
  variantRoute(qwen3TtsDecl, 'base'),
  variantRoute(qwen3TtsVoicedesignDecl, 'voicedesign'),
].filter((r): r is string => r !== '')

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'TTS',
  description: 'Text-to-speech — Qwen3-TTS: CustomVoice personas, 3-second voice clone, and instruction voice design',
  genre: 'audio',
  icon: 'microphone',
  principles: [
    'text is required — empty text fails',
    'ALWAYS the big model: the 1.7B (qwen3-tts-voicedesign) is the default on every door; the 0.6B is a fallback, never an unprompted pick; the Base route is named only to clone from reference audio',
    'THE THREE SIGNATURES: VoiceDesign takes the CHARACTER instruct (Voice Persona & Timbre — WHO speaks, designed and exported as a .qvoice); CustomVoice takes the EMOTION instruct (Emotion & Delivery Style — HOW the line reads, on a preset or a saved voice); Base only clones (3-second reference + transcript in, that speaker out)',
    'THE FLOW: character instruct INTO emotion instruct — design the character once on VoiceDesign (qvoice_save: voice_name + the persona description), then the saved .qvoice performs on CustomVoice (qvoice) with the emotion instruct riding on top',
    'Use Voice Embedding (.qvoice) for consistent character voices — the file IS the voice',
    'One line per call — serial execution for multi-line sequences',
  ],
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'tts',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'tts',
    // THE OFFERED SET = atoms + variant routes (operator 2026-09-23,
    // qvoice across ALL qwen3-tts): the bench door and the tool enum
    // offer the SAME set — the Base compose address rides boarded so
    // a stage may name it (the envelope serves through the
    // ROUTE→ATOM FOLD; an unoffered address starves the lane no
    // less than a dropped envelope). The default stays BOARDED[0].
    boarded: [...BOARDED, ...VARIANT_ADDRESSES],
    tags: ['audio', 'tts', 'voice', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'audio', order: 3 },
    flowKinds: {
      // THE KNOB-ALIGNED PORTS (the flow-contract law:
      // assertFlowContract pins port keys ⊆ schema keys — the knob
      // here is `text`, so the port is `text`; the §12 wall probe
      // wires the migrated channel).
      // ref_audio joins the ports (the naming law's census,
      // 2026-10-09): the clone slot is a REAL wire seat — a
      // music/sfx stage's audio output can voice it. The knob is
      // variant-conditional (base only) — the wire is legal, the
      // variant mismatch refuses loud at compose, never silently.
      inputs: { text: 'text', ref_audio: 'audio' },
      // THE VOICES CHANNEL (2026-09-25, the optional-channel law):
      // a design run publishes BOTH its artifacts — the preview
      // flac (default) AND the persisted .qvoice (voices). The
      // bindings are complementary (`when` on voice_name), so a
      // plain run resolves default only and a design run resolves
      // voices (the resolved set — resolveCardFlowOutputs — is what
      // the stage carries; the static record declares the union).
      outputs: { default: 'audio', voices: 'voice' },
      requiresModel: true,
    },
    flowOutputBindings: [
      {
        channel: 'default',
        node: 'SaveAudio.0',
        nodeClass: 'SaveAudio',
        when: (params) => typeof params['voice_name'] !== 'string' || params['voice_name'] === '',
      },
      {
        channel: 'voices',
        node: 'MeliteQVoiceCopy.0',
        nodeClass: 'MeliteQVoiceCopy',
        when: (params) => typeof params['voice_name'] === 'string' && params['voice_name'] !== '',
      },
    ],
    // Load + TTS ride the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schemaFn,
    // mode rides admits (the tagger-checkpoint precedent, caught by
    // the estate contract laws 2026-10-10): the audio lane reads
    // p.mode ('full' vs section modes) — a lane-consumed param the
    // family defaults stamp, never rendered, no card knob.
    admits: ['mode'],
    compose(p, model, g, runId) {
      // THE .QVOICE PATH HINT (022's self-critique #5, 2026-09-24):
      // the vocabulary refusal on `voice` lists the preset enum and
      // never names the lawful seat — an agent holding a .qvoice
      // path burned a probe turn learning where it goes. Pointed
      // refusal BEFORE the schema gate (card-local, never the shared
      // vocabulary text) names the seat.
      if (typeof (p as Record<string, unknown>)?.voice === 'string'
        && ((p as Record<string, unknown>).voice as string).trim().endsWith('.qvoice')) {
        throw new Error(
          "param 'voice' takes a preset speaker, never a .qvoice path — the saved persona rides the qvoice mod bag: qvoice: [{ qvoice: '<path>', voice_strength: 1 }] (the load seat's grammar rides melite_load's mods line)",
        );
      }
      // THE SCHEMA GATE (the h3 admission precedent): the card's
      // own schemastery walk validates types + bounds (temperature
      // is 0–2 — anything else refuses LOUD, never composes), fills
      // defaults; the composer reads the GATED doc. T6's admission
      // gate: the qvoice/qvoice_save pack field dicts are the rider
      // surface; the literal 'qvoice_save' key is admitted so the
      // card's own off-surface refusal (a stated stale bag names no
      // surface) still speaks instead of the gate; 'mode' and
      // 'variant' ride as the family's variant-address params the
      // lane resolver reads; 'model' rides as the family-default
      // stamp.
      const doc = gatedResolve('tts', schemaFn, ['mode', 'variant', 'model', 'qvoice_save', ...QVOICE_RIDERS, ...QVOICE_SAVE_RIDERS], p)
      if (!(doc.text as string)?.trim()) {
        throw new Error("required param 'text' missing or empty on the tts card (the words to speak)")
      }
      // THE ONE JUDGE, FAMILY ROWS (2026-10-10, the DECL audit's
      // row 4): the family-level relation words — the export pair
      // (together), the export conflicts, the required text — are
      // judged here by judgeLaneRelations, the SAME implementation
      // the bench-write door runs, so the hand-rolled copies cannot
      // drift again (the blank-law divergence, the design audit's
      // Q4, was exactly this shape: three seats, three answers, one
      // concept). What stays imperative below is what only this
      // seat knows: the resolved lane's own facts
      // (instruction_control), the stale param name, and the
      // variant-scoped clone pair (the base variant's either_or —
      // the variant the resolver picked, which the family row
      // alone cannot name).
      const laneViolations = model.relations !== undefined
        ? judgeLaneRelations([model.relations], doc)
        : []
      if (laneViolations.length > 0) {
        throw new Error(laneViolations[0]!.message)
      }
      // PER-LANE ADMISSION (each variant takes only its own inputs,
      // refused loud, never silently skipped): the branch key is the
      // resolved lane TOPOLOGY (synth_lane, derived from the variant
      // pick — the lane-branch law), never a family id. The cloner
      // needs its 3-second reference; instruction control differs
      // per variant (the operator's table): style text styles the
      // PERSONA — on the person-less Base variant it fires nothing,
      // so a stated one refuses; embeddings load nothing there
      // either. The designer needs its Design entry (name + prompt).
      const lane = laneTopology(model).synth_lane;
      // THE BLANK LAW IS THE CONTRACT'S (the design audit's Q4: this
      // hand-rolled copy called 0 and false BLANK — and `top_k: 0`
      // means "off" in this card's own tooltip — while the lane judge
      // calls them stated, and called {} and [] STATED where the lane
      // calls them blank. Three seats, three answers, for one concept.)
      const blank = laneBlank;
      const qvoiceStated = (doc: Record<string, unknown>): boolean => qvoiceUse(doc) !== undefined
      // THE SAVE INTENT (operator 2026-09-23, the full qvoice law:
      // SAVE and LOAD across ALL qwen3-tts): a stated voice_name (the
      // Design mod's export name) is the save signal — the studio
      // exporter fires from ANY lane (it loads its own model
      // variants; the lane's checkpoint only resolves directories).
      // The VoiceDesign VARIANT is the same path by definition
      // (designing IS its lane). Walls: the export needs BOTH the
      // name and the persona description; it takes no delivery
      // style, no clone reference, no saved persona (an export
      // performs nothing), and the stale 'qvoice_save' param names
      // no surface (the Design entry is FLAT).
      const saveIntent = lane === 'design' || !blank(doc.voice_name)
      if (saveIntent) {
        // THE JUDGE ALREADY SPOKE (the DECL audit's row 4): the
        // export pair's HALF-stated states and the export conflicts
        // (style with a voice_name) are family rows, judged above
        // by the one implementation — their imperative copies died
        // with the blank-law divergence (Q4's shape: three seats,
        // three answers, one concept). What remains here is what
        // NO family row can say, because it is the LANE's own law:
        // THE EXACT-MISSING VOICE (029's self-critique #2): the
        // together row fires only when a member is stated — a
        // design compose with NEITHER half names nothing, so this
        // seat refuses it naming the actually-missing keys; and the
        // export's OFF-SURFACE inputs (a reference or a saved
        // persona perform nothing on the design lane — surface
        // facts, not relation rows).
        const missing = ['voice_name', 'design_prompt'].filter((k) => blank(doc[k]))
        if (missing.length > 0) {
          throw new Error("required Design param(s) " + missing.map((k) => "'" + k + "'").join(' + ') + " missing or empty on the tts card (the export needs the persona description + the Design mod's name — state both; the save fires from any lane)")
        }
        if (!blank(doc.ref_audio) || !blank(doc.ref_text)) {
          throw new Error("params 'ref_audio'/'ref_text' fire nothing on a Design export (the exporter designs from the description — no reference clones; drop them, or run the Base variant without voice_name)")
        }
        const stale = doc.qvoice_save as unknown
        if (stale !== undefined) {
          throw new Error("param 'qvoice_save' names no surface on the tts card (the Design entry is FLAT — voice_name + design_prompt + sampling, the qvoice_save pack contract)")
        }
        // NOTE (the lying-test re-audit, 2026-10-16): a qvoice refusal
        // seat here ("qvoice fires nothing on a Design export") was
        // DEAD BY DATA FLOW — with voice_name stated (the design
        // lane's required param) the DECLARED family conflict row
        // voice_name×qvoice throws first, and without it the missing-
        // params wall above throws. The family row owns the judgment;
        // the duplicate is gone.
        // THE DECLARED ACTION (the atom vocabulary, stroke 3): the
        // boarded family's own export action composes; an unbound
        // row refuses loud below.
        const bound = ACTION_BINDINGS[model.family ?? model.id]
        if (bound) bound.save(doc, model, g, runId)
        else {
          throw new Error(
            `no declared action for family '${String(model.family ?? model.id)}' on the tts card — every boarded family (qwen3-tts, qwen3-tts-voicedesign) composes its own declared segment; this address owns none`)
        }
        return
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
          throw new Error("params 'style_instruction'/'design_prompt' fire nothing on the tts card's Base variant (style control styles the CustomVoice persona; the persona description only exports WITH the Design mod's name — pair it with voice_name or drop them)")
        }
      } else {
        if (!blank(doc.ref_audio) || !blank(doc.ref_text)) {
          throw new Error("params 'ref_audio'/'ref_text' fire nothing on the tts card outside the Base variant (reference audio only clones — switch to the Base variant or drop the reference)")
        }
        // design_prompt without voice_name: the together family row
        // judges it now (the one implementation, above) — the
        // imperative copy died with the audit's row 4.
      }
      if (!blank(doc.style_instruction) && !laneTopology(model).instruction_control) {
        throw new Error("param 'style_instruction' fires nothing on the resolved TTS lane (this lane has no instruction control — choose a lane with instruction control or drop the instruction)")
      }
      // THE DECLARED ACTION (the atom vocabulary, stroke 3): the
      // boarded family's own speak action composes (branching on
      // the resolved synth_lane DATA); an unbound row refuses loud
      // below, never a silent second copy.
      const bound = ACTION_BINDINGS[model.family ?? model.id]
      if (bound) bound.speak(doc, model, g, runId)
      else {
        throw new Error(
          `no declared action for family '${String(model.family ?? model.id)}' on the tts card — every boarded family (qwen3-tts, qwen3-tts-voicedesign) composes its own declared segment; this address owns none`)
      }
    },
  }))
}
