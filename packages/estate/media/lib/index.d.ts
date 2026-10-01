import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { runMediaPrefixOf, canonicalRunMediaUrl } from "@melite/contracts/benchStage";
export declare const name = "estate-media";
/** NOTHING is injected: the estate bundle rides headless mounts too
 * (the queue/drafts seats are headless-safe; the web carrier is
 * not). The webServer seat is an OPTIONAL PROBE at apply time —
 * absent (a headless mount) the route simply does not mount, with a
 * log line saying so; the queue seat is an optional probe at the
 * USE site (the gallery's law): an absent queue in a web mount is a
 * LOUD 502 naming the fix — no fallback absorbs it. */
export declare const inject: readonly [];
/** The route this plugin claims (one prefix, disjoint by law). */
/** THE CONTRACT'S TWO NAMES (benchStage.ts) — the estate owns no
 *  copy: the media route mounts both, the readers accept both, and
 *  the bench heals stored paths to the live one. */
export declare const MEDIA_PREFIX = "/melite-media/runs";
/** THE LEGACY SPELLING, STILL SERVED (operator, 2026-10-10: "THERE
 *  IS NO FILTER, NO BREAKAGE FROM THIS. EVER."). `/v1/assets/runs/`
 *  died with the gateway app — but the benches, the archived
 *  snapshots and the run rows that were written before it died still
 *  carry it, and a reloaded historical flow pointed every image and
 *  audio input at a route that answered nothing: "it doesn't
 *  preserve the paths for the inputs and image inputs, everything
 *  breaks on reloading a historical flow". The paths WERE preserved;
 *  they addressed a dead door. So the route ACCEPTS both spellings —
 *  one route, two names, identical confinement and identical
 *  loud 404 — and the writers below emit the live one. A stored path
 *  never breaks, and no new path is written dead.
 */
export declare const LEGACY_MEDIA_PREFIX = "/v1/assets/runs";
declare const mediaPrefixOf: typeof runMediaPrefixOf;
declare const canonicalMediaUrl: typeof canonicalRunMediaUrl;
export { mediaPrefixOf, canonicalMediaUrl };
export declare function apply(ctx: Context): void;
/** The client seam's one truth: build the same-origin media URL for
 *  one run-relative artifact name. A name that already rides a URL
 *  (http(s) or a rooted path) passes VERBATIM — the rewrite only
 *  claims bare run-relative names (the runs rows' post-kill shape). */
export declare function mediaUrl(runId: string, name: string): string;
export type { MediaListRow } from "./types.js";
import type { MediaListRow } from "./types.js";
/** THE LIST ARM — walk the runs output tree (run dirs by mtime,
 *  newest first), collect files of the asked kind, mint the route
 *  URL for each. Bounded: depth 3 (run/stage/file), cap LIST_CAP.
 *  Synchronous fs on purpose: the door answers one page; the tree
 *  is the queue's own bounded output, not an adversarial mount. */
/** Exported for the door pins (the draft's benchRow precedent): the
 *  list arm runs pure over a tree fixture. Single-root shape (the
 *  legacy law rides verbatim — listMediaAcross with one root). */
export declare function listMedia(stateRoot: string, kind: string): Promise<{
    count: number;
    items: MediaListRow[];
}>;
/** §23 CROSS-ROOTS list arm: every manifest root's runs tree, one
 *  merged answer. Run-ids union across roots (newest run mtime
 *  first; a collision resolves FIRST-ROOT-WINS — own writes win);
 *  every row names the root that served it. Cap stays LIST_CAP on
 *  the merged answer. */
export declare function listMediaAcross(roots: readonly string[], kind: string): Promise<{
    count: number;
    items: MediaListRow[];
}>;
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The kind is not one of the vocab families (+all). */
        "media/kind": {
            readonly kind: string;
        };
        /** The queue seat (the runs tree root owner) is not mounted. */
        "media/no-seat": Record<string, never>;
    }
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        mediaRemote: MediaRemoteService;
    }
}
/** The media remote: media/list over the queue seat's runs tree. */
export declare class MediaRemoteService extends TypertRemoteService {
    static inject: string[];
    constructor(ctx: Context);
    /** Endpoint `media/list` — the source row's From media arm. */
    remoteExportList(kind: string, signal: AbortSignal): Promise<{
        count: number;
        items: MediaListRow[];
    }>;
}
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
