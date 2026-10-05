export interface MediaVocab {
    readonly image: readonly string[];
    readonly audio: readonly string[];
    readonly video: readonly string[];
    readonly model: readonly string[];
    readonly galleryImage: readonly string[];
    readonly galleryAudio: readonly string[];
    readonly galleryVideo: readonly string[];
    readonly galleryModel: readonly string[];
    readonly maxListedImages: number;
}
/** The estate media-kind vocabulary (typed DATA — see header). */
export declare function mediaVocab(): MediaVocab;
/** The one media KIND a name carries, or undefined when the name is
 * not media. THE ONE CLASSIFIER (the li-ay stroke): four seats
 * classified artifact names — the estate's disk-row hero
 * (runsRegistry.enrichDiskRow), the run-list kind derivation, the
 * gallery client's vocabulary, and the restore stamp's media filter
 * (bench-load) — and the two private regex seats disagreed with the
 * two vocab seats on BOTH ends (svg/bmp dropped by the heroes,
 * avif/m4v/avi hero'd but never classified). Every seat answers
 * through THIS function now; a seat that wants "is it media" asks
 * `mediaKindOf(name) !== undefined` and a seat that wants "is it a
 * video" asks `mediaKindOf(name) === "video"`. The extension is the
 * last dot-segment, lowercased, exactly as the vocab stores it. */
export type MediaKind = "image" | "audio" | "video" | "model";
/** The media kind a filename carries, or undefined for non-media. */
export declare function mediaKindOf(name: string): MediaKind | undefined;
/** Is this a 3D-MODEL url or data-URI? THE ONE spelling
 *  (2026-10-13, the card-UI duplication audit: five seats carried
 *  their own model regex and they had already drifted — one matched
 *  a query or fragment, two matched only a bare extension, so the
 *  same ".glb?v=2" classified as a model in one seat and as nothing
 *  in another. A new extension in the vocabulary reaches every seat
 *  through THIS.) Query and fragment are stripped before the
 *  vocabulary answers, and the glTF data-URI forms are recognised
 *  because a data URI has no extension. */
export declare function isModelUrl(value: string): boolean;
/** Does this name carry any media kind at all? (the hero filters'
 * ONE spelling — never a private extension regex again) */
export declare function isMediaArtifactName(name: string): boolean;
/** The vocabulary's ext sets are DISJOINT (the classifier's
 * determinism floor: one name, one kind — the precedence order only
 * matters the day this stops being true, and this wall makes that
 * day loud instead of silent). */
export declare function mediaKindsDisjoint(): boolean;
/** The content-type one artifact answer carries: the extension's
 *  mapped media type, octet-stream for everything unknown. */
export declare function contentTypeForArtifact(name: string): string;
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
export declare function servableLeaf(leaf: string): boolean;
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
export declare function segmentConfined(decoded: string): boolean;
//# sourceMappingURL=mediaKinds.d.ts.map
