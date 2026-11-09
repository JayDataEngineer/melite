/**
 * editDecl.ts — THE EDIT DECLARATION'S CLIENT-SAFE SEAT.
 *
 * THE SEAM (the client-bundle purity gate, 2026-11-09): the edit
 * row's rail projection must read the declaration's own field rows
 * — a hand-copied roster would drift while the declaration moved —
 * but the card module (EDIT_MOD's home) imports the compose plane
 * (schema builders, schemastery), and a client value-import of it
 * refuses the client bundle. THE DECLARATION DATA therefore lives
 * here, in a leaf with NO imports: the card seats EDIT_MOD.fields
 * on EDIT_FIELDS (one spelling, the card stays the SSOT), and the
 * studio rail derives its projection from the SAME rows the card
 * serves — the internal/visible_when law judged at the
 * declaration, never re-typed beside it.
 */
/** The edit door's declared field rows — the single spelling the
 *  card serves and the rail projects. Pure data; the card owns the
 *  law these rows carry (internal = admitted, never the operator's
 *  face; visible_when = the posture guards the form shows). */
export const EDIT_FIELDS = [
    // The seat TYPES (the picker law, the siblings' own): video
    // seats are `file` + media 'video'; image seats claim the
    // image square; the two prompt seats are text
    // (agent-composed, user-confirmed).
    { name: 'source_clip', group: 'Source & Window', label: 'Source clip', type: 'file', media: 'video', default: '', tooltip: 'The clip the edit rides. Binds ONE staged leaf: the VHS window loader + the core LoadVideo both read it by staged name, and the timeline reads it back off the native VIDEO wire.' },
    { name: 'carry', group: 'Source & Window', label: 'Carry (all seams)', type: 'boolean', default: true, tooltip: 'THE SPLIT LAW (the one concept the edit door adds): ON (the default) the edit runs the WHOLE film — segments split on the source film\'s own timeline and each continues from the last frame of the previous, joined with the derived AV-legal overlap (39/90/141/192/243 frames — the engine\'s law, never typed). OFF cuts the joins: each segment stands alone. Frame arithmetic (window_start/window_length) is the expert override, never the agent\'s job — typing it wrong repaired 90 of 243 frames once (run-e79f3b304e4b).' },
    { name: 'edit_prompt', group: 'Source & Window', label: 'Edit prompt', type: 'text', default: '', tooltip: 'The edit action text — what the masked region or frame should become (agent-composed, user-confirmed; rides the reference-video prompt seat — no in-graph describer ever rewrites your words).' },
    { name: 'mask_source', group: 'Mask', columns: 3, label: 'Mask source', type: 'select', default: 'region', options: [
            { value: 'region', label: 'Region — per-frame SAM3 track' },
            { value: 'whole-frame', label: 'Whole frame — nothing held' },
            { value: 'static-png', label: 'Static PNG — one staged mask' },
            { value: 'video', label: 'Video — your own per-frame mask' },
        ], tooltip: 'WHERE the edit lands: a per-frame SAM3 track of a free-text region (the per-frame door — a moving subject stays masked frame by frame), the whole frame (an all-white mask, nothing held), ONE staged PNG (the track run\'s pixel-max union is the recommended bridge — the chain resizes it to its own geometry, so the file\'s own shape never matters), or YOUR OWN mask video (a per-frame timeline — the track card\'s mask export is the ready-made one).' },
    { name: 'region_prompt', group: 'Mask', label: 'Region prompt', type: 'text', default: '', visible_when: 'mask_source=region', tooltip: 'The free-text SAM3 detection target naming the region — "hands", "a person", "a face" are param VALUES, never card kinds. The mask tracks every matching object frame by frame. RIDES ONLY the region mask source (refuses empty there).' },
    { name: 'mask', group: 'Mask', label: 'Mask PNG', type: 'image', default: '', visible_when: 'mask_source=static-png', tooltip: 'ONE staged PNG under the static-png mask source — the track run\'s pixel-max UNION is recommended (per-frame motion is the region source\'s own door). The chain decodes it off the red channel and RESIZES it to the plan geometry in-graph: the file\'s own resolution never has to match the clip.' },
    { name: 'mask_video', group: 'Mask', label: 'Mask video', type: 'file', media: 'video', default: '', visible_when: 'mask_source=video', tooltip: 'YOUR OWN per-frame mask staged as a video under the video mask source — the track card\'s mask export is the ready-made one, or any greyscale ride (white = edit, black = hold). The chain decodes it frame by frame and resizes it to its own geometry, then LENGTH-MATCHES it against the clip: a mask whose frame count differs from the clip\'s refuses before a single frame renders, naming both counts — restage the mask at the clip\'s own frame count (the track export already carries it).' },
    { name: 'mask_grow', group: 'Mask', label: 'Mask grow px', type: 'number', visible_when: 'mask_source!=whole-frame', default: 16, min: 0, max: 96, step: 1, tooltip: 'Pixels the mask grows before the edit (seam ring protection; 0 edits exactly the detected region — the grow-0 seam test). Thin structures (handles, caps) lost to a coarse track grow here first — the tuning seat the coarse-mask burn asked for.' },
    { name: 'mask_blur', group: 'Mask', label: 'Mask blur px', type: 'number', visible_when: 'mask_source!=whole-frame', default: 0, min: 0, max: 48, step: 1, tooltip: 'Edge softness of the grown mask (blur radius): 0 is a hard edge, a few px feathers the boundary into the hold — the second tuning seat the coarse-mask burn asked for.' },
    { name: 'detection_threshold', group: 'Mask', label: 'Detection threshold', type: 'number', visible_when: 'mask_source=region', default: 0.5, min: 0, max: 1, step: 0.01, tooltip: 'The SAM3 text-detection score threshold (lower finds more objects, noisier masks; higher only the confident ones).' },
    { name: 'reference', group: 'Identity & Polish', columns: 3, label: 'Identity anchors', type: 'select', default: 'self', options: [
            { value: 'self', label: 'Source clip itself — repair posture' },
            { value: 'still+mannequin', label: 'Still + mannequin — swap posture' },
        ], tooltip: 'WHO the edit keeps: the source clip on its own reference seat (the identity anchor is the person already in the frame — zero new pixels), or a replacement still + the track run\'s mannequin video (the still anchors appearance, the mannequin carries motion; the still must show the person WEARING the target — a garment alone hallucinates the uncovered body, the outfit-swap burn).' },
    { name: 'still', group: 'Identity & Polish', label: 'Replacement still', type: 'image', default: '', visible_when: 'reference=still+mannequin', tooltip: 'The replacement still under the still+mannequin anchors (the R2V ref_images seat + the plan\'s geometry anchor — the person wearing the target look).' },
    { name: 'mannequin', group: 'Identity & Polish', label: 'Mannequin video', type: 'file', media: 'video', visible_when: 'reference=still+mannequin', default: '', tooltip: 'The mannequin video from the track-card run under the still+mannequin anchors (the R2V ref_videos seat — motion the still cannot carry).' },
    { name: 'denoise', group: 'Identity & Polish', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 1, step: 0.01, tooltip: 'The edit pole: partial (0.05–0.5 is the repair window) holds the unmasked region AND its sound; 1 re-renders the masked side whole (the keep_audio dial rides only here). Whole-frame × self at >= 0.8 is the identity boil and refuses — anchor the identity or use the reshoot door.' },
    { name: 'keep_audio', group: 'Identity & Polish', label: 'Keep source audio', type: 'boolean', default: true, tooltip: 'ON: the source soundtrack rides the edit unchanged. OFF (full denoise only): the soundtrack is generated fresh with the edit — a partial pass never drops it (the hold is the point).' },
    { name: 'refine', group: 'Identity & Polish', label: 'Refine pass', type: 'boolean', default: false, visible_when: 'chain_run=null', tooltip: "THE FOURTH DIAL — the refine switch: ON adds the learned second pass to THIS chain (the 3D-conv latent upscale + the low-sigma refine pass ride the edit's OWN latents — same run, no re-encode of a saved clip; partial denoise only). Blank mask + partial denoise + refine on = the classic refine posture." },
    { name: 'scale', group: 'Identity & Polish', label: 'Refine scale', type: 'number', default: 2, visible_when: 'refine=true', min: 1, max: 4, step: 0.05, tooltip: "RIDES ONLY the refine pass (inert when refine is off): the learned upscaler's multiplier — 1 is the same-size sharpening pass (the capacity cure), 2 the classic second pass. A >=2x window past the measured OOM (5.875 s = 141f) refuses naming both cures." },
    { name: 'continuation', group: 'Identity & Polish', label: 'Continuation', type: 'boolean', default: false, visible_when: 'chain_run=null', tooltip: "THE CONTINUATION SWITCH: ON turns this edit into an EXTEND — fresh full-denoise seconds appended to the source's last frame (the forced seam: anything new develops from it frame by frame, never appears whole), joined with the prior into one film. Rides the blank mask + self anchors + denoise 1 (each refused loud otherwise)." },
    { name: 'extend_seconds', group: 'Identity & Polish', label: 'Extend seconds', type: 'number', default: 2.33, visible_when: 'continuation=true', min: 0.91, max: 432.29, step: 0.01, tooltip: 'RIDES ONLY the continuation (inert when off): seconds appended — a single window lands on the engine grid at 24fps (22+17k frames; 2.33s = 56f, 15.08s = 362f the largest single window); above 362f the door joins N uniform windows under the 39f context overlap, exact delivery or a refusal naming the neighbors (ceiling 432.29s).' },
    { name: 'chain_run', group: 'Identity & Polish', label: 'Prior chain run', type: 'chain-run', default: '', width: 2, tooltip: "THE UPSCALE POSTURE'S SEAT: the prior chain run resumed as the deferred 2x pass (denoise 0.24, steps 20); empty = a fresh edit." },
    { name: 'segment_crf', group: 'Identity & Polish', label: 'Segment CRF', type: 'number', default: 18, min: 0, max: 51, step: 1, visible_when: 'chain_run!=null', internal: true, tooltip: 'The H.264 quality of the persisted HQ scene segments the resumed run re-encodes (the adapter\'s own seat; 18 is its default). Rides only the upscale posture — a fresh edit never states it.' },
    { name: 'window_start', group: 'Source & Window', label: 'Window start (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, internal: true, tooltip: 'Frames (at the film clock, 24 fps) to skip before the edit window — 0 starts at the clip head.' },
    { name: 'window_length', group: 'Source & Window', label: 'Window length (frames)', type: 'number', default: 0, min: 0, max: 100000, step: 1, internal: true, tooltip: 'Frames in the edit window — 0 runs to the end of the clip. A stated length must land on the engine grid 22+17k (56, 73, 90, 107, 124, 141…; off-grid refuses naming the nearest legal value) because the plan snap and the tracked mask must cut the same frames. The design window is 2.33 s = 56f (the 2 s class rung).' },
    { name: 'seed', label: 'Plan seed', type: 'number', default: 0, min: 0, max: 4294967295, step: 1, advanced: true, tooltip: 'The chain plan base_seed (the reference runs 0; the sampler seed stays the doc seed).' },
    { name: 'steps', label: 'Plan steps', type: 'number', default: 6, min: 1, max: 30, step: 1, advanced: true, tooltip: 'The chain plan default_steps (reference 6; the sampler steps stay the doc marriage).' },
    { name: 'clip_seconds', group: 'Identity & Polish', label: 'Clip seconds', type: 'number', default: 6, min: 2.5, max: 15, step: 0.1, internal: true, tooltip: 'The plan clip_seconds (reference 6) — the render budget the window is cut within; the plan node\'s own widget band [2.5, 15] is the law.' },
    { name: 'overlap_frames', group: 'Identity & Polish', label: 'Overlap frames', type: 'number', default: 39, min: 0, max: 243, step: 1, internal: true, tooltip: 'INTERNAL (the expert override, admitted but never served): the carry join boundary. The engine accepts exactly 0 (cut) or 39/90/141/192/243 (the AV-continuity law); anything else is refused before a single frame renders. Unstated — the default — derives 39 under carry: true, 0 under carry: false.' },
    { name: 'resolution', label: 'Plan resolution', type: 'select', default: 'auto', advanced: true, options: [
            { value: 'auto', label: 'auto — the film\u2019s own tier (derived; never a cross-regime join)' },
            { value: '480p', label: '480p — quick preview' },
            { value: '576p', label: '576p' },
            { value: '736p', label: '736p — reference default' },
            { value: '768p', label: '768p' },
            { value: '1080p', label: '1080p — ~2.5× slower, needs much more memory' },
        ], tooltip: "The plan resolution tier (reference '736p')." },
];
/** Evaluate one edit field's visible_when guards against the entry
 *  the row rides — the grammar the served form renders (guards
 *  joined by `&`, `key=value`, `!=` negation, `|`-sets), spelled
 *  once at the declaration's owner so the rail judges the same
 *  conditions the form shows for the SAME entry.
 *  @param guard the field's declared visible_when ("key=value&…")
 *  @param entry the edit bag's first entry (the sibling values)
 *  @returns true when every guard holds */
export function editGuardHolds(guard, entry) {
    for (const clause of guard.split('&')) {
        const negated = clause.includes('!=');
        const eq = clause.indexOf('=');
        const key = clause.slice(0, negated ? eq - 1 : eq).trim();
        const want = clause.slice(eq + 1).split('|').map((v) => v.trim());
        const hit = want.includes(String(entry[key] ?? ''));
        if (negated ? hit : !hit)
            return false;
    }
    return true;
}
/** THE RAIL PROJECTION (operator 2026-11-09, the pasted timeline
 *  DOM: the edit commission row printed "window_start 0 ·
 *  window_length 0 · clip_seconds 6 · overlap_frames 39 ·
 *  segment_crf 18 · scale 2 · extend_seconds 2.33" — the frame
 *  dialect and posture-dead seats under the row's label, while the
 *  one concept the edit door adds, the carry split, had no seat at
 *  all). Saved edit entries carry STAMPED DEFAULTS for every
 *  field, so printing every scalar reads as if the run rode all of
 *  them. This projection derives the row from EDIT_FIELDS at
 *  runtime — never a hand-copied roster: an `internal` row never
 *  reaches the rail (admitted at the compose door, never the
 *  operator's seat), and a visible_when-guarded row reaches it
 *  only when its guards hold (scale prints only under refine=true,
 *  extend_seconds only under continuation=true — a seat the run
 *  does not read never prints as if it rode). Undeclared scalar
 *  keys the entry still carries append last — the no-silent-drop
 *  law: state the drift, never hide it. `carry` is skipped here;
 *  the rail's own lead seat states the split in the compose
 *  door's words.
 *  @param entry the edit bag's first entry
 *  @returns the seats the run reads, declaration order */
export function editRailSeats(entry) {
    const out = [];
    const declared = new Set();
    for (const row of EDIT_FIELDS) {
        const name = typeof row['name'] === 'string' ? row['name'] : null;
        if (name === null || name === 'carry')
            continue;
        declared.add(name);
        if (row['internal'] === true)
            continue;
        const guard = typeof row['visible_when'] === 'string' ? row['visible_when'] : '';
        if (guard !== '' && !editGuardHolds(guard, entry))
            continue;
        const value = entry[name];
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '')
                out.push({ key: name, value: trimmed });
        }
        else if (typeof value === 'number' && Number.isFinite(value)) {
            out.push({ key: name, value: String(value) });
        }
        else if (value === true) {
            out.push({ key: name, value: 'true' });
        }
    }
    for (const [key, value] of Object.entries(entry)) {
        if (declared.has(key) || key === 'carry')
            continue;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '')
                out.push({ key, value: trimmed });
        }
        else if (typeof value === 'number' && Number.isFinite(value)) {
            out.push({ key, value: String(value) });
        }
        else if (value === true) {
            out.push({ key, value: 'true' });
        }
    }
    return out;
}
//# sourceMappingURL=editDecl.js.map
