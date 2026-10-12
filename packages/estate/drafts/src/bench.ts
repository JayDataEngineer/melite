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
import { unwrapItemArrays } from '@melite/comfyui-card-kit'
import { benchDraftIdOf, BIRTH_STRIP_KEYS, LOAD_CARRY_KEYS, normalizeBenchStage, SELF_NAMED_FAMILIES, stripKeys } from '@melite/contracts/benchStage'
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftRecord, DraftsDomainSpec } from "./spec.js";
import type { JsonValue } from "./remote.js";
import { trailDedupe } from "./trail.js";

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
    /** THE LANE REFUSAL (2026-10-10, the YOU_ARE_A_LIAR fix shape 3):
     *  the DECL's own words — the lane's declared surface + relation
     *  words — refused the state at write time, in the field's voice,
     *  with the cure in the message. Declared here so typed clients
     *  and codecs carry the shape (the door audit's MEDIUM-5: the
     *  code shipped undeclared and the runtime only agreed by luck). */
    "bench/lane-refusal": {
      readonly card: string;
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
    /** The anchored reorder's target is gone (the F1-residue cure,
     *  round 25): the id the drop named as its anchor is not on the
     *  CURRENT list — a second author removed it between the press
     *  and the apply. The honest re-ask, never a silent fallback to
     *  the stale numeric slot. */
    "bench/anchor-gone": {
      readonly session: string;
      readonly anchor: string;
    };
    /** A wiring input whose binding is neither {stage, output} nor
     *  {initial} — the run maps only those two shapes (silent drop
     *  before the 2026-09-15 wiring admission). */
    "bench/bad-wire": {
      readonly session: string;
      readonly stage: string;
      readonly input: string;
    };
    /** A stage wired to itself — a cycle composes nothing. */
    "bench/self-wire": {
      readonly session: string;
      readonly stage: string;
      readonly input: string;
    };
    /** A wiring input pointing at a stage id not on the bench (the
     *  phantom-upstream cure: 'stage-1' never existed; the mint
     *  mints s_N). */
    "bench/wire-stage-not-found": {
      readonly session: string;
      readonly stage: string;
      readonly input: string;
      readonly live: readonly string[];
    };
    /** A WIRED MEMBER CANNOT BE GROUPED (2026-10-10, the bench
     *  audit's gap 6): the run's wiring walk reads the flat stage
     *  list, so a member's wire dies the moment it is parked. */
    "bench/grouped-row-wired": {
      readonly session: string;
      readonly stage: string;
    };
    /** A wiring channel no param spells ($channel) — the wiring
     *  feeds nothing and the run would silently ignore it. */
    "bench/dead-wire": {
      readonly session: string;
      readonly stage: string;
      readonly input: string;
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
 * "bench-" + session always clears the 96-char draft ceiling.
 * EXPORTED (the wall audit's B-C1, 2026-09-28): the draft-id-grammar
 * wall drove the DRAFT regexes where it meant to drive this one —
 * the rule was unreadable from the outside, so the wall sampled a
 * neighbour. The export is the single derivation the clients' mirrors
 * and the wall both pin against. */
/** THE CONTRACT'S GRAMMAR, RE-EXPORTED (the identity law, 2026-09-28):
 *  the bench key is an address and has ONE grammar — the contract
 *  floor's. This copy was the owner; the floor is now. */
import { BENCH_DRAFT_RE, RESTORED_PROVENANCE_SPELLING, SESSION_RE } from "@melite/contracts/benchStage";
import { RESTORED_PROVENANCE } from "./remote.ts";
export { SESSION_RE };

function benchIdOf(session: string): string {
  return benchDraftIdOf(session);
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
  // "clear" (2026-10-10, the operator's demanded clear-all) — the
  // nuclear verb: every stage out, one entry, inverse restores all.
  kind: "patch" | "add_stage" | "remove_stage" | "rewire" | "reorder" | "group" | "ungroup" | "load" | "clear" | "undo";
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
  // The domain schema promises stages is an array of id-carrying
  // objects (DraftDocSchema), but nothing enforces the promise on
  // this path — a doc written behind the domain's back (an older
  // door, a hand edit) reads back as it was written, and a reader
  // that trusted the promise crashed on a null row. The read
  // projection owns the guarantee: only record rows ride, and a
  // row's id is read where it is used, never assumed.
  const stages: unknown = doc["stages"];
  if (!Array.isArray(stages)) return [];
  return stages.filter((s: unknown): boolean => isRecord(s));
}

/** THE SEED RECEIPT (2026-09-21, ledger #41: a concrete seed rode
 *  a wholesale load while the summary said only "load N stages" —
 *  the operator re-ran one image believing they were on random).
 *  One incoming stage's seed state: a concrete number rides
 *  VERBATIM at compose (pinned — the value on record); -1 is the
 *  random sentinel; anything else is absent. The load entry names
 *  every stage's state, so a pin can never arrive silently again. */
function seedStateOf(row: Record<string, unknown>): string {
  // Post-normalize rows ALWAYS carry a record params (normalizeStages
  // replaces junk/missing params with {}) — no re-defense here.
  const seed = (row["params"] as Record<string, unknown>)["seed"];
  if (typeof seed === "number" && seed !== -1) return `${row["id"]} seed ${seed} (pinned)`;
  if (seed === -1) return `${row["id"]} seed random`;
  return `${row["id"]} seed absent`;
}

/** THE STAGE-ID MINT, ONE PRODUCER (the identity law, 2026-09-28).
 *
 *  A stage with no id of its own is minted `s_<max+1>` over the LIVE
 *  rows. That law was written TWICE in this file — once for the row
 *  handed to admission, once for the row stored — and two producers
 *  of one value is the seam that just cost the operator a run (see
 *  the run id's law in runsRegistry/runsStart: the id is an INPUT to
 *  the write, not a label on it). If the two ever disagreed, the door
 *  would judge one row and the bench would store another — the
 *  "the judge sees the STORED row" law with a different id under it.
 *
 *  The collision-safe form is the law: MAX numeric suffix + 1 over the
 *  rows as they stand, never the count (a bench that lost stages
 *  re-mints a live id with the count — the 2026-09-12 fix). */
export function mintStageId(rows: readonly Record<string, unknown>[], body: Record<string, unknown>): string {
  if (typeof body["id"] === "string" && body["id"] !== "") return body["id"] as string;
  return nextStageId(highestStageSuffix(rows), takenStageIds(rows));
}

/** THE HIGHEST `s_<n>` ON THE BENCH, or -1 when there is none (the
 *  ONE arithmetic; both id producers take it).
 *
 *  It was written twice — once in the write door's mint and once in
 *  the load path's dedupe — and the identity wall caught the second
 *  copy on its first run, which is the wall doing precisely its job.
 *  A formula that decides what a stage is called belongs in one
 *  place; the two callers differ only in what they do with the
 *  answer. */
function highestStageSuffix(rows: readonly Record<string, unknown>[]): number {
  let max = -1;
  for (const row of rows) {
    const m: RegExpMatchArray | null = /^s_(\d+)$/.exec(String(row["id"] ?? ""));
    if (m !== null && Number(m[1]) > max) max = Number(m[1]);
  }
  return max;
}

/** The next free `s_<n>` at or above `max + 1`, skipping any id the
 *  caller already holds. The writer's mint and the loader's repair
 *  both ask this, so "the next id" means one thing in this file. */
function nextStageId(max: number, taken: Set<string>): string {
  let n = max;
  let fresh: string;
  do {
    n += 1;
    fresh = "s_" + String(n);
  } while (taken.has(fresh));
  return fresh;
}

/** The ids already spoken for on the bench — every stage's own. A
 *  mint that skips these cannot collide with a row the caller has
 *  not seen yet. */
function takenStageIds(rows: readonly Record<string, unknown>[]): Set<string> {
  const taken = new Set<string>();
  for (const row of rows) {
    const id: unknown = row["id"];
    if (typeof id === "string") taken.add(id);
  }
  return taken;
}

/** Birth defaults per the composer's law (id, inputs, provenance)
 *  with the runner's object inputs. */
export function normalizeStages(
  stagesIn: unknown,
  author: Author,
): Record<string, unknown>[] {
  if (!Array.isArray(stagesIn)) return [];
  const kept: Array<unknown> = stagesIn.filter((s: unknown): boolean => isRecord(s));
  // which rows arrived with their OWN id (the dedupe's pass-1 set)
  const arrivedWithId: boolean[] = kept.map(
    (s: unknown): boolean => typeof (s as Record<string, unknown>)["id"] === "string",
  );
  const normalized: Array<Record<string, unknown>> = kept
    .map((s: unknown, idx: number): Record<string, unknown> => {
      // THE PARAMS-SHAPE REFUSAL (commission 015, §6 finding 5):
      // normalizeBenchStage heals a non-record params to {} — the
      // right law for a doc already on disk, but at the WRITE door
      // that heal minted a stage from the card's knobs WRAPPED IN AN
      // ARRAY with empty params instead of refusing, the bench door
      // looser than the card it stages. The judgment runs on the
      // UNWRAPPED value (the wire's `{item:[…]}` spelling resolves to
      // the same bare array); the add and patch doors carry the same
      // law.
      const rawParams: unknown = wireParams((s as Record<string, unknown>)["params"]);
      if (rawParams !== undefined && !isRecord(rawParams)) {
        const named: unknown = (s as Record<string, unknown>)["id"];
        throw new RemoteError(
          "bench/bad-body",
          "stage " + (typeof named === "string" && named !== "" ? named : "#" + idx) +
            ": params must be an object (got " + (Array.isArray(rawParams) ? "an array — the card's knobs, not a list of them" : typeof rawParams) +
            "); a wire that cannot be read is refused here, not healed",
          {},
        );
      }
      // THE ONE NORMALIZATION (benchStage.ts — the contract): id
      // fill, DERIVED engine, run-memory strip, run-media path heal,
      // the self-naming model strip, inputs/params/outputs defaults.
      // This function used to hand-roll all of it, which is how the
      // GUI's row, the agent's row and a restored row became three
      // different documents.
      const row: Record<string, unknown> = normalizeBenchStage(s, idx);
      // the load arm's rows cross the same remote encoding — the
      // store-seat unwrap applies here too (wireParams law)
      row["params"] = wireParams(row["params"]);
      // THE RESTORE COORDINATE SURVIVES (2026-10-10, the document-plane
      // audit's CRITICAL-1): provenance 'restored' is how the model
      // REPAIR law knows a row came off an archive. Unconditionally
      // stamping the author here erased it on every load, so a
      // design-era row (params.model naming the card, an unboarded
      // family) refused at its next admission with no repair — the
      // one job the coordinate exists for. The author's own rows are
      // stamped as before; a restored row keeps its mark.
      // THE COORDINATE HAS TWO SPELLINGS, AND BOTH ARE KEPT (the
      // walls audit, 2026-09-28, found this by fixing the birth arm
      // to judge its stored rows: the stamp respected the WIRE string
      // and silently overwrote the in-process SYMBOL, so a
      // server-armed restore lost its mark on the very path that
      // exists to carry it). A coordinate with one spelling on the
      // wire and another in memory is two facts wearing one name —
      // the stamp respects both, and the door that mints the symbol
      // is the only producer of it.
      if (row["provenance"] !== RESTORED_PROVENANCE_SPELLING
        && (row["provenance"] as unknown) !== RESTORED_PROVENANCE) {
        row["provenance"] = author;
      }
      return row;
    });
  // THE SECOND PASS (the identity audit's A3). The map above is
  // left exactly as it was; the uniqueness law is a separate step so
  // the contract's positional fill stays the contract's.
  return dedupeStageIds(normalized, arrivedWithId);
}

/** A LOAD MUST NOT LAND TWO ROWS UNDER ONE ID (the identity audit's
 *  A3, 2026-10-11 — a real duplicate, not a theoretical one).
 *
 *  `normalizeBenchStage` fills an id-LESS row from its POSITION, so
 *  loading `[{id:"s_1"}, {…no id…}]` mints `s_1` for the second row:
 *  the load path persists `["s_1","s_1"]`. Only `add_stage` carries
 *  the `bench/duplicate-stage` gate, so nothing caught it. Two rows
 *  under one id is not cosmetic — `stageRow()` finds the first, a
 *  rewire writes the first, and the second row's wiring becomes a
 *  wire naming a stage the bench answers with someone else's body.
 *
 *  TWO PASSES, AND THE ORDER IS THE LAW. First every id a row
 *  ARRIVED WITH is reserved — an explicit id is the author's, and
 *  only a FILLED id may ever be moved. Then each row whose filled id
 *  is already taken is re-minted to the next free `s_<n>`, using the
 *  same max+1 discipline `mintStageId` uses. Reserving first is what
 *  makes this safe in both directions: a filled row cannot steal an
 *  id that sits AHEAD of it in the list, and a named row can never be
 *  the one that moves. */
function dedupeStageIds(
  rows: Array<Record<string, unknown>>,
  arrivedWithId: readonly boolean[],
): Array<Record<string, unknown>> {
  // PASS 1 — the author's ids, reserved before anything is moved. An
  // explicit id is never the one that gives way.
  const named: Array<Record<string, unknown>> = [];
  for (const [i, row] of rows.entries()) {
    if (arrivedWithId[i] === true && typeof row["id"] === "string") named.push(row);
  }
  const taken = takenStageIds(named);
  // PASS 2 — only a FILLED id may be moved, and only when it is
  // already spoken for. The next free id comes from the same
  // arithmetic the write door mints with (highestStageSuffix), so a
  // load and an add cannot disagree about what "next" means.
  let max = highestStageSuffix(named);
  for (const [i, row] of rows.entries()) {
    if (arrivedWithId[i] === true) continue;
    // the id here is normalizeBenchStage's fill — always a string
    // (a doc's non-string id heals to the minted form before this
    // pass, so only a filled id rides)
    const id = row["id"] as string;
    if (!taken.has(id)) {
      taken.add(id);
      continue;
    }
    let fresh: string;
    do {
      max += 1;
      fresh = "s_" + String(max);
    } while (taken.has(fresh));
    row["id"] = fresh;
    taken.add(fresh);
  }
  return rows;
}


/** The ensure row: create marker, rev, intent, stages. */
export interface BenchEnsureRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly intent: JsonValue;
  readonly stages: JsonValue;
  readonly created: boolean;
}

/** The get row: the bench as it stands, log HEADS only (rev/at /
 *  author / kind / stage / summary / reverted — inverses never
 *  leave the domain). */
export interface BenchGetRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly intent: JsonValue;
  readonly stages: JsonValue;
  readonly log: readonly { readonly [key: string]: JsonValue }[];
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
/** THE INTENT-SYNC LAW (roadmap 2026-09-26 — BRIEF14 finding #3,
 *  the stale `bench_snapshot.intent`): a bench born in card mode
 *  carries the card id as its intent, and the studio consult keys
 *  cardName off it — so an intent that names a card MUST name a
 *  card the bench still holds. A wholesale load left the old card
 *  id riding: a bench that ran tts and now holds an h3 stage still
 *  said "tts", and every run's bench_snapshot inherited the lie.
 *  The sync keys on ORPHANING, the only signal the domain owns:
 *  a label that named a card the PREVIOUS composition held and the
 *  NEXT composition dropped was true and just went stale — it
 *  re-derives (the last card-carrying stage wins; a card-less
 *  result keeps the label, inert with nothing to mislabel).
 *  Everything else rides untouched: a STATED intent wins (the
 *  caller owns the label), free prose never matched a held card id
 *  so it never orphans, a pure add_stage grows the card set and
 *  cannot orphan, and a label that was already wrong before the
 *  change is not this law's to rewrite. */
function syncIntent(
  doc: Record<string, unknown>,
  before: Record<string, unknown>[],
  after: Record<string, unknown>[],
): void {
  const cur: string = typeof doc["intent"] === "string" ? doc["intent"] : "";
  if (cur === "" || cur === "bench") return;
  const prevCards: Set<string> = new Set();
  for (const row of before) {
    const c: unknown = row["card"];
    if (typeof c === "string" && c !== "") prevCards.add(c);
  }
  if (!prevCards.has(cur)) return;
  const nextCards: Set<string> = new Set();
  for (const row of after) {
    const c: unknown = row["card"];
    if (typeof c === "string" && c !== "") nextCards.add(c);
  }
  if (nextCards.has(cur)) return;
  for (let i = after.length - 1; i >= 0; i--) {
    const c: unknown = after[i]["card"];
    if (typeof c === "string" && c !== "") {
      doc["intent"] = c;
      return;
    }
  }
}

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
    // THE JUDGE SEES THE STORED ROW — BIRTH TOO (the walls audit,
    // 2026-09-28, found live: the birth arm called admitStages on
    // the RAW body and then stored the NORMALIZED rows, so the
    // "shaped first, then judged" comment above was false for the
    // birth path. Two different objects were in play: a raw body row
    // was judged, and a normalized one was stored — the exact law the
    // load arm had already been fixed for. The birth arm now judges
    // `born`, the very rows it is about to put on disk.
    const born: Record<string, unknown>[] = normalizeStages(stagesIn, author);
    for (const row of born) stripKeys(row, BIRTH_STRIP_KEYS);
    admitStages(admit, born);
    // A BENCH IS BORN CLEAN OF ARCHIVES (the cross-bench history
    // leak, 2026-09-23 — live proof bench-session-2bd2a61f): the
    // wand restores onto fresh sessions carrying stage rows from a
    // FOREIGN bench's run snapshot; archives (history,
    // resultParams, runStatus, resolved — the observe state THIS
    // bench's own runs earn) never survive a birth. The one lawful
    // birth memory is `result` — the wand's preview stamp for the
    // ran card. The LOAD arm keeps the stage memory law whole
    // (same-id carry + fill-never-clobber).
    admitWiringList(born, session);
    const doc: Record<string, unknown> = {
      draft_id: draftId,
      intent: typeof body["intent"] === "string" ? body["intent"] : "bench",
      stages: born as JsonValue,
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
      intent: doc["intent"] as JsonValue,
      stages: doc["stages"] as JsonValue,
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
      intent: doc["intent"] as JsonValue,
      stages: doc["stages"] as JsonValue,
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
  // (the no-leak law: admit on the LOCAL normalized list, assign to
  // the cached doc only after the gates pass.)
  const staged: Record<string, unknown>[] = normalizeStages(body["stages"], author);
  // THE JUDGED VIEW IS THE STORED VIEW (the bench audit's gap 11,
  // 2026-10-10): this arm judged the RAW bodies and stored the
  // normalized rows — the unwrap, the media heal and the self-naming
  // strip all landed AFTER the judgment, so a body the normalizer
  // would have healed could still be refused. The rows are shaped
  // first, then judged — the order add uses.
  admitStages(admit, staged);
  // THE STAGE MEMORY LAW (2026-09-20, the operator's catch: "why
  // does it never track history?"): a stage's OUTPUT MEMORY — its
  // landed result and archived history — belongs to the STAGE'S
  // IDENTITY, not to the doc revision it happened to land in. A
  // wholesale load rebuilding the bench with the SAME stage ids
  // (a chat agent re-loading the card the operator is iterating
  // on) CARRIES the memory forward: result, runStatus, history,
  // resultParams ride from the outgoing row onto the incoming row
  // of the same id. A genuinely new stage id starts clean. The
  // bench is composed state; the gallery is the stage's own.
  // THE LOAD ARM'S CARRY LIST (the contract's, benchStage.ts): a
  // wholesale load onto the SAME stage ids carries the memory the
  // bench itself earned — the stage's own result/status/history/
  // resultParams. Named in the contract beside the birth strip (the
  // two are complements: birth STRIPS, load CARRIES) so the two arms
  // can never be edited apart.
  const MEMORY_KEYS = LOAD_CARRY_KEYS;
  for (const row of staged) {
    const prev = before.find((b) => b["id"] === row["id"]);
    if (prev === undefined) continue;
    for (const key of MEMORY_KEYS) {
      if (prev[key] !== undefined && row[key] === undefined) {
        // THE TRAIL HEAL AT CARRY (trail-defect-hunt §6): a memory
        // carry of history passes through the one-row-per-run dedup —
        // a pre-law duplicated trail (the operator's re-add wound,
        // one run under two url spellings) never fossilises forward
        // through load.
        row[key] = key === "history" && Array.isArray(prev[key])
          ? trailDedupe(prev[key] as unknown[])
          : prev[key];
      }
    }
  }
  admitWiringList(staged, session);
  doc["stages"] = staged;
  syncIntent(doc, before, staged);
  if (typeof body["intent"] === "string") doc["intent"] = body["intent"];
  const entry: BenchEntry = {
    author,
    kind: "load",
    summary: "load " + stagesOf(doc).length + " stages | " + staged.map(seedStateOf).join(" | "),
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
    intent: doc["intent"] as JsonValue,
    stages: doc["stages"] as JsonValue,
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
  // THE SERVE-TIME CRIME GATE (2026-10-10, the operator's live
  // report: a bench doc born BEFORE the bench/self-wire law
  // persisted its crime and served silently until a run tripped a
  // generic wall). Scoped NARROW, by design: the read path is
  // deliberately tolerant of loose-but-harmless shapes (junk cells
  // and dead wires are refused with precise voices at the run door
  // and at the next write door; the patch-tolerance laws pin that
  // they serve). ONE crime is refused HERE, and it is the one that
  // composes degenerately with no other voice: a SELF-WIRE, which is
  // a cycle, and which the run's generic no-FromStage message hid.
  //
  // (2026-10-11, the wire audit: the comment above used to claim
  // this gate also refused a wire to a DEAD STAGE. It never did, and
  // the code below says why it must not — crafted-undo docs may hold
  // one legitimately between mutations, and serve must not brick the
  // bench a fix needs to open. The law was correct and the comment
  // was the thing that drifted; a reader auditing against the prose
  // would have gone looking for a check that does not exist.)
  //
  // Whatever wrote the doc — an older door, a hand edit — the store
  // is held at read for that one crime.
  if (Array.isArray(doc["stages"])) {
    for (const st of doc["stages"] as unknown[]) {
      if (typeof st !== "object" || st === null) continue;
      const row = st as Record<string, unknown>;
      const id = typeof row["id"] === "string" ? row["id"] : undefined;
      const ins = row["inputs"];
      if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
      for (const [chan, ref] of Object.entries(ins as Record<string, unknown>)) {
        const rr = ref as Record<string, unknown>;
        if (typeof rr !== "object" || rr === null || typeof rr["stage"] !== "string") continue;
        const up = rr["stage"] as string;
        if (id !== undefined && up === id) {
          throw new RemoteError(
            "bench/self-wire",
            "input '" + chan + "' wires its own stage '" + id + "' — a cycle composes nothing. " +
              "This wire predates the bench door's self-wire law and persisted; clear it (rewire the input with no source, or wire a real prior stage).",
            { session, stage: id, input: chan },
          );
        }
        // A wire to a stage NOT on the bench (its source removed
        // later, or a crafted-log doc) stays the write doors' and
        // the run door's voice — crafted-undo docs may hold one
        // legitimately between mutations (bench-undo's inverse
        // table); serve must not brick the bench a fix needs to
        // open.
      }
    }
  }
  const block: BenchBlock = benchBlockOf(doc);
  return {
    draft_id: draftId,
    session,
    rev: block.rev,
    intent: doc["intent"] as JsonValue,
    stages: doc["stages"] as JsonValue,
    log: block.log.map(
      (e: BenchEntry): { readonly [key: string]: JsonValue } => ({
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
  /** Mutable for one reason: the atomic undo swaps in its deep copy
   *  once every target has applied (the multi-target copy law). No
   *  other arm reassigns it — every other door mutates in place
   *  BEFORE it saves, judged on a copy of the row it rewrites. */
  doc: Record<string, unknown>;
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
    // THE BIRTH CARRIES EVERY REQUIRED KEY (the typed-seam audit,
    // 2026-10-15): DraftDocSchema requires status, createdAt and
    // completedAt, and this literal left all three to a cast — so a
    // reader that validated the record would have refused the estate's
    // own first bench. The birth is a DRAFT: status "draft", created
    // now, completed null.
    const born = Math.floor(Date.now() / 1000);
    const doc0: DraftRecord["doc"] = {
      draft_id: draftId,
      status: "draft",
      createdAt: born,
      completedAt: null,
      intent: "",
      stages: [],
      bench: { rev: 0, log: [] },
    };
    await drafts.table("docs").put(draftId, {
      updated_at: born,
      doc: doc0,
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
  // Schema law (see stagesOf): the projection keeps only record
  // rows — a junk row in the stored doc never crashes the find.
  const stages = stagesOf(doc);
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

/** patch — params merge with CAS + log. THE ONE OUTCOME DOOR
 *  (the telemetry law's other half, 2026-10-08): run outcomes ride
 *  drafts/patch — the archive's door, the poll's door. This verb
 *  authors PARAMS only (the construct tool's patch grammar is
 *  {stage, params}; the tab's outcome observer writes through the
 *  drafts door). The old result/runStatus arms wrote ARCHIVE-LESS —
 *  a landing here destroyed the previous result with no supersede —
 *  under the old every-write-bumps law, so every outcome here also
 *  ticked the rev. Outcomes refuse with the redirect voice. */
export async function patchBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
  admit?: StageAdmission,
  migrate?: LaneMigration,
): Promise<BenchPatchRow> {
  refuseUnknown(body, PATCH_KEYS);
  if ("result" in body || "runStatus" in body) {
    throw new RemoteError(
      "bench/bad-body",
      "run outcomes ride the drafts/patch door (result/runStatus refused on the bench verb — it authors params only)",
      {},
    );
  }
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
  const paramsIn: unknown = wireParams(body["params"]);
  if (paramsIn !== undefined) {
    if (!isRecord(paramsIn)) {
      throw new RemoteError("bench/bad-body", "params must be an object", {});
    }
    // THE MERGE IS A COPY (2026-09-15, the no-leak law): the merged
    // view is a NEW object — a refused admission must not leave the
    // patch's writes on the domain's cached doc (the live record is
    // assigned only after every gate passes).
    const cur: Record<string, unknown> = isRecord(st["params"])
      ? { ...(st["params"] as Record<string, unknown>) }
      : {};
    for (const k of Object.keys(paramsIn)) {
      if (Object.prototype.hasOwnProperty.call(cur, k)) before[k] = cur[k];
      else added.push(k);
      // THE NULL-UNSET ARM (2026-09-24, commission 033's gap: "patch
      // can't unset a param — a lane switch forced remove_stage +
      // add_stage where one clear-semantics patch would do"). The
      // drafts door has ALWAYS deleted null keys (JSON Merge Patch
      // law, draft.ts's own doc: "null params values ride VERBATIM —
      // the door's JSON Merge Patch arm deletes those keys"); this
      // door landed them as literal nulls instead — a key that could
      // never be cleared, only overwritten. Null now deletes here
      // too: one law, two doors. The inverse restores from
      // params_before, so undo resurrects a deleted key.
      const v: unknown = (paramsIn as Record<string, unknown>)[k];
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    // admission on the MERGED view (the row's card + the params the
    // NEXT run would compose — a patch that lands poison is as bad
    // as an add that lands it). NO PROVENANCE RIDES (the audit's
    // GAP 3): the restored carve is LOAD-TIME grace — "the archive
    // loads; the run teaches" — and forwarding it here made the
    // grace sticky: a restored row patched under restore law
    // FOREVER, so a human actively editing a pre-law row never met
    // today's law. A patch is a live compose act; it judges with
    // the DECL the next run will compose from.
    // THE STORED ROW IS THE JUDGED ROW (the bench audit's gap 3,
    // 2026-10-10): the door judged the stripped view and stored the
    // raw one, so a doc written by patch held a self-naming model
    // key that add/load never store — and the next door to read that
    // row (a group, an undo) judged a different object than the one
    // on disk. The merge strips before judging AND before storing:
    // one row, one view.
    // THE LANE MIGRATION (operator 2026-10-12, the stuck-switch
    // incident — live on :3088): the merge above is where a lane
    // switch assembles its view, and BEFORE this seat the switch
    // REFUSED itself — the prior lane's members (voice on
    // CustomVoice) ride the merged view, the new lane's surface
    // (VoiceDesign) does not take them, and the admission refused
    // "drop it or switch lane" while the form HIDES the row on the
    // new lane: the named cure unclickable, the switch unlandable,
    // the studio wedged between "the studio shows your edit; the
    // bench does not". The registry drops the stale carry here —
    // BEFORE the strip, the admission, and the store, so the row
    // that lands is the row the next run composes (one view, every
    // seat). The undo contract: undoing the switch restores the
    // axes, not the dropped members — the author re-picks on the
    // lane they return to.
    const migrated: Record<string, unknown> =
      migrate !== undefined && isRecord(st["params"])
        ? migrate(
            typeof st["card"] === "string" ? (st["card"] as string) : "",
            cur,
            st["params"] as Record<string, unknown>,
          )
        : cur;
    const stored = strippedForAdmission(
      typeof st["card"] === "string" ? (st["card"] as string) : "",
      migrated,
    );
    // THE COMPOUND IS JUDGED BY ITS MEMBERS HERE TOO (the walls
    // audit, 2026-09-28, found this LIVE: patching a stage that
    // belongs to a compound judged the COMPOUND ROW as a whole, and
    // the literal "group" — a card no model board knows — reached the
    // board and refused the operator's own patch. A group's patch
    // is a patch of a MEMBER, so the members cross the door and the
    // compound never does.)
    if (st["card"] === GROUP_CARD && Array.isArray(st["children"])) {
      admitRestored(admit, st, isRecord(st["params"]) ? (st["params"] as Record<string, unknown>) : {});
    } else {
      admitStage(admit, st["card"], stored, undefined);
    }
    // THE WIRING ADMISSION (phantom-wire cure): a params patch can
    // orphan a spell (drop the $image binding while the wire stays)
    // or strand a wire (introduce $image with no channel) — the
    // merged pair admits together, exactly as the run consumes them.
    admitWiring(
      st,
      stored,
      isRecord(st["inputs"]) ? (st["inputs"] as Record<string, unknown>) : {},
      // (the domain schema pins stages[].id: string with
      // backup-and-skip at read — a nullish id never reaches here)
      stagesOf(loaded.doc).map((r: Record<string, unknown>): string => String(r["id"])),
      stageId,
      session,
      // THE UN-WEDGE LAW at the patch seat: patch touches params,
      // never inputs — a pre-broken input ref (already dead before
      // this patch) tolerates so the row's OTHER knobs stay
      // editable; the merged params×inputs law still judges what
      // the patch itself can create (an orphaned spell refuses).
      toleratedByRow([st], liveIdsOf(stagesOf(loaded.doc))).get(stageId),
    );
    st["params"] = stored;
  }
  if (paramsIn === undefined) {
    throw new RemoteError(
      "bench/bad-body",
      "nothing to patch (params)",
      {},
    );
  }
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "patch",
    stage: stageId,
    summary: "patch " + Object.keys(paramsIn).sort().join(","),
    inverse: { stage: stageId, params_before: before, params_added: added },
  });
  return {
    draft_id: loaded.draftId,
    session,
    rev: newRev,
    stage: stageId,
    patched: Object.keys(paramsIn).sort(),
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
 *  moment it lands, never at run time.
 *
 *  THE PROVENANCE COORDINATE (2026-09-24, the schema-master law):
 *  the third arg names the row's provenance — an admission may
 *  REPAIR a restored row (provenance 'restored') whose era model id
 *  predates today's registry, while a live-composed row (no
 *  provenance) still gets the loud refusal. The repair law lives
 *  in the injected admission (remote.ts); the domain only carries
 *  the coordinate. */
export type StageAdmission = (
  card: string,
  params: Record<string, unknown>,
  provenance: unknown,
) => void;

/** THE LANE MIGRATION SEAT (operator 2026-10-12, the stuck-switch
 *  incident): given the stage's card, the MERGED params view, and
 *  the stored row's params BEFORE the merge, returns the cleaned
 *  view — a lane-switching write drops its stale carry instead of
 *  refusing an unclickable cure. The registry resolves both lanes
 *  (prior and next) and owns the drop; registry-less lanes pass the
 *  view through untouched. */
export type LaneMigration = (
  card: string,
  params: Record<string, unknown>,
  priorParams: Record<string, unknown>,
) => Record<string, unknown>;


/** THE WIRE UNWRAP AT THE STORE SEAT (attempt-035's Probe B
 * receipt, 2026-09-24): the remote transport encodes free-form
 * arrays as `{item:[…]}` — the tool seat unwraps what IT sees, but
 * the encoded shape re-forms crossing the remote boundary and
 * storage held the wrap (the live bench read showed it verbatim).
 * Every params-bearing WRITE walks the unwrap — the doc stores
 * clean, reads and compose never see the poison, Probe B reads a
 * true array. */
const wireParams = (v: unknown): unknown => (isRecord(v) ? unwrapItemArrays(v) : v)

/** Admit one RESTORED stage state (the undo arms): the same seat,
 *  NO restored carve — the audit's GAP 6 caught the lie: the comment
 *  claimed no exemption while the call forwarded the very
 *  provenance string the load seat's carve matches, so an undo on a
 *  restored row judged nothing at all. Undo rewrites live-authored
 *  state; it is judged like any other write, with no provenance. A
 *  stage with no card row (an mcp or flow id) is not this seat's
 *  business. */
function admitRestored(
  admit: StageAdmission | undefined,
  stage: Record<string, unknown>,
  params: Record<string, unknown>,
): void {
  if (admit === undefined) return;
  const card = stage["card"];
  if (typeof card !== 'string' || card === '') return;
  // A RESTORED COMPOUND IS JUDGED BY ITS MEMBERS (the bench audit's
  // gap 9): the literal "group" card names nothing the model board
  // knows, so an undo that reinserted a group row (or a snapshot
  // restore) refused the bench's own state — an undo bricked by
  // what the group door had just built. The members cross the same
  // door they crossed when they were picked.
  if (card === GROUP_CARD && Array.isArray(stage["children"])) {
    for (const child of stage["children"] as unknown[]) {
      if (!isRecord(child)) continue;
      admitRestored(admit, child, isRecord(child["params"]) ? (child["params"] as Record<string, unknown>) : {});
    }
    return;
  }
  // THE STRIPPED VIEW, LIKE EVERY OTHER SEAT (the bench audit's gap
  // 3, 2026-10-10): this arm judged the RAW row, so a restore of
  // {model: <own card>} — which normalizeBenchStage strips at store
  // and which add/patch admit through the stripped view — was
  // REFUSED here as an unknown model. One admission means one view:
  // the restored row is judged exactly as it would be written.
  admit(card, strippedForAdmission(card, params), undefined);
}

/** The judged view of a row's params — the view the doc will HOLD
 *  (2026-10-10, the write-seat audit's row 7): normalizeBenchStage
 *  strips a self-naming model at store, so every admission seat
 *  judges the STRIPPED copy or the door refuses what the run
 *  composes. One spelling, used by every seat that admits a row. */
export function strippedForAdmission(
  card: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const judged: Record<string, unknown> = { ...params };
  if (judged["model"] === card && !SELF_NAMED_FAMILIES.has(card)) {
    delete judged["model"];
  }
  return judged;
}

function admitStage(
  admit: StageAdmission | undefined,
  card: unknown,
  params: unknown,
  provenance: unknown = undefined,
): void {
  if (admit === undefined) return;
  if (typeof card !== "string" || card === "") return;
  // A param-less row still names its card (2026-09-15: a stageless
  // add sailed past admission entirely) — admit the card against
  // empty params; the model check passes vacuous, the card check
  // still bites. Every caller hands this seat a record: the load and
  // birth arms pass normalizeStages' rows, whose params normalizeBenchStage
  // has already healed to {} when the doc carried anything else, and the
  // patch arm passes strippedForAdmission's own copy.
  admit(card, strippedForAdmission(card, params as Record<string, unknown>), provenance);
}

/** The compound row's card literal — the bench's own shape, never a
 *  declared card. Named once so every seat that must exempt a
 *  compound says the same word (the load arm below). */
const GROUP_CARD = "group";

/** Admission over a wholesale stage list (the load arm — every row
 *  passes the same door an add passes). Both callers hand it
 *  normalizeStages' own output, which keeps only records, so a row
 *  here is a record and the members of a compound are its own. */
function admitStages(admit: StageAdmission | undefined, stages: unknown): void {
  if (admit === undefined || !Array.isArray(stages)) return;
  for (const s of stages as Array<Record<string, unknown>>) {
    // THE COMPOUND IS NOT A CARD (the bench audit's gap 9,
    // 2026-10-10): groupBench writes a row whose card is the literal
    // "group" and whose members ride in `children` — so loading the
    // bench's own read-back asked the model board about a card that
    // does not exist ("no registered card definition"), and an undo
    // of such a load bricked on the bench's own prior state. The
    // compound is judged by its MEMBERS: the same door each member
    // crossed when it was picked (the compound-no-blind-spot law,
    // stated on the way back in).
    if (s["card"] === GROUP_CARD && Array.isArray(s["children"])) {
      admitStages(admit, s["children"]);
      continue;
    }
    admitStage(admit, s["card"], s["params"], s["provenance"]);
  }
}

// ── THE WIRING ADMISSION (2026-09-15, the phantom-wire cure) ───────
// The bench's wiring vocabulary is the RUN's: `inputs` name channels,
// params bind them via `$channel` spells (rewriteSpells is the
// consumer — a string param starting with "$" IS a spell). Three
// construction violations used to land silent and starve compose at
// run time, far from the write that caused them:
//   a) a channel no param spells (dead wire — the agent's
//      inputs:{image:{stage,...}} with no $image anywhere);
//   b) a spell no channel binds (runs refuse at rewriteSpells);
//   c) an upstream stage id that is not on the bench (the mint
//      mints s_N; "stage-1" never existed).
// All three now refuse AT WRITE TIME, named.

/** Collect the `$channel` spell names a params body carries
 *  (rewriteSpells semantics verbatim: a string STARTING with "$" is
 *  one spell named slice(1) — "costs $5" is text, "$image" is a
 *  spell). */
function spellsOf(params: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof params === "string") {
    if (params.startsWith("$")) out.add(params.slice(1));
  } else if (Array.isArray(params)) {
    for (const v of params) spellsOf(v, out);
  } else if (typeof params === "object" && params !== null) {
    for (const v of Object.values(params as Record<string, unknown>)) spellsOf(v, out);
  }
  return out;
}

/** One wiring binding's declared shape: {stage, output} (FromStage),
 *  {initial} (the request's initial), or anything else (garbage —
 *  the run maps only these two). */
function wireUpstreamOf(ref: unknown): { stage?: string; initial?: boolean } {
  if (typeof ref !== "object" || ref === null || Array.isArray(ref)) return {};
  const r: Record<string, unknown> = ref as Record<string, unknown>;
  if (typeof r["stage"] === "string") return { stage: r["stage"] };
  if (typeof r["initial"] === "string") return { initial: true };
  return {};
}

/** The wiring admission over ONE row (params = the MERGED view the
 *  next run composes; inputs = the MERGED wiring; liveIds = the
 *  bench's stage ids after the write; selfId = the row's own id —
 *  self-wiring is a cycle, refused). Throws bench/* named. */
export function admitWiring(
  row: Record<string, unknown>,
  params: Record<string, unknown>,
  inputs: Record<string, unknown>,
  liveIds: readonly string[],
  selfId: string,
  session: string,
  tolerate?: ReadonlySet<string>,
): void {
  const spells: Set<string> = spellsOf(params);
  for (const [chan, ref] of Object.entries(inputs)) {
    const up: { stage?: string; initial?: boolean } = wireUpstreamOf(ref);
    if (up.stage === undefined && up.initial !== true) {
      throw new RemoteError(
        "bench/bad-wire",
        "input '" + chan + "' is neither {stage, output} nor {initial} — the run maps only those two shapes",
        { session, stage: selfId, input: chan },
      );
    }
    if (up.stage !== undefined) {
      if (up.stage === selfId) {
        throw new RemoteError(
          "bench/self-wire",
          "input '" + chan + "' wires its own stage '" + selfId + "' — a cycle composes nothing",
          { session, stage: selfId, input: chan },
        );
      }
      // THE UN-WEDGE LAW (2026-10-10, the operator's wedge): this
      // refusal fires only for a dangle the VERB CREATES. A ref the
      // row already carried toward an ALREADY-DEAD stage (an
      // interleaved write birthed it; no door admits creating it)
      // passes through `tolerate` — the run door names it, and the
      // cure doors (rewire-clear, remove, clear) must never refuse
      // on the very state they cure. Creation still refuses LOUD.
      if (!liveIds.includes(up.stage) && !(tolerate !== undefined && tolerate.has(up.stage))) {
        throw new RemoteError(
          "bench/wire-stage-not-found",
          "input '" + chan + "' wires stage '" + up.stage + "' — no such stage on the bench (live: " +
            (liveIds.join(", ") || "none") + ")",
          { session, stage: selfId, input: chan, live: liveIds },
        );
      }
    }
    if (!spells.has(chan)) {
      throw new RemoteError(
        "bench/dead-wire",
        "input '" + chan + "' is bound by no '$" + chan + "' spell in params — the wiring would feed nothing " +
          "(bind it, e.g. params: {image: \"$" + chan + "\"}, or drop the wire)",
        { session, stage: selfId, input: chan },
      );
    }
  }
  // NOTE: the reverse (a $spell with no channel) is NOT a write-time
  // refusal — it is a legal INTERMEDIATE state (spell first, wire
  // second; the two-step construction). The run refuses a stray
  // spell LOUD at merge (rewriteSpells' own voice), so nothing is
  // silent either way.
}

/** Wiring admission over a wholesale stage list (the load arm —
 *  every row checks against the list it lands in). Both call sites
 *  pass normalizeStages() output — non-arrays collapse to [] there,
 *  non-record rows filter out, and every surviving row carries a
 *  string id plus record params/inputs (the coerce arms at
 *  normalizeStages) — so no re-defense here. */
/** The live ids of a stage list (group children included — they
 *  keep their stage ids under the compound). */
function liveIdsOf(stages: Array<Record<string, unknown>>): Set<string> {
  const out: Set<string> = new Set();
  for (const r of stages) {
    out.add(String(r["id"] ?? ""));
    if (r["card"] === GROUP_CARD && Array.isArray(r["children"])) {
      for (const child of r["children"] as unknown[]) {
        if (isRecord(child)) out.add(String(child["id"] ?? ""));
      }
    }
  }
  return out;
}

/** The un-wedge law's tolerance table: for every row in the list
 *  being JUDGED, the upstreams it wires that are absent from the
 *  PRE-verb live set — refs the verb did not create (they were
 *  already dead, or ride a restored snapshot the log itself
 *  recorded) and must not be refused for. Keyed by row/child id.
 *
 *  The walk is over the JUDGED rows (not the pre rows): a verb
 *  like clear leaves no pre rows at all, and undo restores rows
 *  the pre state doesn't hold — the ref a row CARRIES is the
 *  thing to classify, against what was live before the verb. A
 *  ref newly introduced by a verb (rewire's `from`, a patch's
 *  spell changes) never rides this table: those seats build their
 *  tolerate sets from the PRE ROW's own inputs, so a fresh dead
 *  target stays strict. */
/** Exported for the drafts seat (audit S-S1): the un-wedge table is
 *  the same law at every author seat. */
export function toleratedByRow(
  stages: Array<Record<string, unknown>>,
  preLive: ReadonlySet<string>,
): Map<string, Set<string>> {
  const out: Map<string, Set<string>> = new Map();
  const rowOf = (r: Record<string, unknown>, id: string): void => {
    const inputs: unknown = r["inputs"];
    if (!isRecord(inputs)) return;
    for (const ref of Object.values(inputs)) {
      const up: { stage?: string } = wireUpstreamOf(ref);
      if (up.stage !== undefined && !preLive.has(up.stage)) {
        const set: Set<string> | undefined = out.get(id);
        if (set !== undefined) set.add(up.stage);
        else out.set(id, new Set([up.stage]));
      }
    }
  };
  for (const r of stages) {
    const id: string = String(r["id"] ?? "");
    rowOf(r, id);
    if (r["card"] === GROUP_CARD && Array.isArray(r["children"])) {
      for (const child of r["children"] as unknown[]) {
        if (isRecord(child)) rowOf(child, String(child["id"] ?? ""));
      }
    }
  }
  return out;
}

function admitWiringList(
  stages: Array<Record<string, unknown>>,
  session: string,
  tolerate?: Map<string, Set<string>>,
): void {
  // COERCED HERE (2026-10-10): a third caller — remove_stage's
  // survivor walk — feeds the LIVE doc list, whose rows predate the
  // normalize contract's guarantees whenever the doc predates it. A
  // row without record params/inputs judges over {} (vacuous pass),
  // never crashes the door; the normalized callers are unaffected.
  // (records themselves are the projection's guarantee — stagesOf
  // keeps only record rows and normalizeStages filters its own — so
  // no re-defense of record-ness here)
  const liveIds: string[] = stages
    .map((r: Record<string, unknown>): string => String(r["id"] ?? ""));
  // THE UN-WEDGE TOLERANCE: the map (per row id) carries the refs
  // that pre-date the verb — the walk refuses only the danglings
  // THIS verb creates; refs already dead before it pass through
  // (the run door's voice — see admitWiring's tolerate law). Each
  // seat states its own base for toleratedByRow.
  const tolerateAll: Map<string, Set<string>> | undefined = tolerate;
  for (const r of stages) {
    // THE COMPOUND'S OWN WIRES ARE JUDGED (the bench audit's gap 7,
    // 2026-10-10): a compound row's inputs are {} by shape, so this
    // walk passed over it vacuously — a wire hidden INSIDE a group
    // survived a remove of the stage it pointed at, and ungroup then
    // spilled the phantom onto the flat bench with nothing left to
    // catch it. The walk descends: the compound is judged, and so is
    // every child, against the same live set.
    admitWiring(
      r,
      isRecord(r["params"]) ? (r["params"] as Record<string, unknown>) : {},
      isRecord(r["inputs"]) ? (r["inputs"] as Record<string, unknown>) : {},
      liveIds,
      String(r["id"] ?? ""),
      session,
      tolerateAll?.get(String(r["id"] ?? "")),
    );
    if (r["card"] === GROUP_CARD && Array.isArray(r["children"])) {
      for (const child of r["children"] as unknown[]) {
        if (!isRecord(child)) continue;
        admitWiring(
          child,
          isRecord(child["params"]) ? (child["params"] as Record<string, unknown>) : {},
          isRecord(child["inputs"]) ? (child["inputs"] as Record<string, unknown>) : {},
          liveIds,
          String(child["id"] ?? ""),
          session,
          tolerateAll?.get(String(child["id"] ?? "")),
        );
      }
    }
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
  const loadedForAdmit: LoadedBench = await loadBench(drafts, session);
  casCheck(loadedForAdmit.block, body["expect_rev"], session);
  // THE JUDGED VIEW IS THE STORED VIEW (the bench audit's gap 11,
  // 2026-10-10): this arm judged the RAW body and then stored the
  // normalized row — so the unwrap, the legacy-media heal and the
  // default overlay were applied AFTER the judgment, and the door
  // could refuse a row the normalizer would have healed (or admit one
  // it would have reshaped). The row is shaped FIRST, then judged —
  // the same order every other door uses.
  const cardForRow: unknown = body["card"];
  if (typeof cardForRow !== "string" || cardForRow === "") {
    throw new RemoteError("bench/bad-body", "card is required", {});
  }
  // THE ONE MINT, AND NOW IT IS ONE CALL (the identity audit's
  // finding C, 2026-10-11). This comment used to claim "there is one
  // producer of the value" directly above a function that called the
  // producer TWICE — once for the row handed to admission, once for
  // the row stored below. They agree today only because both read the
  // same unmutated doc; any future edit between them, or a change to
  // one formula, reopens the judged-vs-stored split this comment
  // claimed to have closed. The value is bound ONCE and both doors
  // read it, so the sentence is now true rather than aspirational.
  //
  // (See mintStageId for why the formula is max+1 and not the count.)
  const stageIdForAdmit: string = mintStageId(stagesOf(loadedForAdmit.doc), body);
  // A MALFORMED `inputs` CONTAINER REFUSES (the audit's fail-open).
  // `isRecord(...) ? ... : {}` treats a non-record `inputs` exactly
  // like an absent one: the caller is told the stage was added, no
  // wire is stored, and the loss surfaces much later as a missing
  // required param at run time. A bad BINDING already refuses
  // (bench/bad-wire) and rewire's non-record `from` already refuses
  // (bench/bad-body) — the container was the one shape that failed
  // open. The READ path stays tolerant on purpose (a doc already on
  // disk is not the caller's mistake, and the serve/run doors judge
  // it there); this is the door where the caller can still be told.
  const rawInputs: unknown = body["inputs"];
  if (rawInputs !== undefined && !isRecord(rawInputs)) {
    throw new RemoteError(
      "bench/bad-body",
      "stage " + JSON.stringify(stageIdForAdmit) +
        ": inputs must be an object of channel → {stage, output} | {initial} (got " +
        typeof rawInputs +
        "); a wire that cannot be read is refused here, not dropped",
      {},
    );
  }
  // A MALFORMED `params` CONTAINER REFUSES (the same fail-open the
  // `inputs` container closed above — commission 015, §6 finding 5):
  // `isRecord(...) ? ... : {}` treated a non-record `params` exactly
  // like an absent one, so the card's knobs wrapped in an array
  // minted a stage with EMPTY params instead of refusing. The patch
  // door has refused this shape since 2026-09-15 and the load door
  // refuses at its own row admission — one law, every write door.
  const rawParams: unknown = wireParams(body["params"]);
  if (rawParams !== undefined && !isRecord(rawParams)) {
    throw new RemoteError(
      "bench/bad-body",
      "stage " + JSON.stringify(stageIdForAdmit) + ": params must be an object (got " +
        (Array.isArray(rawParams) ? "an array — the card's knobs, not a list of them" : typeof rawParams) +
        "); a wire that cannot be read is refused here, not dropped",
      {},
    );
  }
  const admitted: Record<string, unknown> = normalizeBenchStage(
    {
      id: stageIdForAdmit,
      card: cardForRow,
      ...(typeof body["engine"] === "string" && body["engine"] !== "" ? { engine: body["engine"] } : {}),
      ...(rawParams !== undefined ? { params: rawParams } : {}),
      ...(isRecord(body["inputs"]) ? { inputs: body["inputs"] } : {}),
      ...(isRecord(body["outputs"]) ? { outputs: body["outputs"] } : {}),
    },
    stageIdForAdmit,
  );
  admitStage(admit, admitted["card"], admitted["params"]);
  const loaded: LoadedBench = loadedForAdmit;
  // (the card was already refused at the top of this door when it is
  // not a non-empty string — the bound value here is one)
  const card: string = body["card"] as string;
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  // THE MINT LAW (the collision fix, 2026-09-12): the count mint
  // ("s_" + stages.length) collides the moment any stage was ever
  // removed — [s_0..s_9] minus nine leaves s_1, and the count says
  // s_1 again. The mint takes MAX numeric suffix + 1 over the live
  // rows, so a fresh id is fresh against the bench AS IT STANDS.
  // THE STORED ROW'S ID IS THE ADMITTED ROW'S ID (the one mint,
  // above): read the bound value, never call the producer again.
  const stageId: string = stageIdForAdmit;
  if (stageRow(loaded.doc, stageId) !== null) {
    throw new RemoteError(
      "bench/duplicate-stage",
      "stage id already on the bench: " + stageId,
      { session, stage: stageId },
    );
  }
  // THE ROW IS THE CONTRACT'S (2026-10-10, the audit's Rule 1 — this
  // arm hand-rolled the whole row, so a stage added here kept a dead
  // `/v1/assets/runs` path unhealed, skipped the self-naming strip,
  // and defaulted `outputs` by a SECOND law). One writer shapes a
  // stage row: normalizeBenchStage. `expected` rides on top, exactly
  // as it does on every other arm.
  const row: Record<string, unknown> = normalizeBenchStage(
    {
      id: stageId,
      card,
      ...(typeof body["engine"] === "string" && body["engine"] !== "" ? { engine: body["engine"] } : {}),
      ...(rawParams !== undefined ? { params: rawParams } : {}),
      ...(isRecord(body["inputs"]) ? { inputs: body["inputs"] } : {}),
      ...(isRecord(body["outputs"]) ? { outputs: body["outputs"] } : {}),
    },
    stageId,
  );
  row["provenance"] = author;
  if (isRecord(body["expected"])) row["expected"] = body["expected"];
  // THE WIRING ADMISSION (phantom-wire cure) — BEFORE the push: the
  // row's wiring admits against a PROJECTED live set (current ids +
  // this row's). Never push-then-check: the loaded doc is the
  // domain's cached object, and a refusal after the push LEAKS the
  // refused row into the cache (live-fired 2026-09-15: two refused
  // adds persisted as s_1/s_2 on the next good write — a refusal
  // that lies). Mutate only after every gate passes.
  admitWiring(
    row,
    row["params"] as Record<string, unknown>,
    row["inputs"] as Record<string, unknown>,
    [...stages.map((r: Record<string, unknown>): string => String(r["id"] ?? "")), stageId],
    stageId,
    session,
  );
  stages.push(row);
  loaded.doc["stages"] = stages;
  // add_stage never syncs the intent (the orphaning law): a pure
  // add grows the card set — a label true before stays true after.
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

const REORDER_KEYS = ["stage", "to", "expect_rev", "author", "after"];

/** reorder — move ONE stage to a new index in the bench's stage order
 *  (the drag-reorder door, 2026-09-11: the old system's reorderRange
 *  gesture; the reborn bench is SSOT so the door exists before the UX
 *  does). The inverse carries the ORIGINAL index for undo. `to` is
 *  clamped into [0, stages.length-1] AFTER the splice-out, so a move
 *  past either end parks at the end — the drag gesture's own
 *  semantics, not an error. `after` (the F1-residue cure, round 25)
 *  is the OPTIONAL anchor id the press targeted in its pre-flight
 *  list: when present the door re-derives `to` from the anchor's
 *  index in the CURRENT list, so a second author's insert between
 *  press and apply cannot silently shift the drop's intent (the I2
 *  rebase-shift); a missing anchor refuses `bench/anchor-gone` —
 *  the re-ask is honest, the silent skew was not. */
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
  const afterRaw: unknown = body["after"];
  if (afterRaw !== undefined && typeof afterRaw !== "string") {
    throw new RemoteError(
      "bench/bad-body",
      "after must be a stage id string when present",
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
  // anchor resolution: re-derive the target from the id the press
  // SAW, not the numeric slot it guessed. Unchanged list → the same
  // `to` the press sent (identity, never a behavior change); a
  // shifted list → the drop's intent survives the shift.
  let toTarget: number = toRaw;
  if (afterRaw !== undefined) {
    const anchor: number = stages.findIndex(
      (s: Record<string, unknown>): boolean => s["id"] === afterRaw,
    );
    if (anchor < 0) {
      throw new RemoteError(
        "bench/anchor-gone",
        "the card you dropped after is gone — drop again",
        { session, anchor: afterRaw },
      );
    }
    toTarget = anchor;
  }
  const [row] = stages.splice(from, 1);
  const to: number = Math.min(toTarget, stages.length);
  stages.splice(to, 0, row);
  loaded.doc["stages"] = stages;
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "reorder",
    stage: stageId,
    summary: "reorder " + String(row["card"] ?? stageId),
    inverse: { stage: stageId, from, to, ...(afterRaw !== undefined ? { after: afterRaw } : {}) },
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
  admit: StageAdmission | undefined = undefined,
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
  // THE COMPOUND IS NOT A BLIND SPOT (2026-10-10, the write-seat
  // audit's rows 1+4): a compound row renders as one tile and its
  // children leave the flat bench — patch cannot reach inside it, so
  // a row parked before a law tightened would sit inside the group
  // judged by NOTHING until ungroup spilled it back. The picked rows
  // walk the same admission an add walks BEFORE they leave the flat
  // bench — the group is a write like every other write, and a
  // refusal here names the child the way add_stage would.
  for (const row of picked) {
    admitRestored(admit, row, isRecord(row["params"])
      ? (row["params"] as Record<string, unknown>)
      : {});
  }
  // A WIRED ROW CANNOT BE GROUPED (the bench audit's gap 6, 2026-10-10
  // — the direction the first cut of this gate still missed): the
  // run's wiring walk (benchWiring in the runs registry) reads the
  // FLAT stage list only, so a member's wire dies the moment the
  // member leaves it — whether it pointed at another member or at a
  // bystander. Parking it is a silent run-time starvation, so the
  // door refuses and names the cure (ungroup first, or drop the wire).
  for (const row of picked) {
    const ins = row["inputs"];
    if (isRecord(ins) && Object.keys(ins).length > 0) {
      throw new RemoteError(
        "bench/grouped-row-wired",
        "stage " + String(row["id"]) + " carries a wire (" + Object.keys(ins).join(", ") +
          ") — grouping hides it from the run, which wires only the flat bench; ungroup it first, or drop the wire",
        { session, stage: String(row["id"]) },
      );
    }
  }
  // THE SURVIVORS RE-JUDGED, AND THE WIRES TOO (the bench audit's
  // gap 6, 2026-10-10): a group moves rows OFF the flat bench, so a
  // wire another member carried now points at a stage that is no
  // longer addressable — a state remove_stage refuses and rewire
  // refuses to create. Grouping admitted it silently, because this
  // arm only judged the picked rows' models. The post-move bench is
  // judged as a whole, on a copy, before the splice lands (the
  // survivor law remove established, now applied to the other door
  // that moves rows).
  const afterGroup: Record<string, unknown>[] = stages.filter(
    (r: Record<string, unknown>): boolean => !picked.includes(r),
  );
  const compoundProbe: Record<string, unknown> = {
    id: "g_probe",
    card: GROUP_CARD,
    children: picked,
  };
  afterGroup.splice(Math.min(firstIndex, afterGroup.length), 0, compoundProbe);
  // THE UN-WEDGE LAW at the group seat: rows keep the refs they
  // carried; only the grouping changes. Judged against the pre live set.
  admitWiringList(afterGroup, session, toleratedByRow(afterGroup, liveIdsOf(stages)));
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
    card: GROUP_CARD,
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
  admit: StageAdmission | undefined = undefined,
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
  if (idx < 0 || stages[idx]!["card"] !== GROUP_CARD) {
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
  // THE SPILL IS A WRITE (2026-10-10, the write-seat audit's row 4):
  // the children re-enter the flat bench as patchable rows — every
  // other re-entry (undo-patch, undo-remove, load) walks admission,
  // and this door was the one place a pre-law row could come back
  // judged by nothing. Judged BEFORE the splice; a refusal keeps the
  // compound intact and names the child.
  for (const row of rows) {
    admitRestored(admit, row, isRecord(row["params"])
      ? (row["params"] as Record<string, unknown>)
      : {});
  }
  // THE SPILLED BENCH IS JUDGED AS A WHOLE (the bench audit's gap 6,
  // 2026-10-10): a child that carried a wire to a stage the
  // compound hid — or a wire to a member that the group removed from
  // the flat bench — comes back as a PHANTOM, a state add, rewire and
  // remove all refuse. Judged on a copy, before the splice.
  const afterSpill: Record<string, unknown>[] = stages.filter(
    (r: Record<string, unknown>): boolean => r !== compound,
  );
  afterSpill.splice(Math.min(idx, afterSpill.length), 0, ...rows);
  // THE UN-WEDGE LAW at the ungroup seat (same as group's).
  admitWiringList(afterSpill, session, toleratedByRow(afterSpill, liveIdsOf(stages)));
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
  const before: Record<string, unknown>[] = [...stages];
  // SURVIVORS ARE RE-JUDGED (2026-10-10, the write-seat audit's row
  // 5): removing a stage rewrites every row that wired it — the
  // survivor now holds bench/wire-stage-not-found, a state the
  // rewire door REFUSES to create. Door parity demands the removal
  // refuse it too (drop the wire first, or keep the stage). The
  // survivors' wiring walks the same law on a COPY, BEFORE the
  // splice — a refused removal leaks nothing (stagesOf returns the
  // doc's own array; the splice is the write, and it lands last).
  admitWiringList(
    stages.filter((_r: Record<string, unknown>, i: number): boolean => i !== idx),
    session,
    // THE UN-WEDGE LAW at the remove seat: the survivors are judged
    // against the PRE-removal live set — this removal refuses only
    // the danglings IT creates (a survivor wiring the removed
    // stage); a survivor's PRE-EXISTING dead ref (born by an
    // interleaved write, refused by no door that admits creating
    // it) passes through, else NO remove could ever land and the
    // bench wedges (the operator's 2026-10-10 catch: "I can't even
    // clear or delete from the bench").
    toleratedByRow(
      stages.filter((_r: Record<string, unknown>, i: number): boolean => i !== idx),
      liveIdsOf(stages),
    ),
  );
  stages.splice(idx, 1);
  loaded.doc["stages"] = stages;
  syncIntent(loaded.doc, before, stages);
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "remove_stage",
    stage: stageId,
    summary: "remove " + String(row["card"] ?? stageId),
    inverse: { stage: stageId, row, index: idx },
  });
  return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}

const CLEAR_KEYS = ["expect_rev", "author"];

/** The clear row. */
export interface BenchClearRow {
  readonly draft_id: string;
  readonly session: string;
  readonly rev: number;
  readonly cleared: number;
}

/** clear — THE OPERATOR'S DEMANDED DOOR (2026-10-10, "there is no
 *  clear all"): remove EVERY stage in one verb. No survivor can
 *  dangle (there are no survivors), so the door admits on ANY bench
 *  — including a wedged one no other verb can repair — and the ONE
 *  log entry carries the full stages_before inverse (undo restores
 *  everything). The nuclear seat: use it when the bench itself is
 *  the wound. */
export async function clearBench(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  body: Record<string, unknown>,
): Promise<BenchClearRow> {
  refuseUnknown(body, CLEAR_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  casCheck(loaded.block, body["expect_rev"], session);
  const author: Author = authorOk(body["author"])
    ? (body["author"] as Author)
    : "agent";
  const stages: Record<string, unknown>[] = stagesOf(loaded.doc);
  const before: Record<string, unknown>[] = [...stages];
  stages.length = 0;
  loaded.doc["stages"] = stages;
  syncIntent(loaded.doc, before, stages);
  const newRev: number = await appendAndSave(drafts, loaded, {
    author,
    kind: "clear",
    summary: "clear " + String(before.length) + " stages",
    inverse: { stages_before: before },
  });
  return {
    draft_id: loaded.draftId,
    session,
    rev: newRev,
    cleared: before.length,
  };
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
    ? { ...(st["inputs"] as Record<string, unknown>) }
    : {};
  const before: unknown = Object.prototype.hasOwnProperty.call(st["inputs"] === undefined ? {} : st["inputs"] as Record<string, unknown>, input)
    ? (st["inputs"] as Record<string, unknown>)[input]
    : undefined;
  if (from === undefined) delete inputs[input];
  else inputs[input] = from;
  // THE PHANTOM-WIRE CURE (2026-09-15): rewire is THE wiring door —
  // the CANDIDATE wiring (a copy, never the live record: a refusal
  // must not leak the write into the domain's cached doc) admits
  // against the row's params and the live bench BEFORE anything
  // moves (a channel nothing spells, an upstream that doesn't
  // exist — all refuse here, named, instead of starving compose at
  // run time).
  admitWiring(
    st,
    isRecord(st["params"]) ? (st["params"] as Record<string, unknown>) : {},
    inputs,
    // (the domain schema pins stages[].id: string with
    // backup-and-skip at read — a nullish id never reaches here)
    stagesOf(loaded.doc).map((r: Record<string, unknown>): string => String(r["id"])),
    stageId,
    session,
    // THE UN-WEDGE LAW at the rewire seat: the tolerate table is
    // built from the PRE ROW's own inputs — a ref the rewire
    // NEWLY sets (its `from`) never rides it, so wiring a dead
    // stage still refuses (the phantom-wire cure stands), while
    // the row's other pre-broken inputs tolerate so rewiring one
    // wire on a wounded row never wedges.
    toleratedByRow(
      [st],
      liveIdsOf(stagesOf(loaded.doc)),
    ).get(stageId),
  );
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
  readonly stages: JsonValue;
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
  admit?: StageAdmission,
): Promise<BenchUndoRow> {
  refuseUnknown(body, UNDO_KEYS);
  const loaded: LoadedBench = await loadBench(drafts, session);
  // THE FENCE IS NOT OPTIONAL (audit W-E2): undo reverts writes —
  // exactly the mutations the CAS law fences. It was the only verb
  // that skipped the check when expect_rev was absent, so an
  // un-read revert raced any concurrent writer and silently
  // double-applied. Same voice as every verb: absent expect_rev
  // refuses bench/cas-conflict with current_rev.
  casCheck(loaded.block, body["expect_rev"], session);
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
  // THE MULTI-TARGET UNDO IS ATOMIC (the bench audit's gap 2,
  // 2026-10-10): every inverse applied straight into the CACHED doc,
  // so `undo {n: 2}` where the first target reverts cleanly and the
  // second refuses left the first one's change in the live document
  // with no rev and no log — a refused write that mutated, through
  // the door whose whole job is repair. The inverses now run against
  // a DEEP COPY and the swap happens only when every target applied
  // (copy-on-judge, at the shape's own scale: an undo either lands
  // whole or not at all).
  const undoDoc = structuredClone(loaded.doc);
  for (const e of targets) applyInverse(undoDoc, e, admit, session);
  // THE UNDOED BENCH IS WIRE-JUDGED WHOLE (the bench audit's gaps 4
  // + 5, 2026-10-10): every restore arm above judged MODELS only, so
  // the wiring half of a write was undo's blind spot: an undo-patch
  // restored params that stranded a spell the wire still fed (a dead
  // wire the forward patch refuses), and undo-remove/group/ungroup/
  // snapshot reinserted rows that wired a stage no longer on the
  // bench. One walk over the RESULT covers every arm at once — the
  // survivor law remove established, applied to the repair door.
  // THE UN-WEDGE LAW rides here too (2026-10-10, the operator's
  // wedge), with the resurrection line drawn by ROW, not by ref: a
  // row that was already on the bench before the undo (or rides an
  // undone CLEAR's recorded snapshot — clear's promise is that undo
  // restores EVERYTHING, wounds included; the run door names them,
  // the cure doors exist) keeps its pre-existing dead refs. A row
  // the undo RESURRECTS through any other arm (remove's inverse,
  // group's spill) judges STRICT — the phantom the forward doors
  // refuse must not launder back through undo (gap 5 stands). Refs
  // the undo itself orphans (a stage live before, gone after) still
  // refuse LOUD.
  (() => {
    const baseRows: Array<Record<string, unknown>> = [...stagesBefore];
    for (const e of targets) {
      const inv: Record<string, unknown> = (e as { inverse?: Record<string, unknown> }).inverse ?? {};
      if (e.kind === "clear" && Array.isArray(inv["stages_before"])) {
        for (const row of inv["stages_before"] as unknown[]) {
          if (isRecord(row)) baseRows.push(row);
        }
      }
    }
    const baseIds: Set<string> = liveIdsOf(baseRows);
    // THE TRAIL HEAL AT UNDO (trail-defect-hunt §6): a reinserted
    // pre-law row's duplicated history never rides back in — same
    // dedup the load carry applies.
    for (const r of stagesOf(undoDoc)) {
      if (Array.isArray(r["history"])) r["history"] = trailDedupe(r["history"] as unknown[]);
    }
    const restored = stagesOf(undoDoc);
    admitWiringList(
      restored,
      session,
      toleratedByRow(
        restored.filter((r: Record<string, unknown>): boolean => baseIds.has(String(r["id"] ?? ""))),
        baseIds,
      ),
    );
  })();
  loaded.doc = undoDoc;
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
    stages: loaded.doc["stages"] as JsonValue,
  };
}

/** Apply one entry's inverse payload to the doc (best-effort per
 *  entry; a stage an undo already removed is skipped loudly-free —
 *  the snapshot entries carry the coarse fallback). */
function applyInverse(
  doc: Record<string, unknown>,
  e: BenchEntry,
  admit?: StageAdmission,
  session: string = "",
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
    // COMPOSE ON A COPY (the audit's GAP 5): this used to alias the
    // live record, so a refused undo left the poisoned merge in the
    // doc's cached record before the throw. Judge the copy, THEN
    // assign; a refusal leaves the bench exactly as it was.
    const cur: Record<string, unknown> = isRecord(st["params"])
      ? { ...(st["params"] as Record<string, unknown>) }
      : {};
    const before: Record<string, unknown> = isRecord(inv["params_before"])
      ? (inv["params_before"] as Record<string, unknown>)
      : {};
    for (const k of Object.keys(before)) cur[k] = before[k];
    const added: unknown = inv["params_added"];
    if (Array.isArray(added)) {
      for (const k of added) delete cur[k];
    }
    // UNDO IS A WRITE (2026-10-10, the door audit's HIGH-3): the
    // inverse restores params wholesale, so without this an undo was
    // the laundering path — plant a poison through a door that is not
    // judged, patch it clean, then undo back onto the poison. The
    // restored state walks the same composed admission BEFORE it
    // lands, and NO restored exemption applies: these were
    // live-authored states, so re-judging is safe and a refusal is
    // loud.
    admitRestored(admit, st, cur);
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
    // THE REINSERTED ROW IS JUDGED (the audit's GAP 4): an inverse
    // row that left the doc before a law tightened re-enters here
    // with NO seat looking at it — the laundering path the patch
    // arm closed, reopened one verb over. Admission BEFORE the
    // splice: a refusal names the row and the doc keeps its stages.
    if (isRecord(row)) {
      admitRestored(admit, row, isRecord(row["params"])
        ? (row["params"] as Record<string, unknown>)
        : {});
      stages.splice(Math.min(idx, stages.length), 0, row);
    }
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
    // (the inverse is a payload the log recorded, never a promise —
    // junk members degrade loudly-free: only record rows re-enter)
    const rows: Record<string, unknown>[] = Array.isArray(children)
      ? children.filter((r: unknown): boolean => isRecord(r))
      : [];
    // THE SPILL IS A WRITE HERE TOO (2026-10-10, the write-seat
    // audit's row 1): the children re-enter the flat bench from the
    // INVERSE — a payload the log recorded, never a row the doors
    // just judged — so an inverse carrying pre-law poison laundered
    // straight back onto the bench. Every child walks admission
    // BEFORE the splice; a refusal leaves the compound standing.
    for (const row of rows) {
      admitRestored(admit, row, isRecord(row["params"])
        ? (row["params"] as Record<string, unknown>)
        : {});
    }
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
    // (the inverse's members ride as the log recorded them — only
    // record rows re-enter; junk degrades loudly-free)
    const members: Record<string, unknown>[] = Array.isArray(children)
      ? children.filter((c: unknown): boolean => isRecord(c))
      : [];
    if (members.length > 0) {
      // THE RE-PARK IS JUDGED (2026-10-10, the write-seat audit's
      // row 2): the compound hides its children from every patch
      // door — re-parking an inverse row re-opens the blind spot the
      // group door closed. Children walk admission BEFORE the
      // compound forms; a refusal aborts the undo whole.
      for (const child of members) {
        admitRestored(admit, child, isRecord(child["params"])
          ? (child["params"] as Record<string, unknown>)
          : {});
      }
      for (const child of members) {
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
    // (stageRow matches by identity of the string — the row it
    // returns carries exactly this id, never a nullish one)
    const stageId: string = String(inv["stage"] ?? "");
    const st: Record<string, unknown> | null = stageRow(
      doc,
      stageId,
    );
    if (st === null) return;
    // COPY-ON-JUDGE (the write-seat audit's row 6, second half): the
    // restored inputs are judged on a COPY and assigned only after
    // the verdict — the first cut mutated `st["inputs"]` in place
    // before the throw, so a REFUSED undo still leaked the dead wire
    // into the doc. No judgment path mutates what it has not yet
    // accepted.
    const inputs: Record<string, unknown> = {
      ...(isRecord(st["inputs"])
        ? (st["inputs"] as Record<string, unknown>)
        : {}),
    };
    const input: string = String(inv["input"] ?? "");
    if (inv["added"] === true) delete inputs[input];
    else if ("before" in inv) inputs[input] = inv["before"];
    // THE RESTORED WIRE IS JUDGED (2026-10-10, the write-seat
    // audit's row 6): the inverse restores a wire the rewire door
    // judged when it was CUT — but the bench has moved since (the
    // upstream stage may be gone, the $spell may have left params),
    // and rewireBench refuses to create exactly this state. Undo
    // walks the same wiring law over the RESTORED view BEFORE the
    // assignment; a refusal aborts the undo.
    admitWiring(
      st,
      isRecord(st["params"]) ? (st["params"] as Record<string, unknown>) : {},
      inputs,
      // (records are stagesOf's guarantee; an id-less row rides as "")
      stages
        .map((s: Record<string, unknown>): string => String(s["id"] ?? "")),
      stageId,
      session,
    );
    st["inputs"] = inputs;
    return;
  }
  // load/clear: the coarse fallbacks — restore the snapshot. (Undo
  // entries are never walk candidates — the skip at the top
  // guarantees it — so no "undo" disjunct here.)
  const snapshot: unknown =
    e.kind === "load" || e.kind === "clear" ? inv["stages_before"] : undefined;
  if (Array.isArray(snapshot)) {
    // THE SNAPSHOT IS JUDGED (the audit's GAP 4, the load arm): a
    // coarse fallback that assigns stages wholesale re-enters every
    // row with no seat looking — same laundering path as the
    // remove_stage arm, coarser. Judge every row BEFORE the
    // assignment; a refusal leaves the live bench untouched.
    for (const row of snapshot) {
      if (!isRecord(row)) continue;
      admitRestored(admit, row, isRecord(row["params"])
        ? (row["params"] as Record<string, unknown>)
        : {});
    }
    doc["stages"] = snapshot;
  }
}

// ── THE CHANGE EVENTS (the push source, 2026-09-12) ────────────────
// Every bench verb funnels through this module's writers; each
// successful write notifies. The stream remote (BenchRemoteService's
// bench/subscribe) rides these to PUSH fresh docs; the browser's
// resource provider consumes rev drift until the host's stream face
// lands (the collapse plan). One seam, every writer visible.

type BenchChangeListener = (session: string) => void;

/** The event seam this pure domain module reaches the bus through.
 *  `bench.ts` owns no Context (it is the domain layer, not a plugin),
 *  so the plugin installs the pair once and every writer here keeps
 *  calling {@link notifyBenchChange}. */
export interface BenchChangeSeam {
  emit: (session: string) => void;
  on: (fn: BenchChangeListener) => () => void;
}

let benchChangeSeam: BenchChangeSeam | null = null;

/** Install the seam (the plugin does this with its Context; tests do
 *  it with their own). Pass null to detach. */
export function setBenchChangeSeam(seam: BenchChangeSeam | null): void {
  benchChangeSeam = seam;
}

/** Detach the seam ONLY if `seam` is still the installed one — the
 *  ownership stamp that keeps dispose honest: a fiber that installed
 *  EARLIER (a newer install displaced it) detaches nothing, so the
 *  live seam survives the older fiber's unwind.
 * @param seam - the seam instance the caller installed.
 */
export function clearBenchChangeSeam(seam: BenchChangeSeam): void {
  if (benchChangeSeam === seam) benchChangeSeam = null;
}

/** Subscribe to bench writes; returns the unsubscribe.
 *
 *  THE LISTENER FAULT LAW rides HERE, not in the bus: `ctx.emit`
 *  stops at the first throwing listener and rethrows out of the emit
 *  (measured 2026-10-12 on cordis 4.0.4), while this module's
 *  contract is that a subscriber's fault never breaks the write and
 *  never starves the listeners after it. Wrapping the handler is what
 *  makes the typed event lawful here. */
export function onBenchChange(fn: BenchChangeListener): () => void {
  if (benchChangeSeam === null) {
    throw new Error(
      "estate-drafts: no bench change seam installed — the plugin installs it in apply(), tests call setBenchChangeSeam()",
    );
  }
  return benchChangeSeam.on((session: string): void => {
    try {
      fn(session);
    } catch (listenerError) {
      // listenerError: the contract keeps a subscriber's fault from
      // breaking the write, but the fault is not silence — the row
      // names it like the runs seam's own wrap does
      console.warn(
        "[estate-drafts] bench change listener refused for session " +
          JSON.stringify(session) + ":",
        listenerError,
      );
    }
  });
}

/** Fire the write event — the remote layer calls this after every
 *  successful bench write (the door seam: every in-process and
 *  host-routed write crosses the remote arms). */
export function notifyBenchChange(session: string): void {
  benchChangeSeam?.emit(session);
}

/** The public notify (the drafts-patch door writes bench docs from
 *  remote.ts — outside this module; it fires this with the session
 *  parsed from the bench-shaped draft id). */
export function notifyBenchDocWrite(draftId: string): void {
  const m = BENCH_DRAFT_RE.exec(draftId);
  if (m !== null) notifyBenchChange(m[1]!);
}
