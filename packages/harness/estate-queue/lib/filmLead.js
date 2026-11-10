// filmLead.ts — the ENGINE FILM presentation law (2026-09-22, the
// disk-stitch valve's death): the harness NEVER composes media —
// no ffmpeg, no concat, no mix. Every artifact traces to a
// composition of cards; the film is assembled in-graph (the
// film-assemble stage's model-free workflow). What survives here
// is the one pure, filesystem-free decision the gallery needs:
// when the engine composed the film itself, the film leads the
// names.
/** The ENGINE FILM artifact — the in-graph assembly's output
 *  (SaveVideo prefix `<runId>/h3_t4_film` + ComfyUI's counter
 *  suffix; F14 2026-11-12 — the run row key may carry a leading run
 *  path or harvest nodeId segment before the canonical stem).
 *  THE OUTPUT-NAME FILE TAIL (2026-11-19, queue 12's file plane): a
 *  spelled output_name rides the prefix leaf
 *  (`h3_t4_film_<slug>_00001_.mp4`) — the optional slug segment
 *  below admits the born-named film WITHOUT widening to foreign
 *  files: the machinery stem still anchors the match, the counter
 *  law still ends it, and the slug is the schema's own lowercase
 *  slug charset (never a path separator — [/_] before the stem
 *  stays the only boundary the finder reads). */
const ENGINE_FILM_RE = /(?:^|[/_])h3_t4_film(?:_[a-z0-9][a-z0-9-]*)?_\d+_\.mp4$/;
/** The engine-composed film's name among a stage's artifacts, if
 *  any — presentation order only, never composition. */
export function engineFilmName(names) {
    return names.find((n) => ENGINE_FILM_RE.test(n)) ?? null;
}
//# sourceMappingURL=filmLead.js.map
