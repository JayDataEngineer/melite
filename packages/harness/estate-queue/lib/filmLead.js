// filmLead.ts — the ENGINE FILM presentation law (2026-09-22, the
// disk-stitch valve's death): the harness NEVER composes media —
// no ffmpeg, no concat, no mix. Every artifact traces to a
// composition of cards; the film is assembled in-graph (the
// film-assemble stage's model-free workflow). What survives here
// is the one pure, filesystem-free decision the gallery needs:
// when the engine composed the film itself, the film leads the
// names.
/** The ENGINE FILM artifact — the in-graph assembly's output
 *  (SaveVideo prefix h3_t4_film + ComfyUI's counter suffix). */
const ENGINE_FILM_RE = /(?:^|\/)h3_t4_film_\d+_\.mp4$/;
/** The engine-composed film's name among a stage's artifacts, if
 *  any — presentation order only, never composition. */
export function engineFilmName(names) {
    return names.find((n) => ENGINE_FILM_RE.test(n)) ?? null;
}
//# sourceMappingURL=filmLead.js.map