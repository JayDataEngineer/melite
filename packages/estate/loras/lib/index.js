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
import { Remote, RemoteError, TypertRemoteService, } from "@deepseek-ai/dsh-typert-protocol";
function stemOf(filename) {
    return filename.replace(/\.(safetensors|pt|bin)$/, "");
}
/** The loras remote: one list over the seat's mod catalog. */
let LorasRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteExportList_decorators;
    return class LorasRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportList_decorators = [Remote("list")];
            __esDecorate(this, null, _remoteExportList_decorators, { kind: "method", name: "remoteExportList", static: false, private: false, access: { has: obj => "remoteExportList" in obj, get: obj => obj.remoteExportList }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ["comfyui"];
        constructor(ctx) {
            super(ctx, "lorasRemote", { namespace: "loras" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `loras/list` — one family's pick catalog (the
         *  runtime catalog law rides the seat: family rows win over the
         *  union; a family with no lora flavor answers empty, honestly —
         *  an empty catalog is DATA, never an error). */
        async remoteExportList(model, signal) {
            signal.throwIfAborted();
            if (typeof model !== "string" || model === "") {
                throw new RemoteError("loras/invalid-request", "model must be a non-empty family id", { loc: "args.model", got: model });
            }
            const { rows, shared } = this.ctx.comfyui.modCatalog("loras", model);
            const meta = {};
            for (const row of rows) {
                const entry = {};
                if (row.label !== undefined)
                    entry.label = row.label;
                if (row.category !== undefined)
                    entry.category = row.category;
                if (row.default_strength !== undefined) {
                    entry.default_strength = row.default_strength;
                }
                meta[stemOf(row.filename)] = entry;
            }
            return {
                model,
                loras: rows.map((r) => r.filename),
                meta,
                note: shared
                    ? "shared catalog — no family rows declared (the union of every family's loras serves)"
                    : rows.length === 0
                        ? `no loras declared for ${model} (family-owned data — declare rows in packages/models/${model}/mods/loras.ts)`
                        : null,
            };
        }
    };
})();
export { LorasRemoteService };
/** The loras remote row (the estate mounts it after the seat). */
export const lorasRemotePlugin = {
    name: "estate-loras",
    inject: ["comfyui"],
    apply(ctx) {
        new LorasRemoteService(ctx);
    },
};
//# sourceMappingURL=index.js.map
