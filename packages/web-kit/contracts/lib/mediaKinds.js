/** The estate media-kind vocabulary (typed DATA — see header). */
export function mediaVocab() {
    return {
        image: ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"],
        // qvoice is the voice bank's own container: the tts lane saves a
        // voice as one, and a vocabulary without it classified a preserved
        // voice as non-media — it was served but never listed
        // (the TTS chain audit, 2026-10-15).
        audio: ["wav", "flac", "mp3", "ogg", "m4a", "aac", "qvoice"],
        video: ["mp4", "webm", "mkv", "mov", "m4v", "avi"],
        model: ["glb", "gltf"],
        // TEXT (the tagger audit, 2026-10-24: "the output text isn't
        // saving in media, nor is available in the card preview"): the
        // four extensions are SaveText's own format set — the engine's
        // text-output node mints exactly these, so the estate's text
        // artifacts (a tagger's tags.txt, a caption .csv, a result .json
        // row) classify, hero, list, and preview. The harness's own
        // bookkeeping sidecars (_request.json, _flow.json) carry the
        // underscore prefix and are excluded by NAME at the listing
        // seats — never by extension (an extension ban would kill the
        // real .json artifacts to hide two sidecars).
        text: ["txt", "csv", "md", "json"],
        galleryImage: ["png", "jpg", "jpeg", "webp", "gif"],
        galleryAudio: ["wav", "flac", "ogg", "mp3"],
        galleryVideo: ["mp4", "webm", "mov"],
        galleryModel: ["glb", "gltf"],
        // every text ext lists: SaveText mints all four formats on this
        // estate (the format param is the card's own surface)
        galleryText: ["txt", "csv", "md", "json"],
        maxListedImages: 3,
    };
}
const KIND_BY_EXT = (() => {
    const table = {};
    const vocab = mediaVocab();
    // fixed order: video, image, audio, model, text (the client's
    // documented precedence — moot while the ext sets are disjoint,
    // pinned by the disjointness wall so it stays moot). The
    // `=== undefined` arm is unreachable by data over the five disjoint
    // vocabularies; it is KEPT as the first-wins precedence that
    // becomes load-bearing the day the sets stop being disjoint
    // (mediaKindsDisjoint says so).
    ["video", "image", "audio", "model", "text"].forEach((kind) => {
        for (const ext of vocab[kind]) {
            if (table[ext] === undefined)
                table[ext] = kind;
        }
    });
    return table;
})();
/** The media kind a filename carries, or undefined for non-media. */
export function mediaKindOf(name) {
    const dot = name.lastIndexOf(".");
    if (dot < 0 || dot === name.length - 1)
        return undefined;
    return KIND_BY_EXT[name.slice(dot + 1).toLowerCase()];
}
/** Is this a 3D-MODEL url or data-URI? THE ONE spelling
 *  (2026-10-13, the card-UI duplication audit: five seats carried
 *  their own model regex and they had already drifted — one matched
 *  a query or fragment, two matched only a bare extension, so the
 *  same ".glb?v=2" classified as a model in one seat and as nothing
 *  in another. A new extension in the vocabulary reaches every seat
 *  through THIS.) Query and fragment are stripped before the
 *  vocabulary answers, and the glTF data-URI forms are recognised
 *  because a data URI has no extension. */
export function isModelUrl(value) {
    if (/^data:model\/gltf(?:-binary|\+json)[;,]/i.test(value))
        return true;
    // split with a limit always returns one element, so the `[0]` read
    // is total (the `?? value` fallback was a dead leg)
    const withoutQuery = value.split(/[?#]/, 1)[0];
    return mediaKindOf(withoutQuery) === "model";
}
/** Is this name audio a PLAYER can decode (operator 2026-11-12: a
 *  .qvoice output must carry no play button)? qvoice classifies as
 *  audio so a preserved voice LISTS in the media library (the TTS
 *  chain audit, 2026-10-15), but the container carries voice
 *  EMBEDDINGS, not PCM — the player seat (not the classifier) asks
 *  this predicate, so listing and playback stay two different
 *  questions with one spelling between them. @param name the file
 *  name or url (query/fragment stripped like every other seat). */
export function isPlayableAudioName(name) {
    const withoutQuery = name.split(/[?#]/, 1)[0];
    return mediaKindOf(withoutQuery) === "audio" && !withoutQuery.toLowerCase().endsWith(".qvoice");
}
/** Does this name carry any media kind at all? (the hero filters'
 * ONE spelling — never a private extension regex again) */
export function isMediaArtifactName(name) {
    return mediaKindOf(name) !== undefined;
}
/** The vocabulary's ext sets are DISJOINT (the classifier's
 * determinism floor: one name, one kind — the precedence order only
 * matters the day this stops being true, and this wall makes that
 * day loud instead of silent). */
export function mediaKindsDisjoint() {
    const vocab = mediaVocab();
    const seen = new Set();
    for (const kind of ["video", "image", "audio", "model", "text"]) {
        for (const ext of vocab[kind]) {
            // the overlap arm is unreachable by data over the five
            // disjoint vocabularies and KEPT as the wall that says so —
            // the day an ext lands in two kinds, this returns false and the
            // first-wins precedence above becomes load-bearing
            if (seen.has(ext))
                return false;
            seen.add(ext);
        }
    }
    return true;
}
/** Is this the harness's own BOOKKEEPING file (a run dir sidecar)?
 *  ONE spelling (the text-kind stroke, 2026-10-24): the underscore
 *  prefix is the estate's sidecar convention (_request.json,
 *  _flow.json, _ledger.jsonl), and the disk-walking seats (the media
 *  list) skip these by NAME — real artifacts a run harvested never
 *  carry the prefix, so the hero/restore seats (fed from the
 *  harvested artifact list) never meet one. @param name the file
 *  name (any path shape; the LAST segment is judged). */
export function isEstateSidecarName(name) {
    const base = name.slice(name.lastIndexOf("/") + 1);
    return base.startsWith("_");
}
/** The MIME table for artifact SERVING (the audio-seek stroke,
 *  2026-10-08): ONE spelling of extension → content-type shared by
 *  every route that serves run artifact bytes (the estate media
 *  route + the gallery artifact route — the gallery's inline
 *  ternary had already drifted: mp4 answered video/webm, audio
 *  answered octet-stream, and no player seeks what it is barely
 *  willing to name). Unknown extensions answer octet-stream.
 *
 *  svg is DELIBERATELY ABSENT: an inline image/svg+xml answer is a
 *  same-origin script execution vector — svg artifacts serve as
 *  octet-stream (a download), never an executable document. */
const MIME_BY_EXT = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    glb: "model/gltf-binary",
    gltf: "model/gltf+json",
    json: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    md: "text/markdown; charset=utf-8",
};
/** The content-type one artifact answer carries: the extension's
 *  mapped media type, octet-stream for everything unknown. */
export function contentTypeForArtifact(name) {
    const dot = name.lastIndexOf(".");
    const ext = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
    return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
/**
 * THE SERVABLE LEAF, ONCE (2026-10-10, the MCP/media audit's H5).
 *
 * Two doors answer run-relative artifact paths and they disagreed on
 * the LEAF: the estate's media route refuses every underscore-
 * prefixed name except the minted `_poster.jpg`, while the gallery's
 * artifact route served any well-formed run-relative name — so a
 * private record (`_flow.json`, `_request.json`) was refused by one
 * door and served by the other. The SHAPE check is each door's own
 * (they take different inputs); the LEAF rule is this one.
 */
export function servableLeaf(leaf) {
    if (!leaf.startsWith("_"))
        return true;
    return leaf === "_poster.jpg"; // the one minted exception (the thumbnail law)
}
/**
 * ONE CONFINED SEGMENT GRAMMAR, ONCE (2026-10-10, the audit's
 * "artifact-URL parsing ×3").
 *
 * Three doors judged "what is one legal segment of a run-relative
 * artifact path" with three private predicates, and they had already
 * disagreed: the estate's media route and the queue's source-echo
 * each carried an identical private `segmentOk` (not empty, not
 * `.`/`..`, no NUL — any other byte legal, because the engines MINT
 * raw names: `out 1.png`, unicode, parens), while the gallery's
 * artifact route judged a `[A-Za-z0-9._-]+` CHARSET — so an artifact
 * the engine minted with a space in its name SERVED on the media
 * route and answered 400 on the gallery's. One grammar, mint→serve
 * round-trip law intact; each door keeps its own SPLIT policy (the
 * URL-path door filters empty segments before WHATWG normalization
 * consumes them; the query-param door does not) — the BYTES of a
 * legal segment are this function and nothing else.
 */
export function segmentConfined(decoded) {
    // defense-in-depth dot/empty fence: the HTTP doors never deliver
    // these spellings to the segment loop (WHATWG URL normalizes every
    // single/double-dot spelling; parseTarget filters empties) — the
    // fence stays for every non-URL caller, and the NUL arm below is
    // the behavioral wall.
    if (decoded === "" || decoded === "." || decoded === "..")
        return false;
    if (decoded.includes("\0"))
        return false;
    return true;
}
//# sourceMappingURL=mediaKinds.js.map
