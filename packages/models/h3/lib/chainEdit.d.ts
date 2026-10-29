import type { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph';
import type { H3Facts } from './actions.js';
/** The VHS source loader the slice + timeline read (reference node 5
 *  verbatim: force_rate 24 — the film clock — and the zero/one
 *  passthrough knobs; format 'None'). Slot 0 frames, slot 2 audio.
 *  The window seats (repair, 2026-11-12) ride the loader's own cap +
 *  skip — 0/0 is the whole clip, the swap's posture. The SAME loader
 *  yields the frames and the audio, so a windowed load stays in
 *  sync on both wires.
 * @param g the run's graph builder
 * @param path the staged source leaf (input-dir name)
 * @param frameLoadCap 0 loads the whole clip; a repair window caps here
 * @param skipFirstFrames the window's start (repair skips here)
 * @returns [frames, audio] — the loader's slots 0 and 2 */
export declare const loadVideo: (g: GraphBuilder, path: string, frameLoadCap?: number, skipFirstFrames?: number) => OutputHandle[];
/** The family's model + lora plane EVERY masked-edit seat rides
 * (extracted 2026-11-12 when the repair seat joined; ONE sequence,
 * every caller, zero drift — the unification's first stroke). The
 * operator's lora law, 2026-10-28, verbatim: "WE SAID KEEP OUR
 * CURRENT LORA SETUP FOR NOW" — facts.unet, the SLA/lowvram/chunked
 * attention chain, and LTX_lora_loader with h3LoraStackOf(p) (the
 * lora mod bag, else the absent-bag family default): the same plane
 * the film renders under, composed in the same order (actions.ts's
 * renderH3Window is the symmetry owner). No fixed accelerator row,
 * no engine-side stack the operator cannot see or empty. Creation
 * order is pinned by the emission walls — keep the node sequence
 * untouched.
 * @param g the run's graph builder
 * @param p the walked doc params (the lora mod bag + SLA/shift knobs)
 * @param facts the family's lane facts (unet off the DECL row)
 * @param clipSeconds the clip budget (the preview override's frames)
 * @returns the plane's five seats: sigmaModel, samplerSel, clip,
 *  vaeVideo, vaeAudio */
export declare const h3MaskedEditPlane: (g: GraphBuilder, p: Record<string, unknown>, facts: H3Facts, clipSeconds: number) => {
    sigmaModel: OutputHandle;
    samplerSel: OutputHandle;
    clip: OutputHandle;
    vaeVideo: OutputHandle;
    vaeAudio: OutputHandle;
};
/** What the seat's body callback receives: the ChainCurrent node
 * (its .out(k) seats), the plane's encoders/decoders, the muted
 * chain audio (the r2v ref_video_audios seat), and the window's own
 * frames + muted slice audio (the H3SourceSlice seats). */
export interface ChainBodyHandles {
    /** MiniMaxH3ChainCurrent — out(0) state, out(5) seed, out(6)
     * length, out(7) steps, out(8)/out(9) width/height, out(12) the
     * chain's carried audio. */
    readonly cur: {
        out(k: number): OutputHandle;
    };
    readonly clip: OutputHandle;
    readonly vaeVideo: OutputHandle;
    readonly vaeAudio: OutputHandle;
    /** the chain's carried audio, muted −100dB (the r2v audio ref). */
    readonly mutedChainAudio: OutputHandle;
    /** the window's frames (the seat's loader, slot 0). */
    readonly srcFrames: OutputHandle;
    /** the window's source audio, muted (the slice's audio seat). */
    readonly sliceAudio: OutputHandle;
}
/** The seat's masked-edit body: the nodes between ChainCurrent and
 * ChainContext — the r2v anchors, the source slice, the edit latent,
 * the masked target. Returns the two wires ChainContext consumes. */
export type ChainBody = (h: ChainBodyHandles) => {
    /** the r2v's conditioning output. */
    readonly conditioning: OutputHandle;
    /** the ContexMaskedTarget's output. */
    readonly targetLatent: OutputHandle;
};
/** The terminal: ChainAssemble's config, or null when the seat joins
 * by file instead (the single-window extend posture). */
export interface ChainAssembleSeat {
    /** 'source' keeps the source soundtrack; 'generated' assembles the
     * checkpointed H3 sound. */
    readonly audioSource: 'source' | 'generated';
    /** the assemble basename (the `<runId>/<kind>` prefix). */
    readonly filename: string;
}
/** ONE masked-edit chain seat — every delta the spine does not own.
 * The seat validates its own entry, loads its own media, derives its
 * own mask, and hands the body callback; the spine emits everything
 * else with the seats' historical parameters verbatim. */
export interface MaskedChainSeat {
    /** the walked doc params (the lora mod bag + SLA/shift knobs). */
    readonly p: Record<string, unknown>;
    /** the family's lane facts (unet off the DECL row). */
    readonly facts: H3Facts;
    /** the per-window clip budget (the plane's preview + the plan's
     * default duration; for multi-window seats this is ONE window's
     * seconds, never the total). */
    readonly clipSeconds: number;
    /** the plan node's overlap knob (the seat's entry default 39). */
    readonly overlapFrames: number;
    readonly resolution: string;
    readonly seed: number;
    readonly steps: number;
    /** the swap's roles text ('' on repair/extend). */
    readonly roles: string;
    /** the staged source leaf (loader + timeline + lazy video wire). */
    readonly sourceClip: string;
    /** the window's start frame (repair's seat; 0 otherwise). */
    readonly windowStart: number;
    /** the staged picture_1 — the plan's geometry anchor. */
    readonly picture1: OutputHandle;
    /** the window's frames + audio (the seat's loadVideo call). */
    readonly srcFrames: OutputHandle;
    readonly srcAudio: OutputHandle;
    /** the literal plan_json — REQUIRED by ChainPlanModern. When
     * planFromSource is true it is the ignored fallback (the swap and
     * repair ride the plan node's engine-derived shots); when false it
     * IS the plan (the extend cure: the seat's own continuation shots
     * rule — a raw prior is never re-sliced, §3 of the design). */
    readonly planJson: string;
    /** true wires plan_json_input from the plan node (source slicing —
     * the swap/repair semantics); false leaves the literal ruling. */
    readonly planFromSource: boolean;
    /** the scheduler denoise: 1 fresh (swap/extend), partial refine
     * (repair — its own law refuses >= 1 at the seat's door). */
    readonly denoise: number;
    /** the seat's masked-edit body. */
    readonly body: ChainBody;
    /** the ChainAssemble terminal, or null (file-join posture). */
    readonly assemble: ChainAssembleSeat | null;
}
/** The spine's returned handles: the loop-trimmed window (the seat's
 * file join consumes its streams) and, when assembled, the
 * ChainAssemble node's video_path (the assembled film's absolute
 * path — the compose join's append member). */
export interface ChainRender {
    /** MiniMaxH3LoopTrim — out(0) frames, out(1) audio, out(2) the
     * with-overlap images. */
    readonly trimmed: {
        out(k: number): OutputHandle;
    };
    /** ChainAssemble's video_path when the seat assembles; else null. */
    readonly assemblePath: OutputHandle | null;
}
/** Emit the shared masked-edit chain for one seat. The node
 * parameters are the three seats' historical spellings, verbatim;
 * the seat's deltas arrive through the seat interface. The emission
 * ends in LoopEnd (top_level_requeue) and, when configured,
 * ChainAssemble.
 * @param g the run's graph builder
 * @param seat the seat's deltas (see MaskedChainSeat)
 * @returns the trimmed window + optional assemble path (see ChainRender) */
export declare function renderMaskedEditChain(g: GraphBuilder, seat: MaskedChainSeat): ChainRender;
//# sourceMappingURL=chainEdit.d.ts.map
