var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
// THE WIRE ADOPTION — P1 pilot (docs/CONFORMANCE_LEDGER.md § "THE
// WIRE ADOPTION", operator decision 2026-09-10).
//
// This package owns the estate's Typert Remote services: business
// methods exposed to DSH clients over the Connection transport
// (POST /api/<namespace>/<method>, one trust fence at the route,
// cooperative cancellation by trailing AbortSignal — the shapes the
// api-gateway.md reference describes). Composition rows live in the
// shell leaf (packages/gateway/shell/cordis.yml): typert registry →
// typert gateway → connection → this plugin.
//
// WHY THIS PACKAGE IS COMPILED (tsconfig.json → lib/): @Remote is a
// stage-3 method decorator; node --experimental-strip-types cannot
// parse decorator syntax, and the marker table it feeds is
// deliberately module-private (no sanctioned imperative form). DSH's
// own typert faces are build products, so the wire package builds
// with tsc and the manifest imports lib/. The rest of the gateway
// stays source-run — this is the one face where the DSH shape
// REQUIRES a build artifact.
//
// SERVICE KEY vs NAMESPACE: the registry service key `runs` is taken
// (RunsService — ctx.runs, flowsRun.ts). TypertRemoteService binds
// serviceKey AND default namespace to one name; the options form
// keeps the wire namespace canonical (`runs/status` endpoint) while
// the Cordis seat is `runsRemote` (ctx.runsRemote). Documented here
// because the split is invisible at the call site.
//
// PILOT SCOPE (Law 2 small stroke): exactly one READ-ONLY method —
// runs status lookup. No mutation, no streaming, no lookups (the
// method takes a plain string, so no TypertLookupMap/session
// controller is composed). Widening the surface is a later stroke
// with its own ledger row; the /v1 Fetch doors stay untouched.
import {} from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { BenchRemoteService, DraftsRemoteService } from "./remotes-kv.js";
import * as remotesKv from "./remotes-kv.js";
/** Guard: the registry face this method depends on (Map seat with
 * status-carrying rows). Guards the READ shape, not the full record. */
function isRunsRegistry(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const runs = Reflect.get(value, "runs");
    if (!(runs instanceof Map))
        return false;
    for (const row of runs.values()) {
        if (typeof row !== "object" || row === null)
            return false;
        if (typeof Reflect.get(row, "status") !== "string")
            return false;
    }
    return true;
}
/** Typert Remote face over the runs registry (SRC descriptors: the
 * Gateway's source-mode discovery walks ctx.reflect.props for the
 * typertRemote binding — no generated artifacts needed host-side). */
let RunsRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _statusForClient_decorators;
    let _list_decorators;
    return class RunsRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _statusForClient_decorators = [Remote("status")];
            _list_decorators = [Remote("list")];
            __esDecorate(this, null, _statusForClient_decorators, { kind: "method", name: "statusForClient", static: false, private: false, access: { has: obj => "statusForClient" in obj, get: obj => obj.statusForClient }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "runsRemote", { namespace: "runs" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `runs/status` — read-only registry probe. Per-call
         * resolution through ctx.get (the rule-4 shape: restart-robust,
         * LOUD on miswire — a registry that is absent or shape-shifted
         * serves `known: false`, never a fabricated status). */
        statusForClient(run_id, signal) {
            signal.throwIfAborted();
            const svc = this.ctx.get("runs");
            const run = isRunsRegistry(svc) ? svc.runs.get(run_id) : undefined;
            return {
                run_id,
                known: run !== undefined,
                status: run?.status ?? null,
            };
        }
        /** runs/list — the archive listing (R2: the media panel's runs
         *  lane rides this remote; the /v1 door stays until R5 deletes
         *  it). Late-bound domain calls, same late-bind law as the KV
         *  remotes in remotes-kv.ts. */
        async list(limit, signal) {
            signal.throwIfAborted();
            const runs = await remotesKv.loadRuns();
            const shell = await remotesKv.loadShell();
            const out = await runs.hRunsList({ limit: [String(limit)] }, shell.defaultAssetRoots(), () => false);
            if (out.status >= 200 && out.status < 300)
                return out.body;
            throw new Error(JSON.stringify(out.body));
        }
    };
})();
export { RunsRemoteService };
/** Provider plugin (manifest row `gateway-wire`): owns the Remote
 * service lifetime (the runsRegistry provider shape — the Service
 * constructor self-registers on the plugin's fiber; disposal
 * cascades). The typertGateway claims the endpoint through the SRC
 * walk the moment the service is live. */
export const gatewayWire = {
    name: "gateway-wire",
    apply(ctx) {
        new RunsRemoteService(ctx);
        new DraftsRemoteService(ctx);
        new BenchRemoteService(ctx);
    },
};
export default gatewayWire;
//# sourceMappingURL=index.js.map
