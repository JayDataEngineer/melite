/** Prefix of the run-status proxy route (rest = run id). */
export declare const RUN_ROUTE_PREFIX = "/melite-viewer/run/";
/** Prefix of the artifact proxy route (rest = run id / rel path). */
export declare const ASSET_ROUTE_PREFIX = "/melite-viewer/asset/";
/** Same-origin run-status URL (the row's polling target). */
export declare function runProxyUrl(runId: string): string;
/** Same-origin artifact URL (rel path from the status body). */
export declare function assetProxyUrl(runId: string, rel: string): string;
//# sourceMappingURL=wire.d.ts.map
