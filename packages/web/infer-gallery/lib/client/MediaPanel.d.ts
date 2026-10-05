/**
 * MediaPanel — the native media archive tab (THE FULL PORT, 2026-09-11:
 * the deleted dsh-media package's panel, ported onto the gallery's own
 * host routes — every feature the migrations lost is here again).
 *
 * One grid over the gallery's runs route DIRECTLY (GET
 * /infer-gallery/runs, same-origin — the host rewrites run-relative
 * artifact names to its same-origin artifact route and serves the
 * 500-run window, the runs-window law). Everything renders with
 * NATIVE elements: <video controls autoPlay> in a fullscreen overlay,
 * <img>, <audio controls>. No iframe, no editor SPA dependency, no
 * asset-type resolver to fall through.
 *
 * Label law (operator-specified format):
 *   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
 * Runs with an empty prompt fall back to run name/flow.
 */
import * as React from 'react';
/** THE ESTATE-ARTIFACT ADDRESS (2026-09-10 regression fix): run artifacts
 *  live outside the DSH workspace, so no document owner can read them.
 *  The native seam for addressable non-workspace content is a resource
 *  address claimed by a tab type — THIS package's estate-artifact tab
 *  claims `dsh-resource://estate-artifact/<b64url of the same-origin
 *  artifact URL>` and renders the mesh (its body is mesh-view's
 *  ArtifactTabBody). The URL this panel embeds is its SAME-ORIGIN route
 *  path (fetchable from the body; no foreign origin ever leaks). The
 *  address FORMAT's one home is artifact-address.ts (both seats ride
 *  this package). When the shell tab service is absent the guard below
 *  voices it and the download link stays — the artifact must remain
 *  reachable either way. */
/** The standard tab hook the seat injects into every body (local spelling
 *  of UseSidebarRightTabInfo — the actions a tab may take on itself). */
interface TabInfo {
    readonly tab: {
        readonly navigation: {
            readonly address: string;
        };
        readonly actions: {
            openResource(address: string): void;
        };
    };
}
import type { RunArtifact, RunRow } from './decode.js';
import { MEDIA_KINDS } from './media-kinds.js';
/** Media kinds — DERIVED from the client plane's typed SSOT
 *  (media-kinds.ts), never restated. Adding a kind = one entry; every
 *  classifier, chip, badge and glyph below reads this map (the Sep-6
 *  3D outage was three hand-kept copies). Parity with the estate's
 *  own vocabulary is pinned by the media-sidebar wall. */
type Kind = keyof typeof MEDIA_KINDS.kinds;
interface MediaItem {
    id: string;
    kind: Kind;
    url: string;
    poster: string;
    head: string;
    final: boolean;
    runId: string;
    draftId: string;
    time: string;
    file: string;
    created: number;
}
/** Classifier — kind ORDER comes from the SSOT's key order; the
 *  type field beats the URL, mime prefixes are the last resort. */
export declare function kindOf(a: RunArtifact): Kind | null;
/** params is UNTRUSTED wire data — only a structurally-validated
 * calls[0].text feeds tile labels (audit F8: the old raw cast trusted
 * any object shape). */
export declare function callsTextOf(params: unknown): string;
/** Flatten the runs feed into media tiles (poster map, frame-flood
 *  guard, dedup by url, label law, final-film-first sort tie-break). */
export declare function flatten(runs: RunRow[]): MediaItem[];
/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
export declare function MediaTabIcon({ size }: {
    size?: number;
}): React.JSX.Element;
export declare function MediaPanel({ useTabInfo, sessionId }: {
    useTabInfo?: () => TabInfo;
    sessionId?: string;
}): React.JSX.Element;
export {};
//# sourceMappingURL=MediaPanel.d.ts.map
