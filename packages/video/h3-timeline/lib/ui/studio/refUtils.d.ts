/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
export { mergeDeclaredRefs, normalizeDeclaredRefs, refGenreOf, splitRefList, } from '@melite/models-h3/timelineContract';
/** One upstream image artifact — a link-to-previous-output picker row. */
export interface LinkArtifact {
    /** The ctx-key NAME the picker writes (what _resolveSource resolves). */
    name: string;
    /** Servable URL — the row's thumbnail. */
    url: string;
    /** The owning upstream card's title. */
    title: string;
}
export declare const REF_UPLOAD_SPEC: Record<"image" | "video" | "audio", {
    accept: string;
    maxMb: number;
    note: string;
}>;
/** Chip hover note: a known upstream artifact names its card, an
 * unknown name is flagged (it would pass through unresolved). */
export declare function artifactThumbNote(name: string): string;
/** Short display name for a declared URL (last path segment) — the
 * full URL rides the title. */
export declare function declaredShortName(url: string): string;
//# sourceMappingURL=refUtils.d.ts.map
