/**
 * `@melite-plugin/dsh-gallery` — host half.
 *
 * Registers same-origin routes on the `webServer` service.
 *
 * THE GATEWAY KILL (2026-09-10, REBUILD-18): the gateway app is
 * dead. Two postures, resolved per request (no apply-time probe —
 * boot races proven 2026-09-10; per-request seat reads are safe):
 *
 * - cross-host: `gatewayUrl` pinned names the OWNING DSH — every
 *   route fetches it verbatim (the named-remote posture until
 *   Typert remotes land).
 * - in-tree: no `gatewayUrl` — the estate's own seats answer
 *   in-process (`runs`, `draftsRemote` via optional per-request
 *   probes; artifacts stream from the runs output tree itself —
 *   the same sidecar tree /infer-gallery/flow reads). An absent
 *   seat answers LOUD 502 naming the fix; nothing absorbs.
 *
 * - `GET /infer-gallery/runs` → the runs list (the 500-run window,
 *   the runs-window law), with run-relative artifact/thumbnail
 *   names rewritten to the artifact route below, so the browser
 *   stays same-origin.
 * - `GET /infer-gallery/drafts` → the drafts list (queue-native
 *   flow instances), newest-first, capped.
 * - `GET /infer-gallery/flow?run_id=…` → the run's _flow.json
 *   sidecar (disk read — no seat at all).
 * - `GET /infer-gallery/artifact?path=…` → streams one run
 *   artifact. Only run-relative names (`run-<id>/<file>`) are
 *   accepted (the run-artifact tree, confined).
 * - `POST /infer-gallery/artifact-delete {path}` → unlinks one
 *   run-relative artifact file (the modal's delete button — same
 *   confinement + the sidecar guard: `_`-prefixed names refuse).
 * - `POST /infer-gallery/artifact-rename {path, name}` → renames
 *   one artifact inside its own directory (the modal's rename
 *   button — `name` is a bare segment, never a path; existing
 *   targets refuse 409).
 *
 * Failure policy: route handlers own their full response
 * lifecycle; the routes never throw.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "infer-gallery";
/** Routes arrive with the webServer service. */
export declare const inject: string[];
export interface Config {
    /** Base URL of the OWNING DSH (no trailing slash needed) — the
     *  cross-host posture. Empty (or unset) means in-tree: the
     *  estate's seats answer in-process. */
    gatewayUrl?: string;
    /** Upstream fetch timeout in milliseconds (cross-host only). */
    timeoutMs?: number;
    /** Directory holding run-<id>/_flow.json sidecars (the runs output
     *  tree). Defaults to the estate's SERVER-STATE ROOT LAW tree. */
    flowDir?: string;
}
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map