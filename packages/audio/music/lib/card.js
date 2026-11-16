import z from '@deepseek-ai/schemastery';
import { declaredAction, instantiateAction } from '@melite/comfyui-card-kit';
import { vocabulary } from '@melite/comfyui-card-kit/vocab';
import { bag } from '@melite/contracts/extraKeys';
import { seedExtra } from '@melite/comfyui-card-kit/fields';
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission';
import { primeFamilySeats, seatOf } from "./family-seats.js";
export const schema = z.object({
    prompt: z.string().description("Tags / Description").extra('extra', bag({ order: 0, group: "prompt", columns: 1, tooltip: "Structured caption, three sections: Global Metadata (genre, mood, BPM) + Vocal Details (gender, timbre, range) + Arrangement (instruments, structure). Weak one-word captions end the song early — the tail turns to noise. E.g. 'A funk-pop soul track at 105 BPM; male baritone, warm rasp; clean guitar riff, brass stabs, tight pocket drums'.", required: true, wtype: 'textarea', })),
    lyrics: z.string().description("Lyrics").extra('extra', bag({ order: 1, group: "prompt", tooltip: "The song's PLAN — length lives here, not in Duration. Sung words with structure tags ([verse], [chorus]) for a song. Instrumental: sequential section tags only, each on its own line — [intro] / [instrumental] / [solo] / [instrumental] / [outro] — the model grants ~20-40s per block; repeat blocks to reach target length. An EMPTY box (or a lone [instrumental]) plans one ~35s phrase and ends. Keep 'no vocals, no choir, no humming' in the caption so extended blocks stay instrumental.", wtype: 'textarea' })),
    duration: z.number().description("Duration (s)").min(5).max(360).step(1).default(30).extra('extra', bag({ order: 0, group: "generation", width: 1, tooltip: "Audio length CEILING in seconds (5-360) — never a floor: the model ends the song when its plan ends, not when this number arrives. The plan lives in the LYRICS field — sung words for a song, sequential section tags ([intro] / [instrumental] / [solo] blocks, one per line, ~20-40s each) for an instrumental. An empty or single-tag lyrics box plans ONE phrase and wraps ~35s no matter how high this sits. Long track (>2min) + CUDA OOM: state tiled_decode.", wtype: 'slider' })),
    mode: vocabulary(["full", "melody", "off"]).description("ABC Planning").default("full").extra('extra', bag({ order: 1, group: "generation", width: 1, tooltip: "YuE2 only: plan a symbolic score before generating. full = melody + chords; melody = melody only (cover-recommended); off = direct generation.", wtype: 'select', visible_when: 'model=yue2' })),
    guidance_scale: z.number().description("CFG").min(0.1).max(10).step(0.1).default(1.7).extra('extra', bag({ order: 2, group: "generation", width: 1, tooltip: "Classifier-free guidance (KSampler cfg). 1.7 = the default.", visible_when: 'model=music3' })),
    // THE SERVED DEFAULT (the full-schedule checkpoint tier's own
    // default — the step↔checkpoint pairing; the tooltip carries the
    // number). THE PLUGIN LAW (L3 cure, 2026-11-16): the tier
    // constant lives in the family package (music3's tier.ts,
    // MUSIC3_FULL_STEPS.default) and this card loads WITHOUT it, so
    // the number is a literal here — one home of the DERIVATION stays
    // tier.ts (the DECL's resolver_defaults spread from it, and the
    // step-tier wall judges the marriage on the dev tree); the
    // compose action refuses a stated steps outside the resolved
    // checkpoint's tier window at run time, never a silent drift.
    n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(200).step(1).default(30).extra('extra', bag({ order: 3, group: "generation", width: 1, tooltip: "Denoising steps. 30 = the default (the full-schedule checkpoint tier's own default — the step↔checkpoint pairing). A distilled checkpoint states its own tier's window. Never 0.", wtype: 'number' })),
    lm_cfg_scale: z.number().description("LM CFG").min(0.1).max(10).step(0.1).default(1.7).extra('extra', bag({ order: 4, group: "generation", width: 1, tooltip: "Lyric-encoder guidance (MiniMaxMusic3TextEncode cfg_scale). 1.7 = the default.", visible_when: 'model=music3' })),
    seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag(seedExtra({ order: 0, group: 'seed', width: 1 }))),
    // THE DECODE TIER KNOB (audit 014 C3): NO .default() — absence is
    // the derivation's seat (the action derives plain/tiled from the
    // lane's own VRAM/size signal; a stamped literal here would be the
    // second default home the cure forbids). Stated, it overrides.
    tiled_decode: z.boolean().description("Tiled VAE Decode").extra('extra', bag({ order: 5, group: "generation", width: 1, tooltip: "Decode the audio latent in segments (lower VRAM, no quality loss at the template's 1536/64 seats). Absent = derived from the checkpoint's own numbers — a low-VRAM checkpoint or a track past 90s tiles; a roomy checkpoint at a short track decodes plain.", visible_when: 'model=music3' })),
});
const schemaFn = callableSchema(schema);
// THE FAMILY IDS ARE LITERALS (the plugin law, L3 cure, 2026-11-16:
// "The Card can exist without a Family"): the family packages
// resolve through ./family-seats.ts (guarded dynamic seats, primed
// at registration) — a missing family package costs its OWN seat,
// never this card's load. A retyped id breaks the binding on the
// dev tree (the family-coverage wall judges every boarded entry
// against the live registry; the seat table skips a module whose
// DECL id names nothing), never silently at the not-boarded
// refusal.
export const BOARDED = ['music3', 'yue2'];
/** THE SEAT-DRIVEN DISPATCH (the atom vocabulary, stroke 3): the
 *  owning family's declared compose action, resolved through the
 *  family's SEAT (family-seats.ts) at call time — the card owns
 *  only dispatch; the segment factories live in the family
 *  packages (the legacy lanes stay the declared fallback +
 *  byte-oracle). A family package absent from the install refuses
 *  loud HERE, by name; the card itself still loads and registers. */
export function composeFamilyAction(family, p, model, g, runId) {
    const seat = seatOf(family);
    if (seat === undefined) {
        throw new Error(`no declared action for family '${family}' on the music card — every boarded family (music3, yue2) composes its own declared segment; this address owns none (a family package absent from the install refuses here, by name)`);
    }
    instantiateAction(declaredAction(seat.decl, 'compose'), p, model, g, runId);
}
/** THE ACTION BINDINGS: the dispatch table compose reads at call
 *  time, keyed by OWNING FAMILY (`model.family ?? model.id` — a
 *  route id keys nothing, the derived-row law). Each row closes
 *  over its literal family id and resolves the DECL through the
 *  seat, so a pruned family package costs its row's reach, never
 *  the table (the value-roundtrip corruption seats swap rows
 *  here). */
export const ACTION_BINDINGS = {
    ['music3']: (p, model, g, runId) => {
        composeFamilyAction('music3', p, model, g, runId);
    },
    ['yue2']: (p, model, g, runId) => {
        composeFamilyAction('yue2', p, model, g, runId);
    },
};
/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
    label: 'Music',
    description: 'Generate music — MiniMax Music 3 (structured captions with tagged lyrics) or YuE2-3B (style + lyrics with ABC planning)',
    genre: 'audio',
    icon: 'music',
};
export function registerCard(ctx, comfy) {
    // THE PLUGIN LAW'S PRIMING (fire-and-forget, image-gen shape): the
    // guarded dynamic imports of the boarded family packages start
    // here; registration NEVER waits on a family package — a pruned
    // family costs its own seat, never the estate boot.
    void primeFamilySeats();
    ctx.effect(() => comfy.registerCard({
        id: 'music',
        // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
        skeleton: 'music',
        // THE BOARDING LITERALS (the plugin law): ids stated once, judged
        // on the dev tree by the family-coverage wall (a board naming
        // nothing reds there), never derived at load from a package this
        // card must load without.
        boarded: [...BOARDED],
        tags: ['audio', 'music', 'generate'],
        identity,
        // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
        // discovery export — the card owns its sidebar, surface, and
        // flow-stage declarations; the discovery arms derive from here).
        sidebar: { key: 'audio', order: 5 },
        flowKinds: {
            inputs: { prompt: 'text', lyrics: 'text' },
            outputs: { default: 'audio' },
            requiresModel: false,
        },
        // stock-only card: the MiniMax + YuE2 nodes ride upstream core
        // (comfy_extras.nodes_minimax_music / nodes_yue2); no requires.
        // THE MODEL ADMISSION (F3-04, 2026-11-15): compose resolves the
        // doc through gatedResolve('music', schemaFn, ['model'], p) —
        // the model row id is admitted BEYOND the schema knobs (the
        // card's own lane branch reads it; flowKinds.requiresModel:
        // false only lifts the flow-stage demand). Declared here so
        // the registry's admission surface (cardsFacts: def.admits)
        // matches what the compose door actually serves — the
        // dropped-knob sweep (runs-graph-receipt ARM j) reds on the
        // gap this row used to be.
        admits: ['model'],
        schema: schemaFn,
        compose(p, model, g, runId) {
            // THE SCHEMA GATE (the h3 admission precedent — the card's
            // own declaration validates the last hop into the engine):
            // schemastery walk enforces declared types + bounds (a
            // duration=900 draft refuses LOUD here, never composes),
            // fills defaults, admits legacy keys inert. The composer's
            // reads below are reads of the GATED doc.
            const doc = gatedResolve('music', schemaFn, ['model'], p);
            if (!doc.prompt) {
                throw new Error("required param 'prompt' missing or empty on the music card (the music caption — what the song IS)");
            }
            // THE LANE BRANCH (data never a family-id switch — the
            // latent_node precedent): yue2's rail resolves a checkpoint
            // row (one file carries model+clip+vae); music3's resolves
            // the unet/clip/vae trio. THE DECLARED ACTIONS (the atom
            // vocabulary, stroke 3): each boarded family's own compose
            // action composes first — the data branch below is the
            // declared legacy-lane fallback for family-less rows, never a
            // silent second copy.
            const bound = ACTION_BINDINGS[model.family ?? model.id];
            if (bound) {
                bound(doc, model, g, runId);
            }
            else {
                throw new Error(`no declared action for family '${String(model.family ?? model.id)}' on the music card — every boarded family (music3, yue2) composes its own declared segment; this address owns none. State params.model (one of the boarded families) on the stage to compose it`);
            }
        },
    }));
}
//# sourceMappingURL=card.js.map
