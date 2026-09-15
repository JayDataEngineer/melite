// bench.ts — the bench domain logic (REBUILD-2, re-homed 2026-09-10).
//
// The bench doc IS a draft doc (same domain, same table, id
// "bench-<session>") plus a `bench` block: { rev, log } — the
// append-only revision log both authors walk. HTTP vocabulary is
// dead with the gateway: birth/load refuse as RemoteError codes,
// never status payloads.
//
// Laws carried over (the bench rework's, unchanged):
//   CAS — ensure-with-stages takes expect_rev; a moved bench refuses
//   loud (bench/cas-conflict carries current_rev), never merges.
//   APPEND-ONLY LOG — load appends a revert-carrying entry; history
//   is never rewritten (patch/undo arms land in later strokes).
//   AUTHORSHIP — every entry carries author ("agent"|"user").
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftRecord, DraftsDomainSpec } from "./spec.js";

/** The bench's Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The session key fails the [A-Za-z0-9_-]{1,64} bench law. */
    "bench/bad-session": Record<string, never>;
    /** The body failed the bench contract (non-object / unknown keys). */
    "bench/bad-body": Record<string, never>;
    /** THE MODEL ADMISSION (no-silent-drop law, hour 26 stroke 17):
     *  the stage's model is not offered by the card, or boarded but
     *  not downloaded on this machine — the write refuses with the
     *  card + the offered (present) models. */
    "bench/bad-model": {
      readonly card: string;
      readonly offered: readonly string[];
    };
    /** The CAS law: expect_rev missing, or the bench moved under the
     *  caller — current_rev is the rev to re-read from. */
    "bench/cas-conflict": {
      readonly current_rev: number;
      readonly expect_rev?: number;
    };
    /** The overwrite law (2026-09-15): a wholesale load onto a
     *  non-empty bench without overwrite: true — stages is how
     *  many would have been discarded. */
    "bench/overwrite-required": {
      readonly current_rev: number;
      readonly stages: number;
    };
    /** No bench doc carries that session. */
    "bench/not-found": { readonly session: string };
    /** No stage of that id sits on the bench. */
    "bench/stage-not-found": {
      readonly session: string;
      readonly stage: string;
    };
    /** A stage of that id is already on the bench. */
    "bench/duplicate-stage": {
      readonly session: string;
      readonly stage: string;
    };
    /** The undo walk found no live, filter-matching action. */
    "bench/nothing-to-undo": Record<string, never>;
    /** The storage open refused an otherwise valid call. */
    "bench/store-failed": Record<string, never>;
  }
}

/** Session key gate: same charset family as draft ids, capped so
 * "bench-" + session always clears the 96-char draft ceiling. */
const SESSION_RE: RegExp = /^[A-Za-z0-9_-]{1,64}$/;

function benchIdOf(session: string): string {
  return "bench-" + session;
}

const AUTHORS = ["agent", "user"] as const;
type Author = (typeof AUTHORS)[number];

function authorOk(v: unknown): v is Author {
  return v === "agent" || v === "user";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface BenchEntry {
  /** Filled by the persister (rev/at are the domain's, not the caller's). */
  rev: number;
  at: number;
  author: Author;
  kind: "patch" | "add_stage" | "remove_stage" | "rewire" | "reorder" | "group" | "ungroup" | "load" | "undo";
  stage?: string;
  summary?: string;
  /** Kind-specific inverse payload (undo applies it). */
  inverse?: Record<string, unknown>;
  /** Filled on undo entries: the revs this entry reverted. */
  reverted?: number[];
}

export interface BenchBlock {
  rev: number;
  log: BenchEntry[];
}

export function benchBlockOf(doc: Record<string, unknown>): BenchBlock {
  const raw: unknown = doc["bench"];
  if (
    isRecord(raw) &&
    typeof raw["rev"] === "number" &&
    Array.isArray(raw["log"])
  ) {
    return { rev: raw["rev"], log: raw["log"] as BenchEntry[] };
  }
  return { rev: 0, log: [] };
}

function stagesOf(doc: Record<string, unknown>): Record<string, unknown>[] {
  // The domain schema guarantees stages is an array of id-carrying
  // objects (DraftDocSchema; schema-failing records are backed up and
  // skipped at read) — no re-defense here.
  return doc["stages"] as Record<string, unknown>[];
}

/** Birth defaults per the composer's law (id, inputs, provenance)
 *  with the runner's object inputs. */
function normalizeStages(
  stagesIn: unknown,
  author: Author,
): Record<string, unknown>[] {
  if (!Array.isArray(stagesIn)) return [];
  return stagesIn
    .filter((s: unknown): boolean => isRecord(s))
    .map((s: unknown, idx: number): Record<string, unknown> => {
      const src: Record<string, unknown> = s as Record<string, unknown>;
      const row: Record<string, unknown> = {};
      for (const k of Object.keys(src)) row[k] = src[k];
      // Defaults fill AFTER the caller's data (a junk or missing id
      // must not ship an unaddressable row; the schema's id law).
      row["id"] = typeof src["id"] === "string" ? src["id"] : "s_" + idx;
      if (typeof row["engine"] !== "string" || row["engine"] === "")
        row["engine"] = "comfyui";
      if (!isRecord(row["inputs"])) row["inputs"] = {};
      if (!isRecord(row["params"])) row["params"] = {};
      if (!isRecord(row["outputs"])) row["outputs"] = { default: "image" };
      if (row["provenance"] !== "user") row["provenance"] = author;
      return row;
    });
}

/** The ensure row: create marker, rev, intent, stages. */
export interface BenchEnsureRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly intent: unknown;
  readonly stages: unknown;
  readonly created: boolean;
}

/** The get row: the bench as it stands, log HEADS only (rev/at /
 *  author / kind / stage / summary / reverted — inverses never
 *  leave the domain). */
export interface BenchGetRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly intent: unknown;
  readonly stages: unknown;
  readonly log: readonly Record<string, unknown>[];
}

const ENSURE_KEYS = ["session", "stages", "intent", "author", "expect_rev", "overwrite"];

function refuseUnknown(
  body: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const unknown: string[] = Object.keys(body).filter(
    (k: string): boolean => !allowed.includes(k),
  );
  if (unknown.length > 0) {
    throw new RemoteError(
      "bench/bad-body",
      "unknown bench key(s): " +
        unknown.sort().join(", ") +
        " (want " +
        allowed.join(", ") +
        ")",
      {},
    );
  }
}

/** ensure — create the bench (birth: rev 0, empty log) or LOAD onto
 *  it (replace stages, snapshot inverse; a non-empty bench demands
 *  overwrite: true — the overwrite law). The only arm that may
 *  create; everything else refuses a missing bench. */
export async function ensureBench(
  drafts: Domain<DraftsDomainSpec>,
  body: Record<string, unknown>,
  admit?: StageAdmission,
): Promise<BenchEnsureRow> {
  refuseUnknown(body, ENSURE_KEYS);
  const session: unknown = body["session"];
  if (typeof session !== "string" || !SESSION_RE.test(session)) {
    throw new RemoteError(
      "bench/bad-session",
      "bad session key (want [A-Za-z0-9_-]{1,64})",
      {},
    );
  }
  const draftId: string = benchIdOf(session);
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const rec: DraftRecord | undefined = drafts.table("docs").get(draftId);

  if (rec === undefined) {
    const stagesIn: unknown = Array.isArray(body["stages"]) ? body["stages"] : [];
    admitStages(admit, stagesIn);
    const doc: Record<string, unknown> = {
      draft_id: draftId,
      intent: typeof body["intent"] === "string" ? body["intent"] : "bench",
      stages: normalizeStages(stagesIn, author),
      status: "ready",
      createdAt: Date.now(),
      completedAt: null,
      bench: { rev: 0, log: [] },
    };
    await drafts.table("docs").put(draftId, {
      updated_at: Math.floor(Date.now() / 1000),
      doc: doc as unknown as DraftRecord["doc"],
    });
    return {
      draft_id: draftId,
      session,
      rev: 0,
      intent: doc["intent"],
      stages: doc["stages"],
      created: true,
    };
  }

  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  const block: BenchBlock = benchBlockOf(doc);
  if (body["stages"] === undefined) {
    return {
      draft_id: draftId,
      session,
      rev: block.rev,
      intent: doc["intent"],
      stages: doc["stages"],
      created: false,
    };
  }
  const expect: unknown = body["expect_rev"];
  if (typeof expect !== "number") {
    throw new RemoteError(
      "bench/cas-conflict",
      "expect_rev is required (the CAS law)",
      { current_rev: block.rev },
    );
  }
  if (expect !== block.rev) {
    throw new RemoteError(
      "bench/cas-conflict",
      "bench moved: rev is " + block.rev + ", caller held " + expect,
      { current_rev: block.rev, expect_rev: expect },
    );
  }
  const before: Record<string, unknown>[] = stagesOf(doc);
  // THE OVERWRITE LAW (2026-09-15 — a compose agent wiped a live
  // image card with a wholesale load): replacing a NON-EMPTY bench
  // is a destructive act and must say so. expect_rev proves the
  // caller read the bench, not that the user agreed to lose it —
  // pass overwrite: true to confirm (flow landings and the
  // gallery's draft-click already do; the undo log still records
  // stages_before either way).
  if (before.length > 0 && body["overwrite"] !== true) {
    throw new RemoteError(
      "bench/overwrite-required",
      "bench holds " + before.length + " stage(s) at rev " + block.rev +
      " — a wholesale load would discard them; confirm with overwrite: true, " +
      "or grow the bench with add_stage / patch, or undo if this was a mistake",
      { current_rev: block.rev, stages: before.length },
    );
  }
  admitStages(admit, body["stages"]);
  doc["stages"] = normalizeStages(body["stages"], author);
  if (typeof body["intent"] === "string") doc["intent"] = body["intent"];
  const entry: BenchEntry = {
    author,
    kind: "load",
    summary: "load " + stagesOf(doc).length + " stages",
    inverse: { stages_before: before },
    rev: block.rev + 1,
    at: Math.floor(Date.now() / 1000),
  };
  block.rev = entry.rev;
  block.log.push(entry);
  doc["bench"] = block as unknown as Record<string, unknown>;
  await drafts.table("docs").put(draftId, {
    updated_at: Math.floor(Date.now() / 1000),
    doc: doc as unknown as DraftRecord["doc"],
  });
  return {
    draft_id: draftId,
    session,
    rev: block.rev,
    intent: doc["intent"],
    stages: doc["stages"],
    created: false,
  };
}

/** get — one session's bench block as the served row. */
export function getBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
): BenchGetRow {
  if (!SESSION_RE.test(session)) {
    throw new RemoteError(
      "bench/bad-session",
      "bad session key (want [A-Za-z0-9_-]{1,64})",
      {},
    );
  }
  const draftId: string = benchIdOf(session);
  const rec: DraftRecord | undefined = drafts.table("docs").get(draftId);
  if (rec === undefined) {
    throw new RemoteError("bench/not-found", "no such bench: " + session, {
      session,
    });
  }
  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  const block: BenchBlock = benchBlockOf(doc);
  return {
    draft_id: draftId,
    session,
    rev: block.rev,
    intent: doc["intent"],
    stages: doc["stages"],
    log: block.log.map(
      (e: BenchEntry): Record<string, unknown> => ({
        rev: e.rev,
        at: e.at,
        author: e.author,
        kind: e.kind,
        ...(e.stage !== undefined ? { stage: e.stage } : {}),
        ...(e.summary !== undefined ? { summary: e.summary } : {}),
        ...(e.reverted !== undefined ? { reverted: e.reverted } : {}),
      }),
    ),
  };
}

// ── the mutation arms (REBUILD-4: patch/add_stage/remove_stage/
//    rewire/undo — re-homed from the bench door, HTTP vocabulary
//    dead) ──────────────────────────────────────────────────────

/** One loaded bench (session-validated, existing). */
interface LoadedBench {
  readonly draftId: string;
  readonly doc: Record<string, unknown>;
  readonly block: BenchBlock;
}

async function loadBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
): Promise<LoadedBench> {
  if (!SESSION_RE.test(session)) {
    throw new RemoteError(
      "bench/bad-session",
      "bad session key (want [A-Za-z0-9_-]{1,64})",
      {},
    );
  }
  const draftId: string = benchIdOf(session);
  let rec: DraftRecord | undefined = drafts.table("docs").get(draftId);
  if (rec === undefined) {
    // THE BIRTH (stroke 46g, the operator's "is this a forever fix?"):
    // a conversation's bench is born at its FIRST write — never a
    // refusal. rev 0, empty stages, the session's own id.
    const doc0: Record<string, unknown> = { draft_id: draftId, intent: "", stages: [], bench: { rev: 0, log: [] } };
    await drafts.table("docs").put(draftId, {
      updated_at: Math.floor(Date.now() / 1000),
      doc: doc0 as unknown as DraftRecord["doc"],
    });
    rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
      throw new RemoteError("bench/not-found", "could not birth bench: " + session, { session });
    }
  }
  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  return { draftId, doc, block: benchBlockOf(doc) };
}

/** The CAS law, one voice (missing expect_rev refuses too). */
function casCheck(
  block: BenchBlock,
  expect: unknown,
  session: string,
): number {
  if (typeof expect !== "number") {
    throw new RemoteError(
      "bench/cas-conflict",
      "expect_rev is required (the CAS law)",
      { current_rev: block.rev },
    );
  }
  if (expect !== block.rev) {
    throw new RemoteError(
      "bench/cas-conflict",
      "bench " +
        session +
        " moved: rev is " +
        block.rev +
        ", caller held " +
        expect,
      { current_rev: block.rev, expect_rev: expect },
    );
  }
  return block.rev;
}

/** Append one entry + persist; returns the new rev. */
async function appendAndSave(
  drafts: Domain<DraftsDomainSpec>,
  loaded: LoadedBench,
  entry: Omit<BenchEntry, "rev" | "at">,
): Promise<number> {
  const full: BenchEntry = {
    ...entry,
    rev: loaded.block.rev + 1,
    at: Math.floor(Date.now() / 1000),
  };
  loaded.block.rev = full.rev;
  loaded.block.log.push(full);
  loaded.doc["bench"] = loaded.block as unknown as Record<string, unknown>;
  await drafts.table("docs").put(loaded.draftId, {
    updated_at: Math.floor(Date.now() / 1000),
    doc: loaded.doc as unknown as DraftRecord["doc"],
  });
  return full.rev;
}

function stageRow(
  doc: Record<string, unknown>,
  stageId: string,
): Record<string, unknown> | null {
  // Schema law (see stagesOf): rows are records with string ids.
  const stages = doc["stages"] as Record<string, unknown>[];
  return stages.find((st: Record<string, unknown>): boolean => st["id"] === stageId) ?? null;
}

const PATCH_KEYS = ["stage", "params", "result", "runStatus", "expect_rev", "author"];

/** The patch row: the touched stage + the params keys merged. */
export interface BenchPatchRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly stage: string;
  readonly patched: readonly string[];
}

/** patch — params merge with CAS + log (result/runStatus ride too:
 *  run-status writes from the tab land here, authored "user"). */
export async function patchBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
  admit?: StageAdmission,
): Promise<BenchPatchRow> {
  refuseUnknown(body, PATCH_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") {
    throw new RemoteError("bench/bad-body", "stage is required", {});
  }
  const st: Record<string, unknown> | null = stageRow(loaded.doc, stageId);
  if (st === null) {
    throw new RemoteError(
      "bench/stage-not-found",
      "stage not found: " + stageId,
      { session, stage: stageId },
    );
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const before: Record<string, unknown> = {};
  const added: string[] = [];
  const paramsIn: unknown = body["params"];
  if (paramsIn !== undefined) {
    if (!isRecord(paramsIn)) {
      throw new RemoteError("bench/bad-body", "params must be an object", {});
    }
    const cur: Record<string, unknown> = isRecord(st["params"])
      ? (st["params"] as Record<string, unknown>)
      : {};
    for (const k of Object.keys(paramsIn)) {
      if (Object.prototype.hasOwnProperty.call(cur, k)) before[k] = cur[k];
      else added.push(k);
      cur[k] = (paramsIn as Record<string, unknown>)[k];
    }
    // admission on the MERGED view (the row's card + the params the
    // NEXT run would compose — a patch that lands poison is as bad
    // as an add that lands it)
    admitStage(admit, st["card"], cur);
    st["params"] = cur;
  }
  let touched = 0;
  if ("result" in body) {
    st["result"] = body["result"];
    touched++;
  }
  if ("runStatus" in body) {
    st["runStatus"] = body["runStatus"];
    touched++;
  }
  if (paramsIn === undefined && touched === 0) {
    throw new RemoteError(
      "bench/bad-body",
      "nothing to patch (params|result|runStatus)",
      {},
    );
  }
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "patch",
    stage: stageId,
    summary:
      "patch " +
      (paramsIn !== undefined
        ? Object.keys(paramsIn).sort().join(",")
        : "status"),
    inverse: { stage: stageId, params_before: before, params_added: added },
  });
  return {
    draft_id: loaded.draftId,
    session,
    rev: newRev,
    stage: stageId,
    patched: paramsIn !== undefined ? Object.keys(paramsIn).sort() : [],
  };
}

const ADD_KEYS = ["id", "card", "engine", "params", "inputs", "outputs", "expected", "expect_rev", "author"];

/** The stage row: the arm's answer (stage id + rev). */
export interface BenchStageRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly stage: string;
}

/** THE ADMISSION SEAT (the no-silent-drop law, hour 26 stroke 17):
 *  the remote injects the registry's model admission (card +
 *  params.model -> refusal with the offered list); the domain stays
 *  pure (tests inject nothing and every model passes). A refusal
 *  throws bench/bad-model AT WRITE TIME — the writer (agent or
 *  human patch) learns the model is not offered/downloaded the
 *  moment it lands, never at run time. */
export type StageAdmission = (
  card: string,
  params: Record<string, unknown>,
) => void;

function admitStage(
  admit: StageAdmission | undefined,
  card: unknown,
  params: unknown,
): void {
  if (admit === undefined) return;
  if (typeof card !== "string" || card === "") return;
  // A param-less row still names its card (2026-09-15: a stageless
  // add sailed past admission entirely) — admit the card against
  // empty params; the model check passes vacuous, the card check
  // still bites.
  admit(card, isRecord(params) ? params : {});
}

/** Admission over a wholesale stage list (the load arm — every row
 *  passes the same door an add passes). */
function admitStages(admit: StageAdmission | undefined, stages: unknown): void {
  if (admit === undefined || !Array.isArray(stages)) return;
  for (const s of stages) {
    if (!isRecord(s)) continue;
    admitStage(admit, s["card"], s["params"]);
  }
}

/** add_stage — append a card stage with optional wiring (the
 *  runner's input convention rides the row). */
export async function addStageBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
  admit?: StageAdmission,
): Promise<BenchStageRow> {
  refuseUnknown(body, ADD_KEYS);
  admitStage(admit, body["card"], body["params"]);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const card: unknown = body["card"];
  if (typeof card !== "string" || card === "") {
    throw new RemoteError("bench/bad-body", "card is required", {});
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  // THE MINT LAW (the collision fix, 2026-09-12): the count mint
  // ("s_" + stages.length) collides the moment any stage was ever
  // removed — [s_0..s_9] minus nine leaves s_1, and the count says
  // s_1 again. The mint takes MAX numeric suffix + 1 over the live
  // rows, so a fresh id is fresh against the bench AS IT STANDS.
  const stageId: string =
    typeof body["id"] === "string" && body["id"] !== ""
      ? body["id"]
      : "s_" +
        String(
          stages.reduce((max: number, row: Record<string, unknown>): number => {
            const m: RegExpMatchArray | null = /^s_(\d+)$/.exec(
              String(row["id"] ?? ""),
            );
            return m === null ? max : Math.max(max, Number(m[1]));
          }, -1) + 1,
        );
  if (stageRow(loaded.doc, stageId) !== null) {
    throw new RemoteError(
      "bench/duplicate-stage",
      "stage id already on the bench: " + stageId,
      { session, stage: stageId },
    );
  }
  const row: Record<string, unknown> = {
    id: stageId,
    card,
    // The runner's engine id (flow_inline contract); comfyui is the
    // only served engine today.
    engine:
      typeof body["engine"] === "string" && body["engine"] !== ""
        ? body["engine"]
        : "comfyui",
    params: isRecord(body["params"]) ? body["params"] : {},
    inputs: isRecord(body["inputs"]) ? body["inputs"] : {},
    outputs: isRecord(body["outputs"]) ? body["outputs"] : { default: "image" },
    provenance: author,
  };
  if (isRecord(body["expected"])) row["expected"] = body["expected"];
  stages.push(row);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "add_stage",
    stage: stageId,
    summary: "add " + card,
    inverse: { stage: stageId },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}

const REMOVE_KEYS = ["stage", "expect_rev", "author"];

const REORDER_KEYS = ["stage", "to", "expect_rev", "author"];

/** reorder — move ONE stage to a new index in the bench's stage order
 *  (the drag-reorder door, 2026-09-11: the old system's reorderRange
 *  gesture; the reborn bench is SSOT so the door exists before the UX
 *  does). The inverse carries the ORIGINAL index for undo. `to` is
 *  clamped into [0, stages.length-1] AFTER the splice-out, so a move
 *  past either end parks at the end — the drag gesture's own
 *  semantics, not an error. */
export async function reorderBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchReorderRow> {
  refuseUnknown(body, REORDER_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") {
    throw new RemoteError("bench/bad-body", "stage is required", {});
  }
  const toRaw: unknown = body["to"];
  if (typeof toRaw !== "number" || !Number.isInteger(toRaw) || toRaw < 0) {
    throw new RemoteError(
      "bench/bad-body",
      "to must be a non-negative integer index",
      {},
    );
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  const from: number = stages.findIndex(
    (s: Record<string, unknown>): boolean => s["id"] === stageId,
  );
  if (from < 0) {
    throw new RemoteError(
      "bench/stage-not-found",
      "stage not found: " + stageId,
      { session, stage: stageId },
    );
  }
  const [row] = stages.splice(from, 1);
  const to: number = Math.min(toRaw, stages.length);
  stages.splice(to, 0, row);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "reorder",
    stage: stageId,
    summary: "reorder " + String(row["card"] ?? stageId),
    inverse: { stage: stageId, from, to },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId, from, to };
}

/** The reorder row: the move's coordinates for the caller's optimistic
 *  update (from → to, both POST-splice-clamp). */
export interface BenchReorderRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly stage: string;
  readonly from: number;
  readonly to: number;
}

const GROUP_KEYS = ["stages", "expect_rev", "author"];

/** group — the Group Cards sub-view's door (2026-09-11): 2+ stage ids
 *  collapse into ONE compound row at the FIRST member's bench position;
 *  the member rows ride INSIDE the compound (children, bench order) so
 *  the bench's stage list stays the projection-free truth — the grid
 *  renders the compound as a single tile and ungroup restores the
 *  members at the compound's index. The inverse carries both halves. */
export async function groupBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchStageRow> {
  refuseUnknown(body, GROUP_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const idsRaw: unknown = body["stages"];
  if (!Array.isArray(idsRaw) || idsRaw.length < 2
      || !idsRaw.every((x: unknown): boolean => typeof x === "string")) {
    throw new RemoteError(
      "bench/bad-body",
      "stages must be an array of 2+ stage ids",
      {},
    );
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  // bench order (the ids arrive selection-order; the compound is the
  // bench's own order — the old law: "the compound parent lands at the
  // FIRST member's position, childIds in array order")
  const ids: string[] = idsRaw as string[];
  const picked: Array<Record<string, unknown>> = [];
  for (const st of stages) {
    if (ids.includes(String(st["id"]))) picked.push(st);
  }
  if (picked.length !== ids.length) {
    throw new RemoteError(
      "bench/stage-not-found",
      "group: unknown stage id(s) — have " + String(picked.length) + " of " + String(ids.length),
      { session, stage: ids.join(",") },
    );
  }
  const firstIndex: number = stages.indexOf(picked[0]!);
  for (const row of picked) {
    // picked rows ARE stages members (built from the walk above) —
    // splice by identity, no guard.
    stages.splice(stages.indexOf(row), 1);
  }
  // id from the doc's own coordinates (rev + count) — no global RNG
  // dependency; unique per append by construction (rev advances).
  const gid: string =
    "g_r" + String(loaded.block.rev) + "c" + String(picked.length) + "_" + String(stages.length);
  const compound: Record<string, unknown> = {
    id: gid,
    card: "group",
    children: picked,
  };
  stages.splice(Math.min(firstIndex, stages.length), 0, compound);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "group",
    stage: gid,
    summary: "group " + String(ids.length) + " stages",
    inverse: { stage: gid, index: firstIndex, children: picked },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: gid };
}

const UNGROUP_KEYS = ["stage", "expect_rev", "author"];

/** ungroup — the compound's door: spill the children back at the
 *  compound's index, in their stored order. */
export async function ungroupBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchStageRow> {
  refuseUnknown(body, UNGROUP_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") {
    throw new RemoteError("bench/bad-body", "stage is required", {});
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  const idx: number = stages.findIndex(
    (s: Record<string, unknown>): boolean => s["id"] === stageId,
  );
  if (idx < 0 || stages[idx]!["card"] !== "group") {
    throw new RemoteError(
      "bench/stage-not-found",
      "ungroup: no group stage " + stageId,
      { session, stage: stageId },
    );
  }
  const compound = stages[idx]!;
  const children: unknown = compound["children"];
  const rows: Record<string, unknown>[] = Array.isArray(children)
    ? (children as Record<string, unknown>[])
    : [];
  stages.splice(idx, 1);
  stages.splice(Math.min(idx, stages.length), 0, ...rows);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "ungroup",
    stage: stageId,
    summary: "ungroup " + String(rows.length) + " stages",
    inverse: { row: compound, index: idx },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}

/** remove_stage — splice one stage out (the inverse carries row +
 *  index for undo). */
export async function removeStageBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchStageRow> {
  refuseUnknown(body, REMOVE_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") {
    throw new RemoteError("bench/bad-body", "stage is required", {});
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  const idx: number = stages.findIndex(
    (s: Record<string, unknown>): boolean => s["id"] === stageId,
  );
  if (idx < 0) {
    throw new RemoteError(
      "bench/stage-not-found",
      "stage not found: " + stageId,
      { session, stage: stageId },
    );
  }
  const row: Record<string, unknown> = stages[idx];
  stages.splice(idx, 1);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "remove_stage",
    stage: stageId,
    summary: "remove " + String(row["card"] ?? stageId),
    inverse: { stage: stageId, row, index: idx },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}

const REWIRE_KEYS = ["stage", "input", "from", "expect_rev", "author"];

/** The rewire row. */
export interface BenchRewireRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly stage: string;
  readonly input: string;
}

/** rewire — set or clear one input binding. from:
 *  {stage, output} | {initial: "image"} | absent → clear. */
export async function rewireBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchRewireRow> {
  refuseUnknown(body, REWIRE_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const stageId: unknown = body["stage"];
  const input: unknown = body["input"];
  if (typeof stageId !== "string" || typeof input !== "string") {
    throw new RemoteError(
      "bench/bad-body",
      "stage and input are required",
      {},
    );
  }
  const st: Record<string, unknown> | null = stageRow(loaded.doc, stageId);
  if (st === null) {
    throw new RemoteError(
      "bench/stage-not-found",
      "stage not found: " + stageId,
      { session, stage: stageId },
    );
  }
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const from: unknown = body["from"];
  if (from !== undefined && !isRecord(from)) {
    throw new RemoteError(
      "bench/bad-body",
      "from must be {stage,output} | {initial} | absent",
      {},
    );
  }
  const inputs: Record<string, unknown> = isRecord(st["inputs"])
    ? (st["inputs"] as Record<string, unknown>)
    : {};
  const before: unknown = Object.prototype.hasOwnProperty.call(inputs, input)
    ? inputs[input]
    : undefined;
  if (from === undefined) delete inputs[input];
  else inputs[input] = from;
  st["inputs"] = inputs;
  const inverse: Record<string, unknown> = { stage: stageId, input };
  if (before !== undefined) inverse["before"] = before;
  else inverse["added"] = true;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "rewire",
    stage: stageId,
    summary: "wire " + input,
    inverse,
  });
  return {
    draft_id: loaded.draftId,
    session,
    rev: newRev,
    stage: stageId,
    input,
  };
}

const UNDO_KEYS = ["n", "author", "expect_rev"];

/** The undo row: the undone revs + the stages as they stand. */
export interface BenchUndoRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly undone: readonly number[];
  readonly stages: unknown;
}

/** undo — walk the log tail, skip already-reverted entries and
 *  entries the author filter excludes, apply inverses
 *  newest-first, append ONE undo entry carrying the pre-undo
 *  snapshot. Undo entries are NEVER candidates — a plain undo
 *  walks ACTIONS (targeting them would ping-pong). */
export async function undoBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchUndoRow> {
  refuseUnknown(body, UNDO_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  if (body["expect_rev"] !== undefined) {
    casCheck(loaded.block, body["expect_rev"], session);
  }
  const n: number =
    typeof body["n"] === "number" &&
    Number.isInteger(body["n"]) &&
    body["n"] > 0
      ? body["n"]
      : 1;
  const filter: Author | null = authorOk(body["author"])
    ? (body["author"] as Author)
    : null;

  // The already-reverted set (union of every undo entry's reverted).
  const revertedSet: Set<number> = new Set();
  for (const e of loaded.block.log) {
    if (e.kind === "undo" && Array.isArray(e.reverted)) {
      for (const r of e.reverted) revertedSet.add(r);
    }
  }
  const targets: BenchEntry[] = [];
  for (
    let i = loaded.block.log.length - 1;
    i >= 0 && targets.length < n;
    i--
  ) {
    const e: BenchEntry = loaded.block.log[i];
    if (e.kind === "undo") continue;
    if (revertedSet.has(e.rev)) continue;
    if (filter !== null && e.author !== filter) continue;
    targets.push(e);
  }
  if (targets.length === 0) {
    throw new RemoteError(
      "bench/nothing-to-undo",
      "nothing to undo" + (filter !== null ? " (author " + filter + ")" : ""),
      {},
    );
  }
  const stagesBefore: Record<string, unknown>[] = stagesOf(loaded.doc);
  for (const e of targets) applyInverse(loaded.doc, e);
  const undone: number[] = targets
    .map((e: BenchEntry): number => e.rev)
    .sort((a: number, b: number): number => a - b);
  const newRev: number = await appendAndSave(drafts, loaded, {
    author: filter === "user" ? "user" : "agent",
    kind: "undo",
    summary: "undo r" + undone.join(",r"),
    inverse: { stages_before: stagesBefore },
    reverted: undone,
  });
  return {
    draft_id: loaded.draftId,
    session,
    rev: newRev,
    undone,
    stages: loaded.doc["stages"],
  };
}

/** Apply one entry's inverse payload to the doc (best-effort per
 *  entry; a stage an undo already removed is skipped loudly-free —
 *  the snapshot entries carry the coarse fallback). */
function applyInverse(
  doc: Record<string, unknown>,
  e: BenchEntry,
): void {
  const inv: Record<string, unknown> = isRecord(e.inverse)
    ? e.inverse
    : {};
  const stages: Record<string, unknown>[] = stagesOf(doc);
  if (e.kind === "patch") {
    const st: Record<string, unknown> | null = stageRow(
      doc,
      String(inv["stage"] ?? e.stage ?? ""),
    );
    if (st === null) return;
    const cur: Record<string, unknown> = isRecord(st["params"])
      ? (st["params"] as Record<string, unknown>)
      : {};
    const before: Record<string, unknown> = isRecord(inv["params_before"])
      ? (inv["params_before"] as Record<string, unknown>)
      : {};
    for (const k of Object.keys(before)) cur[k] = before[k];
    const added: unknown = inv["params_added"];
    if (Array.isArray(added)) {
      for (const k of added) delete cur[k];
    }
    st["params"] = cur;
    return;
  }
  if (e.kind === "add_stage") {
    const idx: number = stages.findIndex(
      (s: Record<string, unknown>): boolean => s["id"] === inv["stage"],
    );
    if (idx >= 0) stages.splice(idx, 1);
    doc["stages"] = stages;
    return;
  }
  if (e.kind === "remove_stage") {
    const row: unknown = inv["row"];
    const idx: number =
      typeof inv["index"] === "number" ? inv["index"] : stages.length;
    if (isRecord(row)) stages.splice(Math.min(idx, stages.length), 0, row);
    doc["stages"] = stages;
    return;
  }
  if (e.kind === "group") {
    // undo(group) = ungroup: drop the compound row, spill children at
    // its index (bench order preserved inside the row).
    const idx: number = stages.findIndex(
      (s: Record<string, unknown>): boolean => s["id"] === inv["stage"],
    );
    const children: unknown = inv["children"];
    const rows: Record<string, unknown>[] = Array.isArray(children)
      ? (children as Record<string, unknown>[])
      : [];
    if (idx >= 0) {
      stages.splice(idx, 1);
      stages.splice(Math.min(idx, stages.length), 0, ...rows);
      doc["stages"] = stages;
    }
    return;
  }
  if (e.kind === "ungroup") {
    // undo(ungroup) = re-group: splice the children back out, insert
    // the compound row at the recorded index.
    const row: unknown = inv["row"];
    if (!isRecord(row)) return;
    const children: unknown = row["children"];
    if (Array.isArray(children)) {
      for (const child of children as Record<string, unknown>[]) {
        const idx: number = stages.findIndex(
          (s: Record<string, unknown>): boolean => s["id"] === child["id"],
        );
        if (idx >= 0) stages.splice(idx, 1);
      }
    }
    const back: number =
      typeof inv["index"] === "number"
        ? Math.min(inv["index"], stages.length)
        : stages.length;
    stages.splice(back, 0, row);
    doc["stages"] = stages;
    return;
  }
  if (e.kind === "reorder") {
    // the inverse of a move is the move back: splice out at the CURRENT
    // (post-move) position, reinsert at the ORIGINAL index (clamped).
    const idx: number = stages.findIndex(
      (s: Record<string, unknown>): boolean => s["id"] === inv["stage"],
    );
    if (idx >= 0) {
      const [row] = stages.splice(idx, 1);
      const back: number =
        typeof inv["from"] === "number"
          ? Math.min(inv["from"], stages.length)
          : stages.length;
      stages.splice(back, 0, row);
      doc["stages"] = stages;
    }
    return;
  }
  if (e.kind === "rewire") {
    const st: Record<string, unknown> | null = stageRow(
      doc,
      String(inv["stage"] ?? ""),
    );
    if (st === null) return;
    const inputs: Record<string, unknown> = isRecord(st["inputs"])
      ? (st["inputs"] as Record<string, unknown>)
      : {};
    const input: string = String(inv["input"] ?? "");
    if (inv["added"] === true) delete inputs[input];
    else if ("before" in inv) inputs[input] = inv["before"];
    st["inputs"] = inputs;
    return;
  }
  // load: the coarse fallback — restore the snapshot. (Undo entries
  // are never walk candidates — the skip at the top guarantees it —
  // so no "undo" disjunct here.)
  const snapshot: unknown =
    e.kind === "load" ? inv["stages_before"] : undefined;
  if (Array.isArray(snapshot)) doc["stages"] = snapshot;
}

// ── THE CHANGE EVENTS (the push source, 2026-09-12) ────────────────
// Every bench verb funnels through this module's writers; each
// successful write notifies. The stream remote (BenchRemoteService's
// bench/subscribe) rides these to PUSH fresh docs; the browser's
// resource provider consumes rev drift until the host's stream face
// lands (the collapse plan). One seam, every writer visible.

type BenchChangeListener = (session: string) => void;
const benchChangeListeners = new Set<BenchChangeListener>();

/** Subscribe to bench writes; returns the unsubscribe. */
export function onBenchChange(fn: BenchChangeListener): () => void {
  benchChangeListeners.add(fn);
  return () => {
    benchChangeListeners.delete(fn);
  };
}

/** Fire the write event — the remote layer calls this after every
 *  successful bench write (the door seam: every in-process and
 *  host-routed write crosses the remote arms). */
export function notifyBenchChange(session: string): void {
  for (const fn of benchChangeListeners) {
    try {
      fn(session);
    } catch {
      /* a listener's fault never breaks the write */
    }
  }
}

/** The public notify (the drafts-patch door writes bench docs from
 *  remote.ts — outside this module; it fires this with the session
 *  parsed from the bench-shaped draft id). */
export function notifyBenchDocWrite(draftId: string): void {
  const m = /^bench-([A-Za-z0-9_-]{1,64})$/.exec(draftId);
  if (m !== null) notifyBenchChange(m[1]!);
}
