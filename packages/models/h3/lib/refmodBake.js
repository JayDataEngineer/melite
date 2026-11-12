import { mediaKindOf } from '@melite/contracts/mediaKinds';
import { wireList } from './schema.js';
import { REF_CAPS } from './timelineContract.js';
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
export function mountRefModBake(g, opts) {
    const { p, cond: inCond, vaeVideo, vaeAudio } = opts;
    let cond = inCond;
    const bagMods = opts.bagMods ?? [];
    const declaredMods = wireList(p.ref_mods);
    const seenMods = new Set(declaredMods.map((m) => m.trim()));
    const refModsAll = [...declaredMods, ...bagMods.filter((m) => !seenMods.has(m.trim()))];
    if (refModsAll.length === 0)
        return cond;
    if (refModsAll.length > REF_CAPS.refmods) {
        throw new Error(`[h3-timeline] ref_mods exceeds the loader's ${String(REF_CAPS.refmods)} slots (saw ${String(refModsAll.length)})`);
    }
    const modStems = [];
    const modImages = [];
    const modVideos = [];
    const modAudios = [];
    for (const src of refModsAll) {
        // Trim, then query-strip (the estate precedent:
        // timelineContract's _kindOfFile splits '?' first), then split
        // on BOTH separators — a backslash-prefixed or padded entry
        // would otherwise pass the suffix check with junk baked into
        // the stem and die server-side as a combo miss. The two `as`
        // casts are total (split always yields a non-empty array), so
        // this adds no defensive branches to the coverage face.
        // A data: URL rides VERBATIM past the split (the studio's
        // upload chips commit data URLs; the run's staging walk
        // uploads them into the engine's input tree and rewrites the
        // load nodes' slots — the family reads off the MIME here).
        const raw = src.trim();
        const query = raw.split('?')[0];
        const base = query.split(/[\\/]/).pop();
        if (raw.startsWith('data:')) {
            const mime = /^data:([^;,]+)[;,]/.exec(raw)?.[1] ?? '';
            if (mime.startsWith('image/'))
                modImages.push(raw);
            else if (mime.startsWith('video/'))
                modVideos.push(raw);
            else if (mime.startsWith('audio/'))
                modAudios.push(raw);
            else {
                throw new Error(`[h3-timeline] ref_mods entries are ANY media (image/video/audio — the system bakes the pack) or pre-baked .safetensors stems under models/refmods/ (saw '${src.slice(0, 60)}')`);
            }
            continue;
        }
        if (base.endsWith('.safetensors')) {
            modStems.push(base.slice(0, -'.safetensors'.length));
            continue;
        }
        // ANY media boards (mediaKindOf — the contracts SSOT): image →
        // the creator's refs_image.ref_image_N, video →
        // refs_video.ref_video_N via the component split, audio → the
        // audio extractor. Anything the estate does not recognize as
        // media refuses HERE, loud, instead of dying server-side (the
        // I2V census-alignment law).
        const kind = mediaKindOf(base);
        if (kind === 'image')
            modImages.push(query);
        else if (kind === 'video')
            modVideos.push(query);
        else if (kind === 'audio')
            modAudios.push(query);
        else {
            throw new Error(`[h3-timeline] ref_mods entries are ANY media (image/video/audio — the system bakes the pack) or pre-baked .safetensors stems under models/refmods/ (saw '${src}')`);
        }
    }
    // The chain's law: each mods source appends through its own
    // Apply (Apply passes conditioning through, one mods input), in
    // fixed order — pre-baked stems, the baked visual pack, then
    // each baked audio pack.
    const applyMods = (mods) => {
        cond = g.node('MiniMaxH3RefModApply', {
            conditioning: cond, mods, override: false, retention: 1,
            curve_direction: 'constant', scramble_seed: -1,
            curve_shape: 'linear', curve_value: 1,
        }).out(0);
    };
    if (modStems.length > 0) {
        const loaderInputs = { show_info: false };
        for (let i = 0; i < REF_CAPS.refmods; i++) {
            const stem = modStems[i];
            loaderInputs[`mod_${i + 1}`] = stem === undefined ? '(none)' : stem;
            loaderInputs[`strength_${i + 1}`] = 1;
            loaderInputs[`copies_${i + 1}`] = 1;
        }
        applyMods(g.node('MiniMaxH3RefModsLoader', loaderInputs).out(0));
    }
    if (modImages.length > 0 || modVideos.length > 0) {
        // One creator node stacks every visual ref of the seat into a
        // single video-kind mod (the node's own grammar: stills into
        // the refs_image autogrow container's grown slots, frame
        // batches into refs_video's — DOTTED container.slot addressing,
        // the r2v ref_images.ref_image_0 receipt; a BARE ref_image_1
        // key is an undeclared input and phase 1 refuses it, the
        // 2026-10-16 boot-death live burn). name = the first PATH
        // ref's basename, sanitized node-side — a data: upload chip
        // has no basename, so a data-only seat names the generic
        // 'mod'. save rides the node default (true) so the baked pack
        // lands in the loader's dropdown for later reuse.
        const firstVisual = (modImages[0] ?? modVideos[0]);
        const nameBase = firstVisual.startsWith('data:') ? 'mod' : firstVisual.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'mod';
        // THE STATED BAKE (study §5/§7.2; value-arms ARMs 13/14): the
        // fidelity dials are DECLARED params (schema.ts, the refmod
        // group) and ride the node verbatim. The fallbacks are the
        // declared defaults verbatim — one owner, the schema.
        const bakeMode = typeof p.refmod_mode === 'string' ? p.refmod_mode : 'Compressed Reference';
        const bakePool = typeof p.refmod_pool === 'number' && Number.isFinite(p.refmod_pool) ? p.refmod_pool : 16;
        const bakeIdentity = typeof p.refmod_identity === 'number' && Number.isFinite(p.refmod_identity) ? p.refmod_identity : 500;
        const extractInputs = {
            name: nameBase,
            mode: bakeMode, concept_type: 'generic',
            save: p.refmod_save !== false,
            pool_h: bakePool, pool_w: bakePool, identity: bakeIdentity,
            // THE VAE EDGE (2026-11-06 live burn: 'connect an av_encoder
            // (MiniMax-H3 VAE loader) or a standard VAE' — the engine
            // refuses the extract at run time without one; both inputs
            // are schema-optional, so no phase-1 judge can catch it).
            // The family's own optimized H3 VAE rides (the int8-convrot
            // video VAE, the same handle the film lane loads); no
            // MINIMAX_H3_AV_ENCODER loader node exists in this engine's
            // /object_info, so the standard-VAE input is THE wire.
            vae: vaeVideo,
        };
        modImages.forEach((img, i) => {
            extractInputs[`refs_image.ref_image_${i}`] = g.node('LoadImage', { image: img, upload: 'image' }).out(0);
        });
        modVideos.forEach((vid, i) => {
            extractInputs[`refs_video.ref_video_${i}`] = g.node('GetVideoComponents', {
                video: g.node('LoadVideo', { file: vid }).out(),
            }).out(0);
        });
        applyMods(g.node('MiniMaxH3RefModExtract', extractInputs).out(0));
    }
    for (const src of modAudios) {
        // Audio mods are their own extractor (AUDIO in, one mod out);
        // one node per entry, voice-grade defaults, saved for reuse
        // (a data: upload chip names the generic 'audio_mod').
        // budget_policy + concept_type are REQUIRED bare combos in the
        // engine's /object_info — no declared default, so no primed
        // builder autofills them (the B7 wall refuses at compose) — the
        // graph states the pack's own signature defaults
        // (vendor/ComfyUI-MiniMaxH3Mod/nodes.py:2143: budget_policy
        // 'error', concept_type 'voice').
        applyMods(g.node('MiniMaxH3RefModAudioExtract', {
            audio: g.node('LoadAudio', { audio: src }).out(),
            audio_vae: vaeAudio,
            name: src.startsWith('data:') ? 'audio_mod' : src.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'audio_mod',
            budget_policy: 'error', concept_type: 'voice',
            save: true,
        }).out(0));
    }
    return cond;
}
//# sourceMappingURL=refmodBake.js.map