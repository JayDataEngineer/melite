export const name = 'melite-card-deck';
export const inject = ['webServer', 'connection'];
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
export function apply(ctx) {
    // ── THE LLM SEAM (the assistant IS DSH) ──────────────────────────────
    // The editor's own LLM lane (ray gateway keystore: OpenRouter keys,
    // providers, health) is DEAD SURFACE in the DSH origin — the agent
    // and its LLM live in DSH (settings → Models). This prefix route
    // stubs the lane at the wire: the studio never fetches the editor
    // keystore (and never receives its API key).
    const LLM_STUBS = {
        '/v1/llm/keys': [200, { keys: [] }],
        '/v1/llm/keys/active': [404, { error: 'no_active_key', message: 'The assistant lives in DSH; the editor LLM lane is disabled in the embed.' }],
        '/v1/llm/health': [200, { connected: false, reason: 'dsh_owns_the_assistant', model: null, name: null }],
        '/v1/llm/providers': [200, { providers: [] }],
    };
    ctx.effect(() => ctx.webServer.register({
        kind: 'prefix',
        path: '/v1/llm',
        handler: async (req, res) => {
            const path = (req.url ?? '/').split('?')[0];
            const [status, body] = LLM_STUBS[path] ?? [404, { error: 'llm_lane_disabled', message: 'The assistant lives in DSH.' }];
            res.writeHead(status, JSON_HEADERS);
            res.end(JSON.stringify(body));
        },
    }), 'melite-card-deck: /v1/llm stub (DSH owns the LLM)');
}
//# sourceMappingURL=index.js.map
