import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
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
export declare const MEDIA_PREFIX = "/melite-media/runs";
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
 *  list arm runs pure over a tree fixture. */
export declare function listMedia(stateRoot: string, kind: string): Promise<{
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
