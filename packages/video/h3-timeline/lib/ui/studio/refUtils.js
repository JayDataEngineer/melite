/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
export { mergeDeclaredRefs, normalizeDeclaredRefs, refGenreOf, splitRefList, } from '@melite/models-h3/timelineContract';
export const REF_UPLOAD_SPEC = {
    image: { accept: "image/*", maxMb: 20, note: "≤20 MB" },
    video: { accept: "video/*", maxMb: 24, note: "≤24 MB" },
    audio: { accept: "audio/*", maxMb: 16, note: "≤16 MB" },
};
/** Chip hover note: a known upstream artifact names its card, an
 * unknown name is flagged (it would pass through unresolved). */
export function artifactThumbNote(name) {
    return `artifact: ${name}`;
}
/** Short display name for a declared URL (last path segment) — the
 * full URL rides the title. */
export function declaredShortName(url) {
    const path = url.split("?")[0];
    const tail = path.slice(path.lastIndexOf("/") + 1);
    return tail === "" ? url : tail;
}
//# sourceMappingURL=refUtils.js.map
