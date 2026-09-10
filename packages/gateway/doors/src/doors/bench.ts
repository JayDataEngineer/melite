// bench.ts — THE BENCH DOOR (the bench rework, 2026-09-10).
//
// One working flow per session — the shared state both authors edit
// (AI tool writes, tab drilldown writes), per the proposal of record
// (docs/plans/bench-rework-2026-09-10.md §3). The bench doc IS a
// draft doc (same domain, same table, id "bench-<session>") plus a
// `bench` block: { rev, log } — the append-only revision log both
// authors walk. Never minted per call; the id derives from the
// session key. The plain drafts doors stay untouched (py-parity
// law); the bench is NEW surface in its own door file.
//
// Endpoints (ROUTES rows in core/routes.ts, group "Bench"):
//   POST /v1/bench/ensure                 (_h_bench_ensure, strict)
//   GET  /v1/bench/:session               (_h_bench_get, regex)
//   POST /v1/bench/:session/patch         (_h_bench_patch, strict)
//   POST /v1/bench/:session/add_stage     (_h_bench_add_stage, strict)
//   POST /v1/bench/:session/remove_stage  (_h_bench_remove_stage, strict)
//   POST /v1/bench/:session/rewire        (_h_bench_rewire, strict)
//   POST /v1/bench/:session/undo          (_h_bench_undo, strict)
//
// Laws carried here:
//   CAS — every mutation takes expect_rev; a moved bench refuses
//   loud (409 with current_rev), never merges silently.
//   APPEND-ONLY LOG — undo appends a revert entry carrying inverse
//   payloads; the doc never rewrites history.
//   AUTHORSHIP — every entry carries author ("agent"|"user"); undo
//   can filter by author ("keep mine, drop the model's").
//   WIRING — stage inputs ride the runner's convention (inputs:
//   {name: {stage, output} | {initial}}, flowsRun.ts inputNames).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { GatewayRequest, DispatchResult, Domain, DraftRecord, DraftsDomainSpec } from "@melite/gateway-core";
import { PyNum, getDraftsDomain, isRecord } from "@melite/gateway-core";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";

/** Dispatcher answer — structural twin of the drafts door's. */
interface BenchResult {
  readonly status: number;
  readonly body: string;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

const JSON_CT = "application/json";
const BENCH_HANDLERS = [
  "_h_bench_ensure",
  "_h_bench_get",
  "_h_bench_patch",
  "_h_bench_add_stage",
  "_h_bench_remove_stage",
  "_h_bench_rewire",
  "_h_bench_undo",
] as const;

// ── gates ──────────────────────────────────────────────────────

/** Session key gate: same charset family as draft ids, capped so
 * "bench-" + session always clears draftIdOk's 96-char ceiling. */
function sessionOk(session: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(session);
}

function benchIdOf(session: string): string {
  return "bench-" + session;
}

const AUTHORS = ["agent", "user"] as const;
type Author = (typeof AUTHORS)[number];

function authorOk(v: unknown): v is Author {
  return v === "agent" || v === "user";
}

// ── strict bodies ──────────────────────────────────────────────

/** Strict-parse raw bytes; "" decodes as {} (the doors' contract).
 *  Bad JSON answers the house 400 shape. */
function parseBody(
  rawBody: Uint8Array,
): { doc: Record<string, unknown> } | BenchResult {
  if (rawBody.length === 0) return { doc: {} };
  const text = new TextDecoder().decode(rawBody);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return refused(400, {
      error: "bad JSON body: " + (err as Error).message,
    });
  }
  if (!isRecord(parsed)) {
    return refused(400, { error: "body must be a JSON object" });
  }
  return { doc: parsed };
}

function refuseUnknown(
  doc: Record<string, unknown>,
  allowed: readonly string[],
): BenchResult | null {
  const unknown: string[] = Object.keys(doc).filter(
    (k: string): boolean => !allowed.includes(k),
  );
  if (unknown.length === 0) return null;
  return refused(400, {
    error:
      "unknown bench key(s): " + unknown.sort().join(", ") +
      " (want " + allowed.join(", ") + ")",
  });
}

function refused(status: number, payload: Record<string, unknown>): BenchResult {
  return {
    status,
    body: JSON.stringify(payload),
    contentType: JSON_CT,
    headers: {},
  };
}

function answered(payload: Record<string, unknown>): BenchResult {
  return {
    status: 200,
    body: JSON.stringify(payload),
    contentType: JSON_CT,
    headers: {},
  };
}

// ── bench block ────────────────────────────────────────────────

interface BenchEntry {
  /** Filled by appendAndSave (rev/at are the door's, not the caller's). */
  rev: number;
  at: number;
  author: Author;
  kind: "patch" | "add_stage" | "remove_stage" | "rewire" | "load" | "undo";
  stage?: string;
  summary?: string;
  /** Kind-specific inverse payload (undo applies it). */
  inverse?: Record<string, unknown>;
  /** Filled on undo entries: the revs this entry reverted. */
  reverted?: number[];
}

interface BenchBlock {
  rev: number;
  log: BenchEntry[];
}

function benchBlockOf(doc: Record<string, unknown>): BenchBlock {
  const raw: unknown = doc["bench"];
  if (isRecord(raw) && typeof raw["rev"] === "number" && Array.isArray(raw["log"])) {
    return { rev: raw["rev"], log: raw["log"] as BenchEntry[] };
  }
  return { rev: 0, log: [] };
}

/** CAS check + refusal in one voice. */
function casRefusal(block: BenchBlock, expect: unknown): BenchResult | null {
  if (typeof expect !== "number") {
    return refused(400, { error: "expect_rev is required (the CAS law)" });
  }
  if (expect !== block.rev) {
    return refused(409, {
      error: "bench moved: rev is " + block.rev + ", caller held " + expect,
      current_rev: block.rev,
      expect_rev: expect,
    });
  }
  return null;
}

/** What callers compose; the door stamps rev/at (appendAndSave). */
type BenchEntryInput = Omit<BenchEntry, "rev" | "at">;

/** Append one entry + persist; returns the persist promise. */
function appendAndSave(
  drafts: Domain<DraftsDomainSpec>,
  draftId: string,
  doc: Record<string, unknown>,
  block: BenchBlock,
  entry: BenchEntryInput,
): Promise<BenchResult> {
  const full: BenchEntry = {
    ...entry,
    rev: block.rev + 1,
    at: Math.floor(Date.now() / 1000),
  };
  block.rev = full.rev;
  block.log.push(full);
  doc["bench"] = block as unknown as Record<string, unknown>;
  return drafts
    .table("docs")
    .put(draftId, {
      updated_at: Math.floor(Date.now() / 1000),
      doc: doc as unknown as DraftRecord["doc"],
    })
    .then(
      (): BenchResult => answered({ draft_id: draftId, rev: block.rev }),
      (): BenchResult => refused(500, { error: "cannot persist bench" }),
    );
}

function stageRow(
  doc: Record<string, unknown>,
  stageId: string,
): Record<string, unknown> | null {
  const stages: unknown = doc["stages"];
  if (!Array.isArray(stages)) return null;
  for (const st of stages) {
    if (isRecord(st) && st["id"] === stageId) {
      return st as Record<string, unknown>;
    }
  }
  return null;
}

function stagesOf(doc: Record<string, unknown>): Record<string, unknown>[] {
  const stages: unknown = doc["stages"];
  if (!Array.isArray(stages)) return [];
  return stages.filter((s: unknown): boolean => isRecord(s)) as Record<string, unknown>[];
}

// ── ensure ─────────────────────────────────────────────────────
// POST /v1/bench/ensure — create the bench (birth: rev 0, empty
// log) or LOAD onto it (replace stages, snapshot inverse). This is
// the only arm that may create; everything else refuses a missing
// bench (the tab and the tool both ensure first).

const ENSURE_KEYS = ["session", "stages", "intent", "author", "expect_rev"];

export async function hBenchEnsure(
  drafts: Domain<DraftsDomainSpec>,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const doc0: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(doc0, ENSURE_KEYS);
  if (unk !== null) return unk;
  const session: unknown = doc0["session"];
  if (typeof session !== "string" || !sessionOk(session)) {
    return refused(400, { error: "bad session key (want [A-Za-z0-9_-]{1,64})" });
  }
  const draftId: string = benchIdOf(session);
  const author: Author = authorOk(doc0["author"]) ? (doc0["author"] as Author) : "agent";
  const rec: DraftRecord | undefined = drafts.table("docs").get(draftId);

  if (rec === undefined) {
    // Birth: a draft doc with the bench block bolted on.
    const stagesIn: unknown = Array.isArray(doc0["stages"]) ? doc0["stages"] : [];
    const doc: Record<string, unknown> = {
      draft_id: draftId,
      intent: typeof doc0["intent"] === "string" ? doc0["intent"] : "bench",
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
    return answered({
      draft_id: draftId,
      session,
      rev: 0,
      intent: doc["intent"],
      stages: doc["stages"],
      created: true,
    });
  }

  // Existing bench: load semantics (stages replace, snapshot inverse).
  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  const block: BenchBlock = benchBlockOf(doc);
  if (doc0["stages"] === undefined) {
    return answered({
      draft_id: draftId,
      session,
      rev: block.rev,
      intent: doc["intent"],
      stages: doc["stages"],
      created: false,
    });
  }
  const cas = casRefusal(block, doc0["expect_rev"]);
  if (cas !== null) return cas;
  const before: Record<string, unknown>[] = stagesOf(doc);
  doc["stages"] = normalizeStages(doc0["stages"], author);
  if (typeof doc0["intent"] === "string") doc["intent"] = doc0["intent"];
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author,
    kind: "load",
    summary: "load " + stagesOf(doc).length + " stages",
    inverse: { stages_before: before },
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({
    draft_id: draftId,
    session,
    rev: block.rev,
    intent: doc["intent"],
    stages: doc["stages"],
    created: false,
  });
}

/** Birth defaults per the composer's law (id, inputs, provenance)
 *  with the runner's object inputs (flowsRun inputNames). */
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
      row["id"] = typeof src["id"] === "string" ? src["id"] : "s_" + idx;
      for (const k of Object.keys(src)) row[k] = src[k];
      if (typeof row["engine"] !== "string" || row["engine"] === "") row["engine"] = "comfyui";
      if (!isRecord(row["inputs"])) row["inputs"] = {};
      if (!isRecord(row["params"])) row["params"] = {};
      if (!isRecord(row["outputs"])) row["outputs"] = { default: "image" };
      if (row["provenance"] !== "user") row["provenance"] = author;
      return row;
    });
}

// ── get ────────────────────────────────────────────────────────
// GET /v1/bench/:session — structured read: stages + log HEADS
// (rev/author/kind/stage/summary only — inverses never leave the
// door; the wire stays lean for reads).

export function hBenchGet(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
): BenchResult {
  if (!sessionOk(session)) return refused(400, { error: "bad session key" });
  const draftId: string = benchIdOf(session);
  const rec: DraftRecord | undefined = drafts.table("docs").get(draftId);
  if (rec === undefined) return refused(404, { error: "no such bench" });
  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  const block: BenchBlock = benchBlockOf(doc);
  return answered({
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
  });
}

// ── patch ──────────────────────────────────────────────────────
// POST /v1/bench/:session/patch — params merge (the drafts door's
// stage-patch semantics) with CAS + log. result/runStatus ride too
// (run-status writes from the tab land here, authored "user").

const PATCH_KEYS = ["stage", "params", "result", "runStatus", "expect_rev", "author"];

async function hBenchPatch(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const body: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(body, PATCH_KEYS);
  if (unk !== null) return unk;
  const load = loadBench(drafts, session);
  if (load.err !== null) return load.err;
  const { draftId, doc, block } = load;
  const cas = casRefusal(block, body["expect_rev"]);
  if (cas !== null) return cas;
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") {
    return refused(400, { error: "stage is required" });
  }
  const st: Record<string, unknown> | null = stageRow(doc, stageId);
  if (st === null) return refused(404, { error: "stage not found: " + stageId });
  const author: Author = authorOk(body["author"]) ? (body["author"] as Author) : "agent";

  const before: Record<string, unknown> = {};
  const added: string[] = [];
  const paramsIn: unknown = body["params"];
  if (paramsIn !== undefined) {
    if (!isRecord(paramsIn)) return refused(400, { error: "params must be an object" });
    const cur: Record<string, unknown> = isRecord(st["params"])
      ? (st["params"] as Record<string, unknown>)
      : {};
    for (const k of Object.keys(paramsIn)) {
      if (Object.prototype.hasOwnProperty.call(cur, k)) before[k] = cur[k];
      else added.push(k);
      cur[k] = (paramsIn as Record<string, unknown>)[k];
    }
    st["params"] = cur;
  }
  let touched = 0;
  if ("result" in body) { st["result"] = body["result"]; touched++; }
  if ("runStatus" in body) { st["runStatus"] = body["runStatus"]; touched++; }
  if (paramsIn === undefined && touched === 0) {
    return refused(400, { error: "nothing to patch (params|result|runStatus)" });
  }
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author,
    kind: "patch",
    stage: stageId,
    summary: "patch " + (paramsIn !== undefined ? Object.keys(paramsIn).sort().join(",") : "status"),
    inverse: { stage: stageId, params_before: before, params_added: added },
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({
    draft_id: draftId,
    session,
    rev: block.rev,
    stage: stageId,
    patched: paramsIn !== undefined ? Object.keys(paramsIn).sort() : [],
  });
}

// ── add_stage ──────────────────────────────────────────────────
// POST /v1/bench/:session/add_stage — append a card stage with
// optional wiring. The row carries the runner's input convention.

const ADD_KEYS = ["id", "card", "engine", "params", "inputs", "outputs", "expected", "expect_rev", "author"];

async function hBenchAddStage(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const body: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(body, ADD_KEYS);
  if (unk !== null) return unk;
  const load = loadBench(drafts, session);
  if (load.err !== null) return load.err;
  const { draftId, doc, block } = load;
  const cas = casRefusal(block, body["expect_rev"]);
  if (cas !== null) return cas;
  const card: unknown = body["card"];
  if (typeof card !== "string" || card === "") {
    return refused(400, { error: "card is required" });
  }
  const author: Author = authorOk(body["author"]) ? (body["author"] as Author) : "agent";
  const stages: Record<string, unknown>[] = stagesOf(doc);
  const stageId: string =
    typeof body["id"] === "string" && body["id"] !== ""
      ? body["id"]
      : "s_" + stages.length;
  if (stageRow(doc, stageId) !== null) {
    return refused(409, { error: "stage id already on the bench: " + stageId });
  }
  const row: Record<string, unknown> = {
    id: stageId,
    card,
    // The runner's engine id (flow_inline contract); comfyui is the
    // only served engine today.
    engine: typeof body["engine"] === "string" && body["engine"] !== "" ? body["engine"] : "comfyui",
    params: isRecord(body["params"]) ? body["params"] : {},
    inputs: isRecord(body["inputs"]) ? body["inputs"] : {},
    outputs: isRecord(body["outputs"]) ? body["outputs"] : { default: "image" },
    provenance: author,
  };
  if (isRecord(body["expected"])) row["expected"] = body["expected"];
  stages.push(row);
  doc["stages"] = stages;
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author,
    kind: "add_stage",
    stage: stageId,
    summary: "add " + card,
    inverse: { stage: stageId },
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({ draft_id: draftId, session, rev: block.rev, stage: stageId });
}

// ── remove_stage ───────────────────────────────────────────────

const REMOVE_KEYS = ["stage", "expect_rev", "author"];

async function hBenchRemoveStage(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const body: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(body, REMOVE_KEYS);
  if (unk !== null) return unk;
  const load = loadBench(drafts, session);
  if (load.err !== null) return load.err;
  const { draftId, doc, block } = load;
  const cas = casRefusal(block, body["expect_rev"]);
  if (cas !== null) return cas;
  const stageId: unknown = body["stage"];
  if (typeof stageId !== "string") return refused(400, { error: "stage is required" });
  const author: Author = authorOk(body["author"]) ? (body["author"] as Author) : "agent";
  const stages: Record<string, unknown>[] = stagesOf(doc);
  const idx: number = stages.findIndex(
    (s: Record<string, unknown>): boolean => s["id"] === stageId,
  );
  if (idx < 0) return refused(404, { error: "stage not found: " + stageId });
  const row: Record<string, unknown> = stages[idx];
  stages.splice(idx, 1);
  doc["stages"] = stages;
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author,
    kind: "remove_stage",
    stage: stageId,
    summary: "remove " + String(row["card"] ?? stageId),
    inverse: { stage: stageId, row, index: idx },
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({ draft_id: draftId, session, rev: block.rev, stage: stageId });
}

// ── rewire ─────────────────────────────────────────────────────
// POST /v1/bench/:session/rewire — set or clear one input binding.
// from: {stage, output} | {initial: "image"} | absent → clear.

const REWIRE_KEYS = ["stage", "input", "from", "expect_rev", "author"];

async function hBenchRewire(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const body: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(body, REWIRE_KEYS);
  if (unk !== null) return unk;
  const load = loadBench(drafts, session);
  if (load.err !== null) return load.err;
  const { draftId, doc, block } = load;
  const cas = casRefusal(block, body["expect_rev"]);
  if (cas !== null) return cas;
  const stageId: unknown = body["stage"];
  const input: unknown = body["input"];
  if (typeof stageId !== "string" || typeof input !== "string") {
    return refused(400, { error: "stage and input are required" });
  }
  const st: Record<string, unknown> | null = stageRow(doc, stageId);
  if (st === null) return refused(404, { error: "stage not found: " + stageId });
  const author: Author = authorOk(body["author"]) ? (body["author"] as Author) : "agent";
  const from: unknown = body["from"];
  if (from !== undefined && !isRecord(from)) {
    return refused(400, { error: "from must be {stage,output} | {initial} | absent" });
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
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author,
    kind: "rewire",
    stage: stageId,
    summary: "wire " + input,
    inverse,
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({ draft_id: draftId, session, rev: block.rev, stage: stageId, input });
}

// ── undo ───────────────────────────────────────────────────────
// POST /v1/bench/:session/undo — walk the log tail, skip entries
// already reverted (any undo entry's `reverted` set) and entries
// the author filter excludes, apply inverses newest-first, append
// ONE undo entry carrying the pre-undo snapshot.

const UNDO_KEYS = ["n", "author", "expect_rev"];

async function hBenchUndo(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  rawBody: Uint8Array,
): Promise<BenchResult> {
  const parsed = parseBody(rawBody);
  if ("status" in parsed && "body" in parsed) return parsed as BenchResult;
  const body: Record<string, unknown> = (parsed as { doc: Record<string, unknown> }).doc;
  const unk = refuseUnknown(body, UNDO_KEYS);
  if (unk !== null) return unk;
  const load = loadBench(drafts, session);
  if (load.err !== null) return load.err;
  const { draftId, doc, block } = load;
  if (body["expect_rev"] !== undefined) {
    const cas = casRefusal(block, body["expect_rev"]);
    if (cas !== null) return cas;
  }
  const n: number =
    typeof body["n"] === "number" && Number.isInteger(body["n"]) && body["n"] > 0
      ? body["n"]
      : 1;
  const filter: Author | null = authorOk(body["author"]) ? (body["author"] as Author) : null;

  // The already-reverted set (union of every undo entry's reverted).
  const revertedSet: Set<number> = new Set();
  for (const e of block.log) {
    if (e.kind === "undo" && Array.isArray(e.reverted)) {
      for (const r of e.reverted) revertedSet.add(r);
    }
  }
  // Candidates: tail-first, live, author-matching. Undo entries
  // are NEVER candidates — a plain undo walks ACTIONS (their
  // effect is the reversal; targeting them would ping-pong).
  const targets: BenchEntry[] = [];
  for (let i = block.log.length - 1; i >= 0 && targets.length < n; i--) {
    const e: BenchEntry = block.log[i];
    if (e.kind === "undo") continue;
    if (revertedSet.has(e.rev)) continue;
    if (filter !== null && e.author !== filter) continue;
    targets.push(e);
  }
  if (targets.length === 0) {
    return refused(409, { error: "nothing to undo" + (filter !== null ? " (author " + filter + ")" : "") });
  }
  const stagesBefore: Record<string, unknown>[] = stagesOf(doc);
  // Apply inverses newest-first.
  for (const e of targets) applyInverse(doc, e);
  const undone: number[] = targets.map((e: BenchEntry): number => e.rev).sort((a: number, b: number): number => a - b);
  const save: Promise<BenchResult> = appendAndSave(drafts, draftId, doc, block, {
    author: filter === "user" ? "user" : "agent",
    kind: "undo",
    summary: "undo r" + undone.join(",r"),
    inverse: { stages_before: stagesBefore },
    reverted: undone,
  });
  const out: BenchResult = await save;
  if (out.status !== 200) return out;
  return answered({
    draft_id: draftId,
    session,
    rev: block.rev,
    undone,
    stages: doc["stages"],
  });
}

/** Apply one entry's inverse payload to the doc (best-effort per
 *  entry; a stage an undo already removed is skipped loudly-free —
 *  the snapshot entries carry the coarse fallback). */
function applyInverse(doc: Record<string, unknown>, e: BenchEntry): void {
  const inv: Record<string, unknown> = isRecord(e.inverse) ? e.inverse : {};
  const stages: Record<string, unknown>[] = stagesOf(doc);
  if (e.kind === "patch") {
    const st: Record<string, unknown> | null = stageRow(doc, String(inv["stage"] ?? e.stage ?? ""));
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
    const idx: number = typeof inv["index"] === "number" ? inv["index"] : stages.length;
    if (isRecord(row)) stages.splice(Math.min(idx, stages.length), 0, row);
    doc["stages"] = stages;
    return;
  }
  if (e.kind === "rewire") {
    const st: Record<string, unknown> | null = stageRow(doc, String(inv["stage"] ?? ""));
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
  // load / undo — the coarse snapshot.
  const snap: unknown = inv["stages_before"];
  if (Array.isArray(snap)) doc["stages"] = snap;
}

// ── loader ─────────────────────────────────────────────────────

function loadBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
): { err: BenchResult | null; draftId: string; doc: Record<string, unknown>; block: BenchBlock } {
  if (!sessionOk(session)) {
    return {
      err: refused(400, { error: "bad session key" }),
      draftId: "",
      doc: {},
      block: { rev: 0, log: [] },
    };
  }
  const draftId: string = benchIdOf(session);
  const rec: DraftRecord | undefined = drafts.table("docs").get(draftId);
  if (rec === undefined) {
    return {
      err: refused(404, { error: "no such bench — ensure first" }),
      draftId,
      doc: {},
      block: { rev: 0, log: [] },
    };
  }
  const doc: Record<string, unknown> = rec.doc as unknown as Record<string, unknown>;
  return { err: null, draftId, doc, block: benchBlockOf(doc) };
}

// ── dispatch + plugin ──────────────────────────────────────────

async function dispatchBench(
  handler: string,
  m: RegExpExecArray | null,
  rawBody: Uint8Array,
  ctx: Context,
): Promise<BenchResult | null> {
  const drafts: Domain<DraftsDomainSpec> = await getDraftsDomain(ctx);
  if (handler === "_h_bench_ensure") return hBenchEnsure(drafts, rawBody);
  const session: string = (m?.[1] as string) ?? "";
  if (handler === "_h_bench_get") return hBenchGet(drafts, session);
  if (handler === "_h_bench_patch") return hBenchPatch(drafts, session, rawBody);
  if (handler === "_h_bench_add_stage") return hBenchAddStage(drafts, session, rawBody);
  if (handler === "_h_bench_remove_stage") return hBenchRemoveStage(drafts, session, rawBody);
  if (handler === "_h_bench_rewire") return hBenchRewire(drafts, session, rawBody);
  if (handler === "_h_bench_undo") return hBenchUndo(drafts, session, rawBody);
  return null;
}

/** The bench doors as a self-registering plugin — same shape as
 *  draftsDoors (mountDoorRoutes + doorMatch; no injected services
 *  beyond the door trio). */
export const benchDoors: Plugin = {
  name: "gateway-bench",
  inject: ["gatewayError", "webServer", "storageDomain"],
  apply(ctx: Context): void {
    mountDoorRoutes(
      ctx,
      ctx.webServer,
      [...BENCH_HANDLERS],
      (req: GatewayRequest): DispatchResult | undefined | Promise<DispatchResult | undefined> => {
        const hit = doorMatch(req, [...BENCH_HANDLERS]);
        if (hit === null) return undefined;
        return dispatchBench(hit.row.handler, hit.m, req.body, ctx).then(
          (out: BenchResult | null): DispatchResult | undefined =>
            out === null
              ? undefined
              : {
                  status: out.status,
                  body: out.body,
                  contentType: out.contentType,
                  headers: out.headers,
                },
          (): DispatchResult => ({
            status: 500,
            body: JSON.stringify({ error: "bench door failure" }),
            contentType: JSON_CT,
            headers: {},
          }),
        );
      },
    );
  },
};

// PyNum stays referenced for the domain's number-literal law (the
// drafts domain carries PyNum leaves; the bench block's ints are
// plain JSON numbers).
void PyNum;
