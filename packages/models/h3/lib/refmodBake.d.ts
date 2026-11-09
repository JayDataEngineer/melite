import type { GraphBuilder, OutputHandle } from '@melite/comfyui-card-kit/graph';
/** Mount the ref_mods bake onto a conditioning handle.
 *
 * The merge law (2026-11-08, study §2b / G7): the run-level
 * `ref_mods` (declared, rides EVERY window) and the window's own
 * bag mods MERGE — declared first, then the bag's not already
 * present (deduped by trimmed value), so a stated pack never drops
 * and a double-stated pack never double-spends a loader slot. An
 * empty union returns `cond` UNTOUCHED (byte-stable: a run with no
 * mod seat composes the same graph as before this module existed).
 *
 * @param g the compose graph.
 * @param opts.p the walked doc params (ref_mods + the refmod_*
 *   dials, both wire forms through wireList).
 * @param opts.bagMods the calling window's own mod bag, if any (the
 *   film path's per-call seat; the edit path has none).
 * @param opts.cond the conditioning the bake appends onto.
 * @param opts.vaeVideo the family's video VAE handle.
 * @param opts.vaeAudio the family's audio VAE handle.
 * @returns the conditioning handle, wrapped by every Apply the
 *   declared entries mint (or the input verbatim when none). */
export declare function mountRefModBake(g: GraphBuilder, opts: {
    p: Record<string, unknown>;
    bagMods?: readonly string[];
    cond: OutputHandle;
    vaeVideo: OutputHandle;
    vaeAudio: OutputHandle;
}): OutputHandle;
//# sourceMappingURL=refmodBake.d.ts.map