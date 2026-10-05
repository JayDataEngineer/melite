// wire.ts — the viewer's run-scoped wire facts, spelled ONCE.
//
// The routes are RUN-scoped, not card-scoped: a run id is global on
// the gateway (any card's run polls the same doors), so ONE pair of
// same-origin proxy routes serves every run card's view. The host
// half of @melite/viewer serves them; this leaf builds URLs for the
// client half (the media-plugin law: same-origin, all gateway
// knowledge host-side in Config).
/** Prefix of the run-status proxy route (rest = run id). */
export const RUN_ROUTE_PREFIX = '/melite-viewer/run/';
/** Prefix of the artifact proxy route (rest = run id / rel path). */
export const ASSET_ROUTE_PREFIX = '/melite-viewer/asset/';
/** Same-origin run-status URL (the row's polling target). */
export function runProxyUrl(runId) {
    return RUN_ROUTE_PREFIX + encodeURIComponent(runId);
}
/** Same-origin artifact URL (rel path from the status body). */
export function assetProxyUrl(runId, rel) {
    return ASSET_ROUTE_PREFIX + encodeURIComponent(runId) + '/' +
        rel.split('/').map(encodeURIComponent).join('/');
}
//# sourceMappingURL=wire.js.map
