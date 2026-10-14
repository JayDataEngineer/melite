import type { Client } from "@stable-canvas/comfyui-client";
import type { EngineJson } from "./comfyui-types.js";
/** §23 CROSS-ROOTS TREES for the chained-input arms: the run trees
 *  a '<run>/<rel>' tail may resolve under — the own output root
 *  first (the caller's runsRoot — own writes win), then every
 *  manifest state root's `output/` in manifest order. The state
 *  root OF the runsRoot is its parent (runsRoot is
 *  <stateRoot>/output); the dedup keeps the first occurrence so
 *  a manifest naming the own state root adds nothing. The extras
 *  arrive from the caller's config (J12: the MELITE_STATE_ROOTS
 *  env seam retired). Pure. */
export declare function candidateTrees(runsRoot: string, stateRoots?: readonly string[]): string[];
/** The artifact-primitive upload table — image/video/audio/qvoice/mesh
 *  ride the submit-time walk; latent (.safetensors/.pt/.pth) NEVER
 *  uploads. */
export declare const UPLOAD_EXTS: readonly string[];
/** The data-URL mime table (the DATA-URL ARM's allowlist — the
 * stageable mimes, each onto its UPLOAD_EXTS member; a mime outside
 * this table is not a stageable artifact. Audio mimes joined
 * 2026-09-21: the h3-timeline Music row stores its uploads as
 * data:audio/* URLs in the doc, and the clips-stitch walk stages
 * them exactly like the retired image conditioning maps — decode
 * verbatim to tmp, upload, rewrite the graph input to the staged
 * name). */
export declare const DATA_URL_IMAGE_EXT: Record<string, string>;
/** params['workflow'] + params['inject'] -> the final graph.
 *  The refusal strings are the contract; a wall pins them
 *  verbatim (this function is the graph-splice SSOT). */
export declare function spliceWorkflow(nodeParams: Record<string, EngineJson>): Record<string, EngineJson>;
/** POST /upload/image multipart over the SDK client's fetchApi
 *  (the platform FormData owns the boundary — the hand-rolled
 *  multipart framing is deleted). */
export declare function uploadFile(client: Client, path: string): Promise<Record<string, string>>;
export declare function isFile(path: string): boolean;
/** The estate's asset-URL prefixes — the two surfaces that serve
 *  run artifacts. /melite-media/runs is the browser media route;
 *  /v1/assets/runs is the compose door's artifact currency (the
 *  dangling-ref gate accepts exactly these two forms). */
export declare const MEDIA_ROUTE_PREFIX: string;
export declare const ASSET_ROUTE_PREFIX: string;
/** The gallery's read route (packages/web/infer-gallery/src/index.ts
 *  registers this exact path — retyped with its owner named, like
 *  the guard's twin: no contract owns the gallery's spelling). */
export declare const GALLERY_ARTIFACT_ROUTE = "/infer-gallery/artifact";
/** THE ROUTE BOUNDARY (round-23 gallery audit F6): the gallery's
 *  read route is the EXACT path /infer-gallery/artifact — a longer
 *  spelling (/infer-gallery/artifact-evil, .../artifact/?path=…)
 *  is a route the server 404s, never the artifact face. Twins the
 *  guard's galleryTail boundary in runsSourceEcho: "?" or
 *  end-of-string continues the face; anything else is not a gallery
 *  pointer. Case-insensitive like every estate prefix. */
export declare function isGalleryArtifactRoute(t: string): boolean;
/** Walk the FINAL graph; stage every existing local-media path,
 *  with the VHS_LoadVideoPath/VHS_LoadVideo `video` exemption.
 *
 *  opts.runsRoot (the runs OUTPUT tree root — callers hold the run
 *  dir; its dirname is the root) arms the ESTATE-ASSET arm: URLs the
 *  estate's own surfaces serve (/melite-media/runs/<run>/<rel>,
 *  /v1/assets/runs/<run>/<rel>) and runs-relative <run>/<rel> names
 *  resolve ON DISK under the root and upload like local files. This
 *  is the chained-stage seam: a downstream card wired to an upstream
 *  run's output carries that URL in its params, and ComfyUI consumes
 *  only staged input-dir names. A prefixed URL that does not resolve
 *  under the root refuses LOUD (never a dangling URL in the graph);
 *  a runs-relative name that misses simply falls to the cwd arm. */
export declare function uploadReferenced(client: Client, wf: Record<string, EngineJson>, opts?: {
    runsRoot?: string;
    stateRoots?: readonly string[];
}): Promise<{
    graph: Record<string, EngineJson>;
    uploaded: Record<string, string>;
}>;
//# sourceMappingURL=comfyui-upload.d.ts.map
