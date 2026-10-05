import Schema from '@deepseek-ai/schemastery';
import { LEGACY_RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
import { ASSET_ROUTE_PREFIX, RUN_ROUTE_PREFIX } from '@melite/viewer-base/wire';
export const name = '@melite/viewer';
export const inject = [];
export const Config = Schema.object({
    gateway: Schema.string()
        .description('RETIRING: unused — the lanes answer in-process'),
});
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };
/** One estate lane read, JSON or bytes (testable in isolation).
 *  THE GATEWAY KILL (2026-09-10): the lanes are dead — every proxy
 *  answers 502 LOUD until the viewer rides named remotes/DHS faces. */
export async function proxyDoor(ctx, upstreamPath, json, respond) {
    void ctx;
    void json;
    respond(502, JSON_HEADERS, JSON.stringify({ error: 'estate_killed', path: upstreamPath }));
}
export function apply(ctx, config) {
    const webServer = ctx.get('webServer');
    if (webServer === undefined)
        return;
    const gateway = (config?.gateway ?? '').trim().replace(/\/+$/, '');
    ctx.effect(() => webServer.register({
        kind: 'prefix',
        path: RUN_ROUTE_PREFIX,
        handler: async (req, res) => {
            const url = new URL(req.url ?? '/', 'http://melite-viewer.invalid');
            const runId = decodeURIComponent(url.pathname.slice(RUN_ROUTE_PREFIX.length).replace(/\/+$/, ''));
            if (runId === '') {
                res.writeHead(400, JSON_HEADERS);
                res.end(JSON.stringify({ error: 'missing_run_id' }));
                return;
            }
            await proxyDoor(ctx, `/v1/flows/runs/${encodeURIComponent(runId)}`, true, (status, headers, body) => { res.writeHead(status, headers); res.end(body); });
        },
    }), '@melite/viewer: run proxy route');
    ctx.effect(() => webServer.register({
        kind: 'prefix',
        path: ASSET_ROUTE_PREFIX,
        handler: async (req, res) => {
            const url = new URL(req.url ?? '/', 'http://melite-viewer.invalid');
            const rest = url.pathname.slice(ASSET_ROUTE_PREFIX.length).replace(/\/+$/, '');
            if (rest === '') {
                res.writeHead(400, JSON_HEADERS);
                res.end(JSON.stringify({ error: 'missing_asset_path' }));
                return;
            }
            await proxyDoor(ctx, `${LEGACY_RUN_MEDIA_PREFIX}/${rest}`, false, (status, headers, body) => { res.writeHead(status, headers); res.end(body); });
        },
    }), '@melite/viewer: asset proxy route');
}
//# sourceMappingURL=index.js.map
