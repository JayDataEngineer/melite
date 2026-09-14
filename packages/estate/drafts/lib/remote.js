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
import { benchBlockOf } from "./bench.js";
import { openDraftsDomain } from "./store.js";
import { DRAFT_ID_RE } from "./spec.js";
import { addStageBench, ensureBench, notifyBenchChange, notifyBenchDocWrite, onBenchChange, getBench, groupBench, patchBench, removeStageBench, reorderBench, rewireBench, undoBench, ungroupBench, } from "./bench.js";
/** The stage-patch door's fixed key set (the old door's
 *  STAGE_PATCH_KEYS, order verbatim — the unknown-keys voice lists
 *  them in this order). */
export const STAGE_PATCH_KEYS = ["params", "result", "runStatus", "inputs", "inputOutputs"];
/** The wrap voice for a thrown store error: Error.message when the
 *  value carries one, else the string form. Every store/domain throw
 *  site constructs `new Error` (or an Error subclass), so the else
 *  arm only guards degenerate non-Error throws. */
function thrownMessage(error) {
    /* v8 ignore next -- a non-Error throw requires a degenerate throw
     * site; openDraftsDomain and the domain layer construct Errors. */
    return error instanceof Error ? error.message : String(error);
}
function resolverOf(ctx) {
    let seat;
    try {
        seat = ctx.get("cardRegistry", false);
    }
    catch {
        return null;
    }
    if (seat === null || seat === undefined || typeof seat !== "object")
        return null;
    const fn = seat.resolveStageParams;
    if (typeof fn !== "function")
        return null;
    return seat;
}
/** THE WRITE-TIME MODEL ADMISSION (the no-silent-drop law's door):
 *  the registry refuses a model the card does not offer — or a
 *  boarded model the machine has not downloaded — the moment it
 *  would land on the bench (add/patch/load), with the offered list
 *  in the error. Registry-less lanes admit everything (the local
 *  derive; never a silent throw on the serve path). */
function admissionOf(ctx) {
    const reg = resolverOf(ctx);
    if (reg === null || reg.admitStageModel === undefined)
        return undefined;
    return (card, params) => {
        const verdict = reg.admitStageModel(card, params["model"]);
        if (!verdict.ok) {
            throw new RemoteError("bench/bad-model", verdict.error, { card, offered: verdict.offered });
        }
    };
}
/** Attach the served `resolved` map per stage (prepareCardParams'
 *  own stamped + lifted body — the exact input the next run
 *  composes). Copies rows, never mutates the domain's cached doc:
 *  the stored record keeps params/result/runStatus only, the serve
 *  derives `resolved` fresh on every read. A stage whose params name
 *  no resolvable unit rides un-resolved (no key at all — the client
 *  treats absence as the local-derive fallback). */
function withResolvedStages(ctx, stages) {
    if (!Array.isArray(stages))
        return stages;
    const reg = resolverOf(ctx);
    if (reg === null)
        return stages;
    return stages.map((s) => {
        if (typeof s !== "object" || s === null || Array.isArray(s))
            return s;
        const row = s;
        const params = row["params"];
        if (params === null || typeof params !== "object" || Array.isArray(params))
            return row;
        const resolved = reg.resolveStageParams(params);
        if (resolved === null)
            return row;
        return { ...row, resolved };
    });
}
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
    let _remoteExportPatch_decorators;
    return class DraftsRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportList_decorators = [Remote("list")];
            _remoteExportGet_decorators = [Remote("get")];
            _remoteExportPatch_decorators = [Remote("patch")];
            __esDecorate(this, null, _remoteExportList_decorators, { kind: "method", name: "remoteExportList", static: false, private: false, access: { has: obj => "remoteExportList" in obj, get: obj => obj.remoteExportList }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportGet_decorators, { kind: "method", name: "remoteExportGet", static: false, private: false, access: { has: obj => "remoteExportGet" in obj, get: obj => obj.remoteExportGet }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportPatch_decorators, { kind: "method", name: "remoteExportPatch", static: false, private: false, access: { has: obj => "remoteExportPatch" in obj, get: obj => obj.remoteExportPatch }, metadata: _metadata }, null, _instanceExtraInitializers);
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
                throw new RemoteError("draft/store-failed", thrownMessage(error), {}, { cause: error });
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
                throw new RemoteError("draft/store-failed", thrownMessage(error), {}, { cause: error });
            }
            const rec = drafts.table("docs").get(draftId);
            if (rec === undefined) {
                throw new RemoteError("draft/not-found", `draft not found: ${draftId}`, {
                    draftId,
                });
            }
            const doc = rec.doc;
            return { ...doc, stages: withResolvedStages(this.ctx, doc["stages"]) };
        }
        /** Endpoint `drafts/patch` — the stage patch door, REBORN on the
         *  domain (2026-09-11; the gateway-era PATCH /v1/flows/drafts/:id/
         *  stages/:sid died with the app and stroke L left the client door
         *  a throwing stub). Semantics VERBATIM from the old door
         *  (hDraftStagePatch, packages/gateway/doors drafts.ts, probed
         *  editor_runs.py 818-1204): admission on the fixed key set
         *  (params | result | runStatus | inputs | inputOutputs — unknown
         *  keys refuse with the door's voice), params merge PER-KEY into
         *  the stage's existing params (never replace), the domain write
         *  bumps the recency column, and the answer is the delivered
         *  envelope. THE SHARED STATE DOOR: the agent (bench verbs) and
         *  the user (the card drilldowns) author the SAME domain records
         *  through it — one truth, two authors.
         *
         *  THE LAYERED-PARAMS LAW (2026-09-14, the parameter audit): the
         *  params map is the stage's USER layer — a key's PRESENCE is the
         *  override mark (never its value). Two additions make the door
         *  speak it: (1) JSON Merge Patch semantics for params — a null
         *  value DELETES the key (the reset/unset path; RFC 7386's
         *  convention, the wire form of the settings system's unset path
         *  op); (2) the door JOINS the bench CAS law — every write bumps
         *  bench.rev and appends a kind:'patch' log entry, and expectRev
         *  (nullable) fences the write: a bench that moved refuses loud
         *  with bench/cas-conflict carrying current_rev, never merges
         *  under the earlier author. */
        async remoteExportPatch(draftId, stageId, patch, expectRev, signal) {
            return await this.patch(draftId, stageId, patch, expectRev, signal);
        }
        /** The patch arm the adapter above delegates to. */
        async patch(draftId, stageId, patch, expectRev, signal) {
            signal.throwIfAborted();
            if (!DRAFT_ID_RE.test(draftId)) {
                throw new RemoteError("draft/bad-id", `bad draft id ${JSON.stringify(draftId)}`, {
                    draftId,
                });
            }
            if (typeof stageId !== "string" || stageId === "") {
                throw new RemoteError("draft/bad-stage-id", `bad stage id ${JSON.stringify(stageId)}`, {
                    stageId,
                });
            }
            if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
                throw new RemoteError("draft/bad-patch", "patch must be a plain object", {});
            }
            // Admission: the door's fixed key set, unknown keys refused with
            // the old voice (STAGE_PATCH_KEYS order).
            const unknown = Object.keys(patch).filter((k) => !STAGE_PATCH_KEYS.includes(k));
            if (unknown.length > 0) {
                throw new RemoteError("draft/patch-unknown-keys", `unknown stage patch key(s): ${unknown.join(", ")} (want ${STAGE_PATCH_KEYS.join(", ")})`, { unknown });
            }
            let drafts;
            try {
                drafts = await openDraftsDomain(this.ctx);
            }
            catch (error) {
                throw new RemoteError("draft/store-failed", thrownMessage(error), {}, { cause: error });
            }
            const rec = drafts.table("docs").get(draftId);
            if (rec === undefined) {
                // The old door's delivered:false envelope — a missing doc is a
                // DOMAIN outcome, not an error.
                return { draftId, stageId, delivered: false, reason: "draft not found" };
            }
            const doc = rec.doc;
            // The domain schema guarantees stages is an array (schema-failing
            // records are backed up and skipped at read) — no re-defense here.
            const stages = doc["stages"];
            const stage = stages.find((s) => typeof s === "object" && s !== null && s["id"] === stageId) ?? null;
            if (stage === null) {
                return { draftId, stageId, delivered: false, reason: "stage not found" };
            }
            // THE CAS WALK (the layered-params law): the patch door is a
            // bench author and joins the revision law every other author
            // walks — fence on expectRev BEFORE any mutation (the record is
            // the domain's cached object; a refusal must leave no trace),
            // then bump and log below. A bench that moved under the caller
            // refuses loud, never merges under it.
            const bench = benchBlockOf(doc);
            if (expectRev !== null && bench.rev !== expectRev) {
                throw new RemoteError("bench/cas-conflict", `bench moved under the patch (expect_rev ${expectRev}, current ${bench.rev}) — re-read and re-apply`, { current_rev: bench.rev, expect_rev: expectRev });
            }
            if ("result" in patch)
                stage["result"] = patch["result"];
            if ("runStatus" in patch)
                stage["runStatus"] = patch["runStatus"];
            if ("params" in patch && patch["params"] !== null && typeof patch["params"] === "object" && !Array.isArray(patch["params"])) {
                // PER-KEY merge (never replace) — the old door's law, now with
                // JSON Merge Patch null semantics: a null value DELETES the
                // key (the layered-params unset path — presence IS the override
                // mark, so removal is a first-class write, never a value trick).
                const merged = stage["params"] !== null && typeof stage["params"] === "object" && !Array.isArray(stage["params"])
                    ? { ...stage["params"] }
                    : {};
                const incoming = patch["params"];
                for (const k of Object.keys(incoming)) {
                    if (incoming[k] === null)
                        delete merged[k];
                    else
                        merged[k] = incoming[k];
                }
                stage["params"] = merged;
            }
            for (const key of ["inputs", "inputOutputs"]) {
                if (key in patch)
                    stage[key] = patch[key];
            }
            const rev = bench.rev + 1;
            const log = [...bench.log, {
                    rev,
                    at: Math.floor(Date.now() / 1000),
                    author: "user",
                    kind: "patch",
                    stage: stageId,
                    summary: Object.keys(patch).sort().join(","),
                }];
            doc["bench"] = { rev, log };
            try {
                await drafts.table("docs").put(draftId, {
                    updated_at: Math.floor(Date.now() / 1000),
                    doc: doc,
                });
            }
            catch (error) {
                /* v8 ignore next 7 -- a domain put failure requires a storage IO
                 * fault (disk/permission); the record is schema-valid by
                 * construction, so no in-process input can reach this arm. */
                throw new RemoteError("draft/cannot-persist", thrownMessage(error), {}, { cause: error });
            }
            notifyBenchDocWrite(draftId);
            return {
                draftId,
                stageId,
                delivered: true,
                patched: Object.keys(patch).sort(),
                rev,
            };
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
    let _remoteExportSubscribe_decorators;
    let _remoteExportEnsure_decorators;
    let _remoteExportPatch_decorators;
    let _remoteExportAddStage_decorators;
    let _remoteExportRemoveStage_decorators;
    let _remoteExportRewire_decorators;
    let _remoteExportReorder_decorators;
    let _remoteExportGroup_decorators;
    let _remoteExportUngroup_decorators;
    let _remoteExportUndo_decorators;
    return class BenchRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportGet_decorators = [Remote("get")];
            _remoteExportSubscribe_decorators = [Remote({ mode: "stream" })];
            _remoteExportEnsure_decorators = [Remote("ensure")];
            _remoteExportPatch_decorators = [Remote("patch")];
            _remoteExportAddStage_decorators = [Remote("add-stage")];
            _remoteExportRemoveStage_decorators = [Remote("remove-stage")];
            _remoteExportRewire_decorators = [Remote("rewire")];
            _remoteExportReorder_decorators = [Remote("reorder")];
            _remoteExportGroup_decorators = [Remote("group")];
            _remoteExportUngroup_decorators = [Remote("ungroup")];
            _remoteExportUndo_decorators = [Remote("undo")];
            __esDecorate(this, null, _remoteExportGet_decorators, { kind: "method", name: "remoteExportGet", static: false, private: false, access: { has: obj => "remoteExportGet" in obj, get: obj => obj.remoteExportGet }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportSubscribe_decorators, { kind: "method", name: "remoteExportSubscribe", static: false, private: false, access: { has: obj => "remoteExportSubscribe" in obj, get: obj => obj.remoteExportSubscribe }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportEnsure_decorators, { kind: "method", name: "remoteExportEnsure", static: false, private: false, access: { has: obj => "remoteExportEnsure" in obj, get: obj => obj.remoteExportEnsure }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportPatch_decorators, { kind: "method", name: "remoteExportPatch", static: false, private: false, access: { has: obj => "remoteExportPatch" in obj, get: obj => obj.remoteExportPatch }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportAddStage_decorators, { kind: "method", name: "remoteExportAddStage", static: false, private: false, access: { has: obj => "remoteExportAddStage" in obj, get: obj => obj.remoteExportAddStage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportRemoveStage_decorators, { kind: "method", name: "remoteExportRemoveStage", static: false, private: false, access: { has: obj => "remoteExportRemoveStage" in obj, get: obj => obj.remoteExportRemoveStage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportRewire_decorators, { kind: "method", name: "remoteExportRewire", static: false, private: false, access: { has: obj => "remoteExportRewire" in obj, get: obj => obj.remoteExportRewire }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportReorder_decorators, { kind: "method", name: "remoteExportReorder", static: false, private: false, access: { has: obj => "remoteExportReorder" in obj, get: obj => obj.remoteExportReorder }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportGroup_decorators, { kind: "method", name: "remoteExportGroup", static: false, private: false, access: { has: obj => "remoteExportGroup" in obj, get: obj => obj.remoteExportGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportUngroup_decorators, { kind: "method", name: "remoteExportUngroup", static: false, private: false, access: { has: obj => "remoteExportUngroup" in obj, get: obj => obj.remoteExportUngroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportUndo_decorators, { kind: "method", name: "remoteExportUndo", static: false, private: false, access: { has: obj => "remoteExportUndo" in obj, get: obj => obj.remoteExportUndo }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        constructor(ctx) {
            super(ctx, "benchRemote", { namespace: "bench" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `bench/get` — one session's bench block as the row. */
        async remoteExportGet(sessionKey, signal) {
            return await this.get(sessionKey, signal);
        }
        /** Endpoint `bench/subscribe` — THE PUSH SOURCE (the collapse
         *  plan's stream arm, 2026-09-12): the session's doc on open, then
         *  a fresh doc after EVERY write that touches the session (the
         *  change events the write arms fire). Stream mode rides the
         *  typert logical-stream carrier — the in-process mux carries it
         *  today; the browser's resource provider consumes rev drift until
         *  the host's HTTP stream face lands, then swaps its source here
         *  with zero consumer changes. Abort ends the stream; a write's
         *  listener fault never breaks the stream (the next write re-wakes
         *  it). */
        async *remoteExportSubscribe(sessionKey, signal) {
            signal.throwIfAborted();
            for (;;) {
                yield await this.get(sessionKey, signal);
                // wake on the session's next write (or abort). An abort that
                // landed while the generator was suspended AT A YIELD has no
                // listener attached — the executor re-checks signal.aborted so
                // the missed event still wakes the park. The stream then ends
                // CLEAN on abort (done: true — the holder released; a throw
                // would surface as an error on a normal close). One finish arm
                // removes BOTH listeners: no stale abort listener per park.
                await new Promise((resolve) => {
                    if (signal.aborted) {
                        resolve();
                        return;
                    }
                    // One finish arm, no re-entry guard needed: finish detaches
                    // BOTH listeners before resolving, so it can never run twice
                    // (the old settled-guard was unreachable by construction).
                    const offAbort = () => { signal.removeEventListener("abort", onAbort); };
                    const finish = () => {
                        offChange();
                        offAbort();
                        resolve();
                    };
                    const offChange = onBenchChange((session) => {
                        if (session !== sessionKey)
                            return;
                        finish();
                    });
                    const onAbort = () => { finish(); };
                    signal.addEventListener("abort", onAbort, { once: true });
                });
                if (signal.aborted)
                    return;
            }
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
                throw new RemoteError("bench/store-failed", thrownMessage(error), {}, { cause: error });
            }
            const row = getBench(drafts, session);
            return { ...row, stages: withResolvedStages(this.ctx, row.stages) };
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
                throw new RemoteError("bench/store-failed", thrownMessage(error), {}, { cause: error });
            }
            const row = await ensureBench(drafts, doc, admissionOf(this.ctx));
            // ensureBench gates doc.session as a valid key before this line —
            // the row's own session can never differ here (no dead fallback).
            notifyBenchChange(String(doc["session"]));
            return row;
        }
        /** Endpoint `bench/patch` — params merge (+result/runStatus) with
         *  CAS + log. */
        async remoteExportPatch(sessionKey, doc, signal) {
            return await this.patch(sessionKey, doc, signal);
        }
        /** Endpoint `bench/add-stage` — append a card stage. */
        async remoteExportAddStage(sessionKey, doc, signal) {
            return await this.addStage(sessionKey, doc, signal);
        }
        /** Endpoint `bench/remove-stage` — splice one stage out. */
        async remoteExportRemoveStage(sessionKey, doc, signal) {
            return await this.removeStage(sessionKey, doc, signal);
        }
        /** Endpoint `bench/rewire` — set or clear one input binding. */
        async remoteExportRewire(sessionKey, doc, signal) {
            return await this.rewire(sessionKey, doc, signal);
        }
        /** Endpoint `bench/reorder` — move one stage to a new index (the
         *  drag-reorder door, 2026-09-11). */
        async remoteExportReorder(sessionKey, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await reorderBench(drafts, sessionKey, doc);
            notifyBenchChange(sessionKey);
            return row;
        }
        /** Endpoint `bench/group` — collapse 2+ stages into a compound row
         *  (the Group Cards sub-view's door, 2026-09-11). */
        async remoteExportGroup(sessionKey, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await groupBench(drafts, sessionKey, doc);
            notifyBenchChange(sessionKey);
            return row;
        }
        /** Endpoint `bench/ungroup` — spill a compound's children back. */
        async remoteExportUngroup(sessionKey, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await ungroupBench(drafts, sessionKey, doc);
            notifyBenchChange(sessionKey);
            return row;
        }
        /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
        async remoteExportUndo(sessionKey, doc, signal) {
            return await this.undo(sessionKey, doc, signal);
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
                throw new RemoteError("bench/store-failed", thrownMessage(error), {}, { cause: error });
            }
        }
        async patch(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await patchBench(drafts, session, doc, admissionOf(this.ctx));
            notifyBenchChange(session);
            return row;
        }
        async addStage(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await addStageBench(drafts, session, doc, admissionOf(this.ctx));
            notifyBenchChange(session);
            return row;
        }
        async removeStage(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await removeStageBench(drafts, session, doc);
            notifyBenchChange(session);
            return row;
        }
        async rewire(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await rewireBench(drafts, session, doc);
            notifyBenchChange(session);
            return row;
        }
        async undo(session, doc, signal) {
            signal.throwIfAborted();
            const drafts = await this.open(signal);
            const row = await undoBench(drafts, session, doc);
            notifyBenchChange(session);
            return row;
        }
    };
})();
export { BenchRemoteService };
//# sourceMappingURL=remote.js.map