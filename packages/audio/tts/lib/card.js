import { laneBlank, judgeLaneRelations, laneSurfaceOf } from '@melite/contracts/laneRelations';
import z from '@deepseek-ai/schemastery';
import { declaredAction, qvoiceUse, instantiateAction } from '@melite/comfyui-card-kit';
import { DECL as qwen3TtsDecl, PRESET_SPEAKERS, variantRoute, cellRoute, laneTopologyOf as ttsLaneTopologyOf } from '@melite/models-qwen3-tts';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { seedExtra } from '@melite/comfyui-card-kit/fields';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { QVOICE_RIDERS } from '@melite/comfyui-card-kit/pack-fields';
import { QVOICE_SAVE_RIDERS } from '@melite/comfyui-card-kit/pack-fields';
export const schema = z.object({
    text: z.string().description("Text to Speak").extra('extra', bag({ order: null, placeholder: "The words to speak (the script the voice performs)", tooltip: "The script the voice performs — the output's own words. NOT the reference transcript (a different input: what your reference clip says); on the VoiceDesign model this is the design sample", required: true, wtype: 'textarea', })),
    // THE 1:1 SURFACE (operator 2026-09-23: match QwenLM/Qwen3-TTS —
    // capabilities AND models; operator 2026-10-26: the size moved to
    // QUANT): visibility keys on the VARIANT + SIZE CELL (the lane and
    // its size), never the family alone — a flavor's inputs can differ
    // by size. voice = the CustomVoice speaker (upstream's 9 premium
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
    voice: vocabulary([...PRESET_SPEAKERS]).description("Preset Speaker").extra('extra', bag({ order: null, tooltip: "One of the 9 built-in CustomVoice speakers (Ryan, Vivian, …). CustomVoice HAS no non-speaker (operator 2026-11-12, told ten times): the picker rests on Ryan until you choose another — 'none' fired nothing and its run refused at the engine. A loaded .qvoice owns the timbre and never reads this row. The other models take no speaker: Base clones yours, VoiceDesign designs one", wtype: 'select' })),
    // THE TASK-NAMED LABEL LAW (operator 2026-09-23: "they are
    // SPECIFIC TASKS, not INSTRUCT"): every instruction-ish row is
    // labeled by the TASK it performs on its lane, never the upstream
    // param name. Two lanes, two DIFFERENT controls:
    //   CustomVoice → Emotion & Delivery Style (HOW the preset reads)
    //   VoiceDesign → Voice Persona & Timbre (WHO is speaking —
    //                 designs a brand-new voice from the description)
    style_instruction: z.string().description("Emotion & Delivery Style").extra('extra', bag({ order: null, placeholder: "e.g. Speak with immense excitement, laughing slightly", tooltip: "HOW the preset speaker delivers the text — emotion, tone, pacing (excited, whisper, cheerful). A CustomVoice (1.7B) capability; the 0.6B has no instruction control, Base clones instead, VoiceDesign designs the speaker itself", wtype: 'textarea' })),
    design_prompt: z.string().description("Voice Persona & Timbre").extra('extra', bag({ order: null, placeholder: "e.g. A gritty, deep male radio host in his late 50s, unhurried pace, authoritative and warm", tooltip: "WHO speaks — describe the voice itself (age, gender, texture, pitch, cadence) and the VoiceDesign pick builds a brand-new speaker from the description. No reference audio needed. Toggle SAVE QVOICE on the mods pane to persist the embedding as media — the mint names itself, no name is demanded here", wtype: 'textarea' })),
    // THE NAME FIELD IS DEAD (the qvoice boolean law, operator
    // 2026-10-22: "Qvoice. Is a mod. It is not BAKED INTO THE
    // DEFAULT CARD"): voice_name was never a base-lane fact — the
    // save is the qvoice_save mod's save_qvoice boolean, the mint
    // names itself, and the base VoiceDesign surface is text + the
    // persona description, nothing else.
    // THE CLONE INPUTS (the Base variant clones from a 3-second
    // reference): reference audio + its transcript, Base only.
    // OPTIONAL (the optional-clone law, operator 2026-10-12): a run
    // with no reference performs prompt-only speech. The transcript
    // row appears ONLY once its audio rides (operator ruling
    // 2026-10-12: a transcript field with no clip is noise) — one
    // value-guard, the rig precedent (mode=copy), never a lane
    // table; which LANE sees the pair stays the DECL's surface.
    ref_audio: z.string().role('path').description("Reference Audio").extra('extra', bag({ order: null, tooltip: "OPTIONAL — 3 seconds of the voice to clone (the Base variant only). Leave empty for prompt-only speech; a .qvoice Voice Embedding performs instead", wtype: 'file' })),
    ref_text: z.string().description("Reference Transcript").extra('extra', bag({ order: null, visible_when: 'ref_audio!=null', tooltip: "What the reference audio says — appears only once a Reference Audio rides (clip + its transcript are ONE source). Optional like the clip itself: no reference, no clone", wtype: 'textarea' })),
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
    temperature: z.number().description("Temperature").min(0.05).max(2).step(0.05).default(0.7).extra('extra', bag(seedExtra({ order: null }))),
    top_p: z.number().description("Top P").min(0).max(1).step(0.01).default(0.9).extra('extra', bag({ order: null })),
    top_k: z.number().description("Top K").min(0).max(1000).step(1).default(0).extra('extra', bag({ order: null, tooltip: "0 = off (the node's own default)" })),
    speed: z.number().description("Speed").min(0.5).max(2).step(0.1).default(1).extra('extra', bag({ order: null })),
    repetition_penalty: z.number().description("Repetition Penalty").min(0.8).max(2).step(0.01).default(1.05).extra('extra', bag({ order: null })),
    seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: null })),
});
const schemaFn = callableSchema(schema);
// THE BOARDED MODEL (operator 2026-10-26: MODEL = QWEN, VARIANT =
// CustomVoice/Base/VoiceDesign, QUANT = 1.7B/0.6B): one boarded atom,
// three flavor variants, and the size lives at the quant cell. THE
// LARGE DEFAULT: DEFAULT_MODEL is the default everywhere the tool
// door is concerned, and every variant ladder leads with its 1.7B
// cell (boarded[0] stays the boarded ATOM — the head id is also the
// small CustomVoice cell's retained route, so it can never be the
// default). The retained 'qwen3-tts' address is the
// small CustomVoice cell's route — old 0.6B drafts resolve as 0.6B
// runs, never as silent neighbors.
// THE FAMILY ID COMES FROM ITS DECL (the card audit's M1: a retyped
// id breaks the card at RUNTIME — not-boarded — with every wall
// green; image-gen has been doing it this way all along)
export const BOARDED = [qwen3TtsDecl.id];
// THE TOOL DEFAULT (the large-default law, operator 2026-10-26:
// "ALWAYS the big model: the 1.7B is the default on every door"):
// the agent tool's unstated model must compose the 1.7B CustomVoice
// — the head id doubles as the SMALL cell's retained route, so
// defaulting to it would serve the 0.6B fallback unprompted (the
// address claim wins unstated quant). The large rung's own route,
// read from the DECL (M5 — never retyped).
export const DEFAULT_MODEL = cellRoute(qwen3TtsDecl, 'customvoice', '1_7b');
/** THE ACTION BINDING (the atom vocabulary, stroke 3): the owning
 * family's declared speak + export actions — the card owns only
 * dispatch; the segment factories live in the family package.
 * Keyed by OWNING FAMILY (`model.family ?? model.id` at dispatch —
 * a route id keys nothing, the derived-row law); an unbound family
 * refuses loud at the dispatch. */
export const ACTION_BINDINGS = {
    [qwen3TtsDecl.id]: {
        save: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsDecl, 'export'), p, model, g, runId); },
        speak: (p, model, g, runId) => { instantiateAction(declaredAction(qwen3TtsDecl, 'speak'), p, model, g, runId); },
    },
};
/** The resolved lane topology (the compose-side twin of the actions'
 *  dispatch): the family field owns the pick (the ACTION_BINDINGS
 *  law), the variant id owns the lane. */
const laneTopology = (model) => ttsLaneTopologyOf(model);
/** Whether the RESOLVED (variant × quant) cell takes the delivery
 * style: the variant topology owns the lane's graph capability, and
 * the selected size cell's surface additions own the size split —
 * CustomVoice takes style_instruction on its 1.7B cell only. The
 * selected cell is the one whose route is the composed address; a
 * row without matrix data falls back to the variant topology. */
function laneTakesStyleInstruction(model) {
    const topology = laneTopology(model);
    if (!topology.instruction_control)
        return false;
    const variantId = typeof model.defaults.variant === 'string' ? model.defaults.variant : '';
    const variant = (model.variants ?? []).find((row) => row.id === variantId);
    if (variant === undefined)
        return true;
    const cell = (variant.cells ?? []).find((row) => row.route !== '' && row.route === model.id);
    if (cell === undefined)
        return true;
    const surface = laneSurfaceOf(model.params ?? null, variant.params ?? null, cell.params ?? null);
    return surface?.includes('style_instruction') ?? true;
}
// THE VARIANT ROUTES (agents can't pick matrix variants — the tool's
// closed model enum additionally offers the flavor/size compose
// addresses; the drafts door resolves route mids through the facts
// rows, krea-2-raw precedent).
// THE ROUTE ADDRESSES ARE THE DECL'S OWN VARIANT/CELL ROUTES (the
// card audit's M5: this list restated route strings by hand, so a
// rename left the card boarding an address that resolves to nothing).
// The retained small-CustomVoice route is BOARDED[0] itself, so it is
// not repeated here; deduplicate defensively, never board empties.
export const VARIANT_ADDRESSES = [
    variantRoute(qwen3TtsDecl, 'customvoice'),
    variantRoute(qwen3TtsDecl, 'voicedesign'),
    variantRoute(qwen3TtsDecl, 'base'),
    cellRoute(qwen3TtsDecl, 'base', '0_6b'),
].filter((r, i, rows) => r !== '' && rows.indexOf(r) === i && r !== qwen3TtsDecl.id);
/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
    label: 'TTS',
    description: 'Text-to-speech — Qwen3-TTS: CustomVoice personas, 3-second voice clone, and instruction voice design',
    genre: 'audio',
    icon: 'microphone',
    principles: [
        'text is required — empty text fails',
        'MODEL = QWEN, VARIANT = FLAVOR, QUANT = SIZE: the one Qwen atom serves CustomVoice, Base, and VoiceDesign; the 1.7B/0.6B choice is the quant cell, never a second model',
        'ALWAYS the big size: the 1.7B cell is the default on every door; the 0.6B is a fallback, never an unprompted pick; the Base route is named only to clone from reference audio',
        'THE THREE SIGNATURES: VoiceDesign takes the CHARACTER instruct (Voice Persona & Timbre — WHO speaks, designed and exported as a .qvoice); CustomVoice takes the EMOTION instruct (Emotion & Delivery Style — HOW the line reads, on a preset or a saved voice); Base only clones (3-second reference + transcript in, that speaker out)',
        'THE FLOW: character instruct INTO emotion instruct — design the character once on VoiceDesign (toggle SAVE QVOICE to persist the embedding to media), then the saved .qvoice performs on CustomVoice (LOAD QVOICE) with the emotion instruct riding on top',
        'Use Voice Embedding (.qvoice) for consistent character voices — the file IS the voice',
        'One line per call — serial execution for multi-line sequences',
    ],
};
export function registerCard(ctx, comfy) {
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
            // bindings are complementary (`when` on the SAVE QVOICE
            // boolean — the qvoice boolean law, operator 2026-10-22), so
            // a plain run resolves default only and a save-on run
            // resolves voices (the resolved set — resolveCardFlowOutputs
            // — is what the stage carries; the static record declares
            // the union).
            outputs: { default: 'audio', voices: 'voice' },
            requiresModel: true,
        },
        flowOutputBindings: [
            {
                channel: 'default',
                node: 'SaveAudio.0',
                nodeClass: 'SaveAudio',
                when: (params) => params['save_qvoice'] !== true,
            },
            {
                channel: 'voices',
                node: 'MeliteQVoiceCopy.0',
                nodeClass: 'MeliteQVoiceCopy',
                when: (params) => params['save_qvoice'] === true,
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
            if (typeof p?.voice === 'string'
                && p.voice.trim().endsWith('.qvoice')) {
                throw new Error("param 'voice' takes a preset speaker, never a .qvoice path — the saved persona rides the qvoice mod bag: qvoice: [{ qvoice: '<path>', voice_strength: 1 }] (the load seat's grammar rides melite_load's mods line)");
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
            const doc = gatedResolve('tts', schemaFn, ['mode', 'variant', 'model', 'qvoice_save', ...QVOICE_RIDERS, ...QVOICE_SAVE_RIDERS], p);
            if (!doc.text?.trim()) {
                throw new Error("required param 'text' missing or empty on the tts card (the words to speak)");
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
                : [];
            if (laneViolations.length > 0) {
                throw new Error(laneViolations[0].message);
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
            const qvoiceStated = (doc) => qvoiceUse(doc) !== undefined;
            // THE SAVE INTENT (the qvoice boolean law, operator
            // 2026-10-22: "IT IS A SIMPLE BOOLEAN… SAVE THE EMBEDDINGS
            // TO MEDIA"): the save_qvoice boolean on the qvoice_save mod
            // is the ONE save signal — boolean on, the studio exporter
            // fires and persists the .qvoice to media from ANY lane (it
            // loads its own model variants; the lane's checkpoint only
            // resolves directories); the mint names itself. The lane
            // alone no longer implies the save (a plain design run
            // previews the voice and demands nothing).
            // THE STALE PACK NAME (admitted at the gate only so this seat
            // speaks): 'qvoice_save' names no surface on the tts card —
            // the save is the SAVE QVOICE boolean (save_qvoice). Judged
            // on EVERY path, never only the save branch: a stale key with
            // no save signal still refuses loud (the silent-skip law).
            const stale = doc.qvoice_save;
            if (stale !== undefined) {
                throw new Error("param 'qvoice_save' names no surface on the tts card (the save is the SAVE QVOICE boolean on the mods pane — toggle save_qvoice)");
            }
            const saveIntent = doc.save_qvoice === true;
            if (saveIntent) {
                // THE JUDGE ALREADY SPOKE (the DECL audit's row 4): the
                // family-level relation words are judged above by the one
                // implementation. What remains here is what NO family row
                // can say, because it is the LANE's own law: the save's ONE
                // voice source — a reference saves the CLONE (the qvoice
                // boolean law, operator 2026-10-22: "save the embeddings to
                // media" from ANY lane; a reference-cloned voice persists
                // its own .qvoice), a description saves a DESIGN — and the
                // off-source params that perform nothing beside either.
                const refStated = !blank(doc.ref_audio);
                const presetStated = typeof doc.voice === 'string' && doc.voice !== 'none' && doc.voice !== '';
                if (refStated && presetStated) {
                    throw new Error("params 'voice' and 'ref_audio' fire together on the tts card (ONE voice performs — the run's own law; the save persists it)");
                }
                if (presetStated && !blank(doc.design_prompt)) {
                    throw new Error("params 'design_prompt' and 'voice' fire together on the tts card (ONE voice performs — the run's own law; the save persists it)");
                }
                if (refStated && !blank(doc.design_prompt)) {
                    throw new Error("params 'design_prompt' and 'ref_audio' fire together on the tts card (ONE voice performs — the run's own law; the save persists it)");
                }
                if (!refStated && !presetStated) {
                    const missing = ['design_prompt'].filter((k) => blank(doc[k]));
                    if (missing.length > 0) {
                        throw new Error("required Design param(s) " + missing.map((k) => "'" + k + "'").join(' + ') + " missing or empty on the tts card (the save persists whatever the run renders — state a Preset Speaker, a reference clip, or describe who speaks; the run's own one-voice law)");
                    }
                    if (!blank(doc.ref_text)) {
                        throw new Error("param 'ref_text' rides only with 'ref_audio' (the reference is the voice; the transcript describes it)");
                    }
                }
                if (qvoiceStated(doc)) {
                    throw new Error("param 'qvoice' fires nothing beside the save (the exporter persists the run's own render — a saved persona performs nothing beside it; drop the .qvoice)");
                }
                // THE DECLARED ACTION (the atom vocabulary, stroke 3): the
                // boarded family's own export action composes; an unbound
                // row refuses loud below.
                const bound = ACTION_BINDINGS[model.family ?? model.id];
                if (bound)
                    bound.save(doc, model, g, runId);
                else {
                    throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the tts card — the boarded Qwen family (qwen3-tts) composes its own declared segment; this address owns none`);
                }
                return;
            }
            if (lane === 'clone') {
                // THE OPTIONAL-CLONE LAW (operator 2026-10-12, the qwen3-tts
                // docs ruling: "the voice clone is optional, not required"):
                // the reference pair is a voice SOURCE, never a requirement —
                // the engine's own dispatch (qwen3_tts.py:149) clones only
                // when a reference rides; without one the run performs the
                // plain-TTS fallthrough (prompt-only speech, the node's own
                // speaker resolution). What still refuses loud: HALF a
                // source (audio without its transcript or the reverse — an
                // incomplete clone the engine cannot serve), unless a
                // .qvoice performs instead (the DECL's either_or: the
                // persona is itself a complete source).
                if ((blank(doc.ref_audio) !== blank(doc.ref_text)) && !qvoiceStated(doc)) {
                    throw new Error("params 'ref_audio' + 'ref_text' are ONE source on the tts card — state the COMPLETE pair (the 3-second reference + its transcript) or neither (a run with no reference performs prompt-only speech; the clone is optional, never required)");
                }
                if (!blank(doc.style_instruction) || !blank(doc.design_prompt)) {
                    throw new Error("params 'style_instruction'/'design_prompt' fire nothing on the tts card's Base variant (style control styles the CustomVoice persona; the persona description designs on the VoiceDesign variant — switch variants or drop them)");
                }
            }
            else {
                if (!blank(doc.ref_audio) || !blank(doc.ref_text)) {
                    throw new Error("params 'ref_audio'/'ref_text' fire nothing on the tts card outside the Base variant (reference audio only clones — switch to the Base variant or drop the reference)");
                }
                if (lane !== 'design' && !blank(doc.design_prompt)) {
                    throw new Error("param 'design_prompt' fires nothing on the tts card outside the VoiceDesign lane (the persona description designs a voice — switch to the VoiceDesign variant or drop it)");
                }
                if (lane === 'design') {
                    // a saved persona performs nothing on the design lane —
                    // preview or save, the studio designs a NEW voice (the
                    // instruction-control law: a mod that fires nothing on a
                    // lane refuses LOUD, never silently skips). The conflict
                    // row that owned this word died with voice_name; this
                    // seat — the lane's own surface fact — now speaks it.
                    if (qvoiceStated(doc)) {
                        throw new Error("param 'qvoice' fires nothing on the Design lane (the studio designs a NEW voice — a saved persona performs nothing beside it; load it on a synthesis lane)");
                    }
                    // delivery style rides the CustomVoice instruct only —
                    // the design lane's instruct IS the persona description
                    // (one knob per lane, the signature canon).
                    if (!blank(doc.style_instruction)) {
                        throw new Error("param 'style_instruction' fires nothing on the VoiceDesign lane (emotion styling rides the CustomVoice lane — the design lane's instruct is the persona itself; drop the style)");
                    }
                }
                // design_prompt on the design lane: the lane's own required
                // word (the variant relations above) judges blankness — no
                // imperative copy here.
            }
            if (!blank(doc.style_instruction) && !laneTakesStyleInstruction(model)) {
                throw new Error("param 'style_instruction' fires nothing on the resolved TTS lane (this size cell has no instruction control — choose a lane with instruction control or drop the instruction)");
            }
            // THE DECLARED ACTION (the atom vocabulary, stroke 3): the
            // boarded family's own speak action composes (branching on
            // the resolved synth_lane DATA); an unbound row refuses loud
            // below, never a silent second copy.
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound)
                bound.speak(doc, model, g, runId);
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the tts card — the boarded Qwen family (qwen3-tts) composes its own declared segment; this address owns none`);
            }
        },
    }));
}
//# sourceMappingURL=card.js.map