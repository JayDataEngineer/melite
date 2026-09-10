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
// drafts + bench remotes — R1 of the remotes migration
// (docs/plans/estate-collapse-2026-09-10.md §THE MAP).
//
// The KV faces stop being HTTP doors: the SAME exported domain
// handlers the doors call (gateway-doors hDraftsList/hDraftsGet/
// hBenchGet/hBenchEnsure — unchanged, 1:1) now serve as Typert
// Remote methods on Connection's /api transport. The browser calls
// ctx.remote.drafts.* / ctx.remote.bench.* (dsh-api-gateway/client);
// host-side callers use the ctx seats in-process. Argument/result
// validation, cancellation, and error envelopes are the Gateway's
// (dsh-api-gateway README: dispatch, validation, cancellation,
// reconnection — owned by DSH, never re-implemented here).
//
// COMPILE DISCIPLINE (the pilot's law): this package EMITS lib/
// (decorators are not strippable), so it must not statically import
// the source-run doors/core tree — a static import would drag every
// .ts-suffixed module into tsc. The doors' functions arrive through a
// LATE dynamic import behind a narrow structural interface (the
// RunsRegistryRead discipline: state the fields read, never a cast).
import {} from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** Loaded once per process (the plugin's own lifetime). */
let doorsP;
let coreP;
// The specifiers are NON-LITERAL on purpose: a literal dynamic
// import still enters the tsc program (and drags the .ts-suffixed
// source graph behind it). A variable specifier is late-bound for
// the compiler and resolves normally for node at runtime.
const DOORS_SPEC = "@melite/gateway-doors";
const CORE_SPEC = "@melite/gateway-core";
function loadDoors() {
    doorsP ??= import(DOORS_SPEC);
    return doorsP;
}
let runsP;
let shellP;
const RUNS_SPEC = "@melite/gateway-doors";
const SHELL_SPEC = "@melite/gateway-shell";
export function loadRuns() {
    runsP ??= import(RUNS_SPEC);
    return runsP;
}
export function loadShell() {
    shellP ??= import(SHELL_SPEC);
    return shellP;
}
function loadCore() {
    coreP ??= import(CORE_SPEC);
    return coreP;
}
/** Unwrap a door envelope into a remote result: 2xx body passes, any
 * refusal throws with the door's own error text (the body verbatim —
 * the same law gatewayRequest carried over HTTP). */
function unwrap(status, body) {
    if (status >= 200 && status < 300)
        return body;
    const err = typeof body === "object" && body !== null && "error" in body
        ? String(body.error)
        : JSON.stringify(body);
    throw new Error(err);
}
/** The drafts KV face (R1: list + get — the panel reads; the save
 * verb widens the surface when its consumer migrates). */
let DraftsRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _get_decorators;
    return class DraftsRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote("list")];
            _get_decorators = [Remote("get")];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "draftsRemote", { namespace: "drafts" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** drafts/list — the recency-DESC index (cap 600, count pre-cap). */
        async list(signal) {
            signal.throwIfAborted();
            const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
            const domain = await core.getDraftsDomain(this.ctx);
            const out = doors.hDraftsList(domain);
            return unwrap(out.status, out.body);
        }
        /** drafts/get — one draft doc by id. */
        async get(draft_id, signal) {
            signal.throwIfAborted();
            const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
            const domain = await core.getDraftsDomain(this.ctx);
            const out = doors.hDraftsGet(domain, draft_id);
            return unwrap(out.status, out.body);
        }
    };
})();
export { DraftsRemoteService };
/** The bench KV face (R1: get + ensure — the bench-load gesture's
 * exact two verbs). */
let BenchRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _get_decorators;
    let _ensure_decorators;
    return class BenchRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _get_decorators = [Remote("get")];
            _ensure_decorators = [Remote("ensure")];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _ensure_decorators, { kind: "method", name: "ensure", static: false, private: false, access: { has: obj => "ensure" in obj, get: obj => obj.ensure }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "benchRemote", { namespace: "bench" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** bench/get — one session's bench block as the served row. */
        async get(session, signal) {
            signal.throwIfAborted();
            const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
            const domain = await core.getDraftsDomain(this.ctx);
            const out = doors.hBenchGet(domain, session);
            return unwrap(out.status, out.body);
        }
        /** bench/ensure — create-if-absent / stage-replace-if-present. The
         * handler's body contract is unchanged (JSON bytes), so the decoded
         * remote argument is re-encoded once — the domain law stays 1:1. */
        async ensure(doc, signal) {
            signal.throwIfAborted();
            const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
            const domain = await core.getDraftsDomain(this.ctx);
            const raw = new TextEncoder().encode(JSON.stringify({ doc }));
            const out = await doors.hBenchEnsure(domain, raw);
            return unwrap(out.status, out.body);
        }
    };
})();
export { BenchRemoteService };
//# sourceMappingURL=remotes-kv.js.map
