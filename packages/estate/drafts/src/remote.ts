// remote.ts — the drafts Typert Remote owner (REBUILD-1).
//
// Shape per references/deepseek-harness/docs/cookbook/adding-a-remote-api.md:
// a host-side Cordis service extending TypertRemoteService, `@Remote`
// on `remoteExport*` adapters (signal always final), business methods
// beneath. Failures are the protocol's ONE RemoteError class with the
// `draft/*` codes declared here (the producing package, next to the
// throws) — no domain error-class family, per the cookbook's §2.
import type { Context } from "@deepseek-ai/cordis";
import {
  Remote,
  RemoteError,
  TypertRemoteService,
} from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { benchBlockOf, type BenchBlock } from "./bench.js";
import { openDraftsDomain } from "./store.js";
import { DRAFT_ID_RE } from "./spec.js";
import type { DraftRecord, DraftsDomainSpec } from "./spec.js";
import {
  addStageBench,
  ensureBench,
  notifyBenchChange,
  notifyBenchDocWrite,
  onBenchChange,
  getBench,
  groupBench,
  patchBench,
  removeStageBench,
  reorderBench,
  rewireBench,
  undoBench,
  ungroupBench,
} from "./bench.js";
import type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchReorderRow,
  BenchRewireRow,
  BenchStageRow,
  BenchUndoRow,
} from "./bench.js";

export type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchReorderRow,
  BenchRewireRow,
  BenchStageRow,
  BenchUndoRow,
} from "./bench.js";

/** The stage-patch door's fixed key set (the old door's
 *  STAGE_PATCH_KEYS, order verbatim — the unknown-keys voice lists
 *  them in this order). */
export const STAGE_PATCH_KEYS = ["params", "result", "runStatus", "inputs", "inputOutputs"] as const;
export type StagePatchKey = (typeof STAGE_PATCH_KEYS)[number];

/** Endpoint `drafts/patch` answer — the old door's delivered envelope:
 *  a missing doc/stage is delivered:false + reason (a DOMAIN outcome,
 *  never an error); a landing patch reports the patched key set and
 *  the bench revision it landed at (the CAS law's re-read handle). */
export interface DraftPatchRow {
  draftId: string;
  stageId: string;
  delivered: boolean;
  reason?: string;
  patched?: string[];
  rev?: number;
}

/** draft_id_ok: 1..96 chars of [A-Za-z0-9_-] (the composer mint). */

/** One listed draft — the index row (recency-ordered by the caller). */
export interface DraftListRow {
  readonly draft_id: string;
  readonly model: string;
  readonly name: string;
}

/** The list result: rows capped at 600, count total pre-cap. */
export interface DraftListResult {
  readonly count: number;
  readonly drafts: readonly DraftListRow[];
}

/** The drafts' Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The id fails the [A-Za-z0-9_-]{1,96} draft law. */
    "draft/bad-id": { readonly draftId: string };
    /** No stored draft carries that id. */
    "draft/not-found": { readonly draftId: string };
    /** The storage open refused an otherwise valid call. */
    "draft/store-failed": Record<string, never>;
    /** The stage id is empty/non-string (the patch door). */
    "draft/bad-stage-id": { readonly stageId: string };
    /** The patch body is not a plain object (the patch door). */
    "draft/bad-patch": Record<string, never>;
    /** Keys outside the door's fixed set (the old voice names them). */
    "draft/patch-unknown-keys": { readonly unknown: readonly string[] };
    /** The domain write refused (put failed at the medium). */
    "draft/cannot-persist": Record<string, never>;
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    draftsRemote: DraftsRemoteService;
    benchRemote: BenchRemoteService;
  }
}

/** The wrap voice for a thrown store error: Error.message when the
 *  value carries one, else the string form. Every store/domain throw
 *  site constructs `new Error` (or an Error subclass), so the else
 *  arm only guards degenerate non-Error throws. */
function thrownMessage(error: unknown): string {
  /* v8 ignore next -- a non-Error throw requires a degenerate throw
   * site; openDraftsDomain and the domain layer construct Errors. */
  return error instanceof Error ? error.message : String(error);
}

/** THE RESOLVED SERVE (hour-26 stroke 15, the 1:1 run law): the
 *  registry seat behind the optional-dependency law. The drafts
 *  package never imports the registry (dependency direction is
 *  queue -> drafts); the serve probes ctx.get('cardRegistry') at the
 *  use site — the documented no-inject read (context.md: "without
 *  the inject requirement", undefined when unprovided; a direct
 *  ctx.cardRegistry read would throw "without inject" on lanes that
 *  never mount the seat). Present on card lanes, absent on
 *  registry-less ones (the serve then skips, and the client falls
 *  back to its local derive). */
interface StageResolver {
  resolveStageParams(body: Record<string, unknown>): Record<string, unknown> | null;
}

function resolverOf(ctx: Context): StageResolver | null {
  let seat: unknown;
  try {
    seat = ctx.get("cardRegistry", false);
  } catch {
    return null;
  }
  if (seat === null || seat === undefined || typeof seat !== "object") return null;
  const fn: unknown = (seat as { resolveStageParams?: unknown }).resolveStageParams;
  if (typeof fn !== "function") return null;
  return seat as StageResolver;
}

/** Attach the served `resolved` map per stage (prepareCardParams'
 *  own stamped + lifted body — the exact input the next run
 *  composes). Copies rows, never mutates the domain's cached doc:
 *  the stored record keeps params/result/runStatus only, the serve
 *  derives `resolved` fresh on every read. A stage whose params name
 *  no resolvable unit rides un-resolved (no key at all — the client
 *  treats absence as the local-derive fallback). */
function withResolvedStages(ctx: Context, stages: unknown): unknown {
  if (!Array.isArray(stages)) return stages;
  const reg = resolverOf(ctx);
  if (reg === null) return stages;
  return (stages as unknown[]).map((s: unknown): unknown => {
    if (typeof s !== "object" || s === null || Array.isArray(s)) return s;
    const row = s as Record<string, unknown>;
    const params = row["params"];
    if (params === null || typeof params !== "object" || Array.isArray(params)) return row;
    const resolved = reg.resolveStageParams(params as Record<string, unknown>);
    if (resolved === null) return row;
    return { ...row, resolved };
  });
}

/** First-seen display strings walk the doc depth-first (the index
 *  law: model/service cap 80, name/intent/title cap 160). */
function docIndexFields(doc: unknown): { model: string; name: string } {
  const first: Record<string, string> = {};
  const walk = (v: unknown): void => {
    if (typeof v === "string") return;
    if (Array.isArray(v)) {
      for (const e of v) walk(e);
      return;
    }
    if (typeof v !== "object" || v === null) return;
    for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
      if (
        first[k] === undefined &&
        (k === "model" ||
          k === "name" ||
          k === "intent" ||
          k === "title" ||
          k === "service") &&
        typeof e === "string"
      ) {
        first[k] = e;
      }
      walk(e);
    }
  };
  walk(doc);
  const cap = (s: string | undefined, n: number): string =>
    s === undefined ? "" : s.length + 1 < n ? s : s.slice(0, n - 1);
  let model = cap(first["model"], 80);
  let disp = cap(first["name"], 160);
  if (disp === "") disp = cap(first["intent"], 160);
  if (disp === "") disp = cap(first["title"], 160);
  if (model === "") model = cap(first["service"], 80);
  return { model, name: disp };
}

/** The drafts Remote owner: list/get over the storage domain. */
export class DraftsRemoteService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, "draftsRemote", { namespace: "drafts" });
  }

  /** Endpoint `drafts/list` — the domain index, recency DESC. */
  @Remote("list")
  async remoteExportList(signal: AbortSignal): Promise<DraftListResult> {
    return await this.list(signal);
  }

  /** Endpoint `drafts/get` — one doc by id. */
  @Remote("get")
  async remoteExportGet(
    draftId: string,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return await this.get(draftId, signal);
  }

  /** The in-process API the adapters above delegate to. */
  async list(signal: AbortSignal): Promise<DraftListResult> {
    signal.throwIfAborted();
    let drafts: Domain<DraftsDomainSpec>;
    try {
      drafts = await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "draft/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
    const ents: { mt: number; row: DraftListRow }[] = [];
    for (const [did, rec] of drafts.table("docs").entries()) {
      ents.push({ mt: rec.updated_at, row: { draft_id: did, ...docIndexFields(rec.doc) } });
    }
    ents.sort((a, b): number => b.mt - a.mt);
    return {
      count: ents.length,
      drafts: ents.slice(0, 600).map((e): DraftListRow => e.row),
    };
  }

  /** The in-process API the adapter above delegates to. */
  async get(
    draftId: string,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    if (!DRAFT_ID_RE.test(draftId)) {
      throw new RemoteError("draft/bad-id", `bad draft id ${JSON.stringify(draftId)}`, {
        draftId,
      });
    }
    let drafts: Domain<DraftsDomainSpec>;
    try {
      drafts = await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "draft/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
    const rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
      throw new RemoteError("draft/not-found", `draft not found: ${draftId}`, {
        draftId,
      });
    }
    const doc = rec.doc as unknown as Record<string, unknown>;
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
  @Remote("patch")
  async remoteExportPatch(
    draftId: string,
    stageId: string,
    patch: Record<string, unknown>,
    expectRev: number | null,
    signal: AbortSignal,
  ): Promise<DraftPatchRow> {
    return await this.patch(draftId, stageId, patch, expectRev, signal);
  }

  /** The patch arm the adapter above delegates to. */
  async patch(
    draftId: string,
    stageId: string,
    patch: Record<string, unknown>,
    expectRev: number | null,
    signal: AbortSignal,
  ): Promise<DraftPatchRow> {
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
    const unknown: string[] = Object.keys(patch).filter(
      (k) => !STAGE_PATCH_KEYS.includes(k as StagePatchKey),
    );
    if (unknown.length > 0) {
      throw new RemoteError(
        "draft/patch-unknown-keys",
        `unknown stage patch key(s): ${unknown.join(", ")} (want ${STAGE_PATCH_KEYS.join(", ")})`,
        { unknown },
      );
    }
    let drafts: Domain<DraftsDomainSpec>;
    try {
      drafts = await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "draft/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
    const rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
      // The old door's delivered:false envelope — a missing doc is a
      // DOMAIN outcome, not an error.
      return { draftId, stageId, delivered: false, reason: "draft not found" };
    }
    const doc = rec.doc as unknown as Record<string, unknown>;
    // The domain schema guarantees stages is an array (schema-failing
    // records are backed up and skipped at read) — no re-defense here.
    const stages = doc["stages"] as unknown[];
    const stage: Record<string, unknown> | null =
      (stages.find(
        (s): s is Record<string, unknown> =>
          typeof s === "object" && s !== null && (s as Record<string, unknown>)["id"] === stageId,
      ) as Record<string, unknown> | undefined) ?? null;
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
      throw new RemoteError(
        "bench/cas-conflict",
        `bench moved under the patch (expect_rev ${expectRev}, current ${bench.rev}) — re-read and re-apply`,
        { current_rev: bench.rev, expect_rev: expectRev },
      );
    }
    if ("result" in patch) stage["result"] = patch["result"];
    if ("runStatus" in patch) stage["runStatus"] = patch["runStatus"];
    if ("params" in patch && patch["params"] !== null && typeof patch["params"] === "object" && !Array.isArray(patch["params"])) {
      // PER-KEY merge (never replace) — the old door's law, now with
      // JSON Merge Patch null semantics: a null value DELETES the
      // key (the layered-params unset path — presence IS the override
      // mark, so removal is a first-class write, never a value trick).
      const merged: Record<string, unknown> =
        stage["params"] !== null && typeof stage["params"] === "object" && !Array.isArray(stage["params"])
          ? { ...(stage["params"] as Record<string, unknown>) }
          : {};
      const incoming: Record<string, unknown> = patch["params"] as Record<string, unknown>;
      for (const k of Object.keys(incoming)) {
        if (incoming[k] === null) delete merged[k];
        else merged[k] = incoming[k];
      }
      stage["params"] = merged;
    }
    for (const key of ["inputs", "inputOutputs"] as const) {
      if (key in patch) stage[key] = patch[key];
    }
    const rev = bench.rev + 1;
    const log = [...bench.log, {
      rev,
      at: Math.floor(Date.now() / 1000),
      author: "user",
      kind: "patch",
      stage: stageId,
      summary: Object.keys(patch).sort().join(","),
    }] as BenchBlock["log"];
    doc["bench"] = { rev, log };
    try {
      await drafts.table("docs").put(draftId, {
        updated_at: Math.floor(Date.now() / 1000),
        doc: doc as unknown as DraftRecord["doc"],
      });
    } catch (error: unknown) {
      /* v8 ignore next 7 -- a domain put failure requires a storage IO
       * fault (disk/permission); the record is schema-valid by
       * construction, so no in-process input can reach this arm. */
      throw new RemoteError(
        "draft/cannot-persist",
        thrownMessage(error),
        {},
        { cause: error },
      );
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
}

/** The bench Remote owner: ensure/get over the same drafts domain
 *  (the bench doc IS a draft doc, id "bench-<session>"). */
export class BenchRemoteService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, "benchRemote", { namespace: "bench" });
  }

  /** Endpoint `bench/get` — one session's bench block as the row. */
  @Remote("get")
  async remoteExportGet(
    sessionKey: string,
    signal: AbortSignal,
  ): Promise<BenchGetRow> {
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
  @Remote({ mode: "stream" })
  async *remoteExportSubscribe(
    sessionKey: string,
    signal: AbortSignal,
  ): AsyncGenerator<BenchGetRow> {
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
      await new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        // One finish arm, no re-entry guard needed: finish detaches
        // BOTH listeners before resolving, so it can never run twice
        // (the old settled-guard was unreachable by construction).
        const offAbort = (): void => { signal.removeEventListener("abort", onAbort); };
        const finish = (): void => {
          offChange();
          offAbort();
          resolve();
        };
        const offChange = onBenchChange((session) => {
          if (session !== sessionKey) return;
          finish();
        });
        const onAbort = (): void => { finish(); };
        signal.addEventListener("abort", onAbort, { once: true });
      });
      if (signal.aborted) return;
    }
  }

  /** Endpoint `bench/ensure` — birth or load (the only creating arm). */
  @Remote("ensure")
  async remoteExportEnsure(
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchEnsureRow> {
    return await this.ensure(doc, signal);
  }

  /** The in-process API the adapters above delegate to. Classified
   *  bench failures pass through untouched; only the open itself
   *  wraps as bench/store-failed. */
  async get(session: string, signal: AbortSignal): Promise<BenchGetRow> {
    signal.throwIfAborted();
    let drafts: Domain<DraftsDomainSpec>;
    try {
      drafts = await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "bench/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
    const row = getBench(drafts, session);
    return { ...row, stages: withResolvedStages(this.ctx, row.stages) };
  }

  /** The in-process API the adapter above delegates to. */
  async ensure(
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchEnsureRow> {
    signal.throwIfAborted();
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new RemoteError("bench/bad-body", "body must be a JSON object", {});
    }
    let drafts: Domain<DraftsDomainSpec>;
    try {
      drafts = await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "bench/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
    const row = await ensureBench(drafts, doc);
    // ensureBench gates doc.session as a valid key before this line —
    // the row's own session can never differ here (no dead fallback).
    notifyBenchChange(String(doc["session"]));
    return row;
  }

  /** Endpoint `bench/patch` — params merge (+result/runStatus) with
   *  CAS + log. */
  @Remote("patch")
  async remoteExportPatch(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchPatchRow> {
    return await this.patch(sessionKey, doc, signal);
  }

  /** Endpoint `bench/add-stage` — append a card stage. */
  @Remote("add-stage")
  async remoteExportAddStage(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.addStage(sessionKey, doc, signal);
  }

  /** Endpoint `bench/remove-stage` — splice one stage out. */
  @Remote("remove-stage")
  async remoteExportRemoveStage(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.removeStage(sessionKey, doc, signal);
  }

  /** Endpoint `bench/rewire` — set or clear one input binding. */
  @Remote("rewire")
  async remoteExportRewire(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    return await this.rewire(sessionKey, doc, signal);
  }

  /** Endpoint `bench/reorder` — move one stage to a new index (the
   *  drag-reorder door, 2026-09-11). */
  @Remote("reorder")
  async remoteExportReorder(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchReorderRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await reorderBench(drafts, sessionKey, doc);
    notifyBenchChange(sessionKey);
    return row;
  }

  /** Endpoint `bench/group` — collapse 2+ stages into a compound row
   *  (the Group Cards sub-view's door, 2026-09-11). */
  @Remote("group")
  async remoteExportGroup(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await groupBench(drafts, sessionKey, doc);
    notifyBenchChange(sessionKey);
    return row;
  }

  /** Endpoint `bench/ungroup` — spill a compound's children back. */
  @Remote("ungroup")
  async remoteExportUngroup(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await ungroupBench(drafts, sessionKey, doc);
    notifyBenchChange(sessionKey);
    return row;
  }

  /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
  @Remote("undo")
  async remoteExportUndo(
    sessionKey: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchUndoRow> {
    return await this.undo(sessionKey, doc, signal);
  }

  /** The in-process APIs the adapters above delegate to. The
   *  domain's classified failures pass through untouched; only the
   *  open itself wraps as bench/store-failed. */
  private async open(
    signal: AbortSignal,
  ): Promise<Domain<DraftsDomainSpec>> {
    signal.throwIfAborted();
    try {
      return await openDraftsDomain(this.ctx);
    } catch (error: unknown) {
      throw new RemoteError(
        "bench/store-failed",
        thrownMessage(error),
        {},
        { cause: error },
      );
    }
  }

  async patch(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchPatchRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await patchBench(drafts, session, doc);
    notifyBenchChange(session);
    return row;
  }

  async addStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await addStageBench(drafts, session, doc);
    notifyBenchChange(session);
    return row;
  }

  async removeStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await removeStageBench(drafts, session, doc);
    notifyBenchChange(session);
    return row;
  }

  async rewire(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await rewireBench(drafts, session, doc);
    notifyBenchChange(session);
    return row;
  }

  async undo(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchUndoRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    const row = await undoBench(drafts, session, doc);
    notifyBenchChange(session);
    return row;
  }
}
