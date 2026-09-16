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
import { Remote, TypertRemoteService, } from "@deepseek-ai/dsh-typert-protocol";
/** The runs remote: start/status/stop over the registry seat. */
let RunsRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteExportStart_decorators;
    let _remoteExportStatus_decorators;
    let _remoteExportStop_decorators;
    let _remoteExportList_decorators;
    let _remoteExportValidate_decorators;
    return class RunsRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportStart_decorators = [Remote("start")];
            _remoteExportStatus_decorators = [Remote("status")];
            _remoteExportStop_decorators = [Remote("stop")];
            _remoteExportList_decorators = [Remote("list")];
            _remoteExportValidate_decorators = [Remote("validate")];
            __esDecorate(this, null, _remoteExportStart_decorators, { kind: "method", name: "remoteExportStart", static: false, private: false, access: { has: obj => "remoteExportStart" in obj, get: obj => obj.remoteExportStart }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportStatus_decorators, { kind: "method", name: "remoteExportStatus", static: false, private: false, access: { has: obj => "remoteExportStatus" in obj, get: obj => obj.remoteExportStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportStop_decorators, { kind: "method", name: "remoteExportStop", static: false, private: false, access: { has: obj => "remoteExportStop" in obj, get: obj => obj.remoteExportStop }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportList_decorators, { kind: "method", name: "remoteExportList", static: false, private: false, access: { has: obj => "remoteExportList" in obj, get: obj => obj.remoteExportList }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportValidate_decorators, { kind: "method", name: "remoteExportValidate", static: false, private: false, access: { has: obj => "remoteExportValidate" in obj, get: obj => obj.remoteExportValidate }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ["runs"];
        constructor(ctx) {
            super(ctx, "runsRemote", { namespace: "runs" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `runs/start` — the submit chain (registry seat). */
        async remoteExportStart(doc, signal) {
            return await this.ctx.runs.start(doc, signal);
        }
        /** Endpoint `runs/status` — the live row (registry seat). */
        async remoteExportStatus(runId, signal) {
            return (await this.ctx.runs.status(runId, signal));
        }
        /** Endpoint `runs/stop` — the flag + interrupt (registry seat). */
        async remoteExportStop(runId, signal) {
            return (await this.ctx.runs.stop(runId, signal));
        }
        /** Endpoint `runs/list` — the restore-port envelope (registry
         *  seat; the raw limit string keeps py int() semantics). */
        async remoteExportList(rawLimit, signal) {
            return (await this.ctx.runs.list(rawLimit, signal));
        }
        /** Endpoint `runs/validate` — the pure compile (registry seat). */
        async remoteExportValidate(doc, signal) {
            return (await this.ctx.runs.validate(doc, signal));
        }
    };
})();
export { RunsRemoteService };
/** The runs remote row (the estate mounts it after the registry). */
export const runsRemotePlugin = {
    name: "estate-runs",
    inject: ["runs"],
    apply(ctx) {
        new RunsRemoteService(ctx);
    },
};
//# sourceMappingURL=index.js.map
