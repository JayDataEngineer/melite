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
import { openDraftsDomain } from "./store.js";
import { DRAFT_ID_RE } from "./spec.js";
import { addStageBench, ensureBench, getBench, patchBench, removeStageBench, rewireBench, undoBench, } from "./bench.js";
/** First-seen display strings walk the doc depth-first (the index
 *  law: model/service cap 80, name/intent/title cap 160). */
function docIndexFields(doc) {
    const first = {};
    const walk = (v) => {
        if (typeof v === "string")
            return;
        if (Array.isArray(v)) {
            for (const e of v)
                walk(e);
            return;
        }
        if (typeof v !== "object" || v === null)
            return;
        for (const [k, e] of Object.entries(v)) {
            if (first[k] === undefined &&
                (k === "model" ||
                    k === "name" ||
                    k === "intent" ||
                    k === "title" ||
                    k === "service") &&
                typeof e === "string") {
                first[k] = e;
            }
            walk(e);
        }
    };
    walk(doc);
    const cap = (s, n) => s === undefined ? "" : s.length + 1 < n ? s : s.slice(0, n - 1);
    let model = cap(first["model"], 80);
    let disp = cap(first["name"], 160);
    if (disp === "")
        disp = cap(first["intent"], 160);
    if (disp === "")
        disp = cap(first["title"], 160);
    if (model === "")
        model = cap(first["service"], 80);
    return { model, name: disp };
}
/** The drafts Remote owner: list/get over the storage domain. */
let DraftsRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteExportList_decorators;
    let _remoteExportGet_decorators;
    return class DraftsRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportList_decorators = [Remote("list")];
            _remoteExportGet_decorators = [Remote("get")];
            __esDecorate(this, null, _remoteExportList_decorators, { kind: "method", name: "remoteExportList", static: false, private: false, access: { has: obj => "remoteExportList" in obj, get: obj => obj.remoteExportList }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportGet_decorators, { kind: "method", name: "remoteExportGet", static: false, private: false, access: { has: obj => "remoteExportGet" in obj, get: obj => obj.remoteExportGet }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "draftsRemote", { namespace: "drafts" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `drafts/list` — the domain index, recency DESC. */
        async remoteExportList(signal) {
            return await this.list(signal);
        }
        /** Endpoint `drafts/get` — one doc by id. */
        async remoteExportGet(draftId, signal) {
            return await this.get(draftId, signal);
        }
        /** The in-process API the adapters above delegate to. */
        async list(signal) {
            signal.throwIfAborted();
            let drafts;
            try {
                drafts = await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("draft/store-failed", error instanceof Error ? error.message : String(error), {}, { cause: error });
            }
            const ents = [];
            for (const [did, rec] of drafts.table("docs").entries()) {
                ents.push({ mt: rec.updated_at, row: { draft_id: did, ...docIndexFields(rec.doc) } });
            }
            ents.sort((a, b) => b.mt - a.mt);
            return {
                count: ents.length,
                drafts: ents.slice(0, 600).map((e) => e.row),
            };
        }
        /** The in-process API the adapter above delegates to. */
        async get(draftId, signal) {
            signal.throwIfAborted();
            if (!DRAFT_ID_RE.test(draftId)) {
                throw new RemoteError("draft/bad-id", `bad draft id ${JSON.stringify(draftId)}`, {
                    draftId,
                });
            }
            let drafts;
            try {
                drafts = await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("draft/store-failed", error instanceof Error ? error.message : String(error), {}, { cause: error });
            }
            const rec = drafts.table("docs").get(draftId);
            if (rec === undefined) {
                throw new RemoteError("draft/not-found", `draft not found: ${draftId}`, {
                    draftId,
                });
            }
            return rec.doc;
        }
    };
})();
export { DraftsRemoteService };
/** The bench Remote owner: ensure/get over the same drafts domain
 *  (the bench doc IS a draft doc, id "bench-<session>"). */
let BenchRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteExportGet_decorators;
    let _remoteExportEnsure_decorators;
    let _remoteExportPatch_decorators;
    let _remoteExportAddStage_decorators;
    let _remoteExportRemoveStage_decorators;
    let _remoteExportRewire_decorators;
    let _remoteExportUndo_decorators;
    return class BenchRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportGet_decorators = [Remote("get")];
            _remoteExportEnsure_decorators = [Remote("ensure")];
            _remoteExportPatch_decorators = [Remote("patch")];
            _remoteExportAddStage_decorators = [Remote("add-stage")];
            _remoteExportRemoveStage_decorators = [Remote("remove-stage")];
            _remoteExportRewire_decorators = [Remote("rewire")];
            _remoteExportUndo_decorators = [Remote("undo")];
            __esDecorate(this, null, _remoteExportGet_decorators, { kind: "method", name: "remoteExportGet", static: false, private: false, access: { has: obj => "remoteExportGet" in obj, get: obj => obj.remoteExportGet }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportEnsure_decorators, { kind: "method", name: "remoteExportEnsure", static: false, private: false, access: { has: obj => "remoteExportEnsure" in obj, get: obj => obj.remoteExportEnsure }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportPatch_decorators, { kind: "method", name: "remoteExportPatch", static: false, private: false, access: { has: obj => "remoteExportPatch" in obj, get: obj => obj.remoteExportPatch }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportAddStage_decorators, { kind: "method", name: "remoteExportAddStage", static: false, private: false, access: { has: obj => "remoteExportAddStage" in obj, get: obj => obj.remoteExportAddStage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportRemoveStage_decorators, { kind: "method", name: "remoteExportRemoveStage", static: false, private: false, access: { has: obj => "remoteExportRemoveStage" in obj, get: obj => obj.remoteExportRemoveStage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportRewire_decorators, { kind: "method", name: "remoteExportRewire", static: false, private: false, access: { has: obj => "remoteExportRewire" in obj, get: obj => obj.remoteExportRewire }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportUndo_decorators, { kind: "method", name: "remoteExportUndo", static: false, private: false, access: { has: obj => "remoteExportUndo" in obj, get: obj => obj.remoteExportUndo }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "benchRemote", { namespace: "bench" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `bench/get` — one session's bench block as the row. */
        async remoteExportGet(session, signal) {
            return await this.get(session, signal);
        }
        /** Endpoint `bench/ensure` — birth or load (the only creating arm). */
        async remoteExportEnsure(doc, signal) {
            return await this.ensure(doc, signal);
        }
        /** The in-process API the adapters above delegate to. Classified
         *  bench failures pass through untouched; only the open itself
         *  wraps as bench/store-failed. */
        async get(session, signal) {
            signal.throwIfAborted();
            let drafts;
            try {
                drafts = await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("bench/store-failed", error instanceof Error ? error.message : String(error), {}, { cause: error });
            }
            return getBench(drafts, session);
        }
        /** The in-process API the adapter above delegates to. */
        async ensure(doc, signal) {
            signal.throwIfAborted();
            if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
                throw new RemoteError("bench/bad-body", "body must be a JSON object", {});
            }
            let drafts;
            try {
                drafts = await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("bench/store-failed", error instanceof Error ? error.message : String(error), {}, { cause: error });
            }
            return await ensureBench(drafts, doc);
        }
        /** Endpoint `bench/patch` — params merge (+result/runStatus) with
         *  CAS + log. */
        async remoteExportPatch(session, doc, signal) {
            return await this.patch(session, doc, signal);
        }
        /** Endpoint `bench/add-stage` — append a card stage. */
        async remoteExportAddStage(session, doc, signal) {
            return await this.addStage(session, doc, signal);
        }
        /** Endpoint `bench/remove-stage` — splice one stage out. */
        async remoteExportRemoveStage(session, doc, signal) {
            return await this.removeStage(session, doc, signal);
        }
        /** Endpoint `bench/rewire` — set or clear one input binding. */
        async remoteExportRewire(session, doc, signal) {
            return await this.rewire(session, doc, signal);
        }
        /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
        async remoteExportUndo(session, doc, signal) {
            return await this.undo(session, doc, signal);
        }
        /** The in-process APIs the adapters above delegate to. The
         *  domain's classified failures pass through untouched; only the
         *  open itself wraps as bench/store-failed. */
        async open(signal) {
            signal.throwIfAborted();
            try {
                return await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("bench/store-failed", error instanceof Error ? error.message : String(error), {}, { cause: error });
            }
        }
        async patch(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            return await patchBench(drafts, session, doc);
        }
        async addStage(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            return await addStageBench(drafts, session, doc);
        }
        async removeStage(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            return await removeStageBench(drafts, session, doc);
        }
        async rewire(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            return await rewireBench(drafts, session, doc);
        }
        async undo(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            return await undoBench(drafts, session, doc);
        }
    };
})();
export { BenchRemoteService };
//# sourceMappingURL=remote.js.map
