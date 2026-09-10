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
import { openDraftsDomain } from "./store.js";
import { DRAFT_ID_RE } from "./spec.js";
import type { DraftsDomainSpec } from "./spec.js";
import {
  addStageBench,
  ensureBench,
  getBench,
  patchBench,
  removeStageBench,
  rewireBench,
  undoBench,
} from "./bench.js";
import type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchRewireRow,
  BenchStageRow,
  BenchUndoRow,
} from "./bench.js";

export type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchRewireRow,
  BenchStageRow,
  BenchUndoRow,
} from "./bench.js";

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
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    draftsRemote: DraftsRemoteService;
    benchRemote: BenchRemoteService;
  }
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
        error instanceof Error ? error.message : String(error),
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
        error instanceof Error ? error.message : String(error),
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
    return rec.doc as unknown as Record<string, unknown>;
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
    session: string,
    signal: AbortSignal,
  ): Promise<BenchGetRow> {
    return await this.get(session, signal);
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
        error instanceof Error ? error.message : String(error),
        {},
        { cause: error },
      );
    }
    return getBench(drafts, session);
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
        error instanceof Error ? error.message : String(error),
        {},
        { cause: error },
      );
    }
    return await ensureBench(drafts, doc);
  }

  /** Endpoint `bench/patch` — params merge (+result/runStatus) with
   *  CAS + log. */
  @Remote("patch")
  async remoteExportPatch(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchPatchRow> {
    return await this.patch(session, doc, signal);
  }

  /** Endpoint `bench/add-stage` — append a card stage. */
  @Remote("add-stage")
  async remoteExportAddStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.addStage(session, doc, signal);
  }

  /** Endpoint `bench/remove-stage` — splice one stage out. */
  @Remote("remove-stage")
  async remoteExportRemoveStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.removeStage(session, doc, signal);
  }

  /** Endpoint `bench/rewire` — set or clear one input binding. */
  @Remote("rewire")
  async remoteExportRewire(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    return await this.rewire(session, doc, signal);
  }

  /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
  @Remote("undo")
  async remoteExportUndo(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchUndoRow> {
    return await this.undo(session, doc, signal);
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
        error instanceof Error ? error.message : String(error),
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
    return await patchBench(drafts, session, doc);
  }

  async addStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    return await addStageBench(drafts, session, doc);
  }

  async removeStage(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    return await removeStageBench(drafts, session, doc);
  }

  async rewire(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    return await rewireBench(drafts, session, doc);
  }

  async undo(
    session: string,
    doc: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<BenchUndoRow> {
    signal.throwIfAborted();
    const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
    return await undoBench(drafts, session, doc);
  }
}
