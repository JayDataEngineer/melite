/**
 * artifact-ops — the modal's delete + rename wires (the media
 * sidebar's popup modal on media stuff).
 *
 * Both doors ride the gallery host's SAME-ORIGIN mutating routes
 * (POST /infer-gallery/artifact-delete {path},
 * POST /infer-gallery/artifact-rename {path, name}) — the read
 * artifact route stays read-only, so a prefetcher can never mutate
 * by URL. Failures surface as thrown Errors carrying the door's
 * `error` code, never silent.
 */
/** The artifact's FILE NAME behind an artifact URL — THE ONE LAW
 *  (the operator's 2026-09-26 report: a real .glb was refused as
 *  `"artifact" is not a .glb/.gltf artifact`, because the media route
 *  serves `/infer-gallery/artifact?path=<run>/<file>` and the caller
 *  read the ROUTE's last path segment). `?path=` first, the plain URL
 *  path second (a directly-served file has no query). */
export declare function artifactNameOf(url: string): string;
/** The run-relative artifact path behind one same-origin artifact
 *  URL (`/infer-gallery/artifact?path=run-<id>/<file>`) — null when
 *  the URL rides no such path (foreign URLs, card previews). */
export declare function artifactPathOfUrl(url: string): string | null;
/** Unlink one run-relative artifact file. */
export declare function deleteArtifact(path: string): Promise<void>;
/** Rename one artifact inside its own directory — resolves the new
 *  run-relative path + its same-origin URL (the preview re-points). */
export declare function renameArtifact(path: string, name: string): Promise<{
    path: string;
    url: string;
}>;
//# sourceMappingURL=artifact-ops.d.ts.map
