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
import { admitWiring, benchBlockOf, strippedForAdmission, toleratedByRow, type BenchBlock } from "./bench.js";
import { STAGE_PATCH_KEYS, type StagePatchKey, RESTORED_PROVENANCE_SPELLING } from "@melite/contracts/benchStage";
export { STAGE_PATCH_KEYS, type StagePatchKey };
import { unwrapItemArrays } from "@melite/comfyui-card-kit";
import { openDraftsDomain } from "./store.js";
import { DRAFT_ID_RE } from "./spec.js";
import type { DraftRecord, DraftsDomainSpec } from "./spec.js";
import {
  addStageBench,
  addStagesBench,
  ensureBench,
  notifyBenchChange,
  notifyBenchDocWrite,
  onBenchChange,
  clearBenchChangeSeam,
  setBenchChangeSeam,
  type BenchChangeSeam,
  type LaneMigration,
  type FamilyReseat,
  getBench,
  groupBench,
  patchBench,
  clearBench,
  removeStageBench,
  reorderBench,
  rewireBench,
  undoBench,
  ungroupBench,
} from "./bench.js";
import { benchDraftIdOf } from "@melite/contracts/benchStage";
import type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchReorderRow,
  BenchRewireRow,
  BenchClearRow,
  BenchStageRow,
  BenchStagesRow,
  BenchUndoRow,
} from "./bench.js";

export type {
  BenchEnsureRow,
  BenchGetRow,
  BenchPatchRow,
  BenchReorderRow,
  BenchRewireRow,
  BenchStageRow,
  BenchStagesRow,
  BenchUndoRow,
} from "./bench.js";


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

/** JSON at the wire — the constrained face of every open doc. The
 *  Typert generator's boundary law refuses unconstrained `unknown`
 *  data in @Remote signatures (assertRemoteJsonType: "Remote
 *  boundary contains unconstrained unknown data"); open card
 *  payloads (stage params, results, history) are honestly JSON all
 *  the way down, so the wire face says exactly that. */
/** The WIRE plane's JSON tree — same deliberate readonly spelling as
 *  estate-runs' (the remote doc is a persisted record); the writer
 *  plane (card-kit graph.ts) spells it mutable. DRY sweep J13
 *  decision, 2026-10-18: variance recorded, not merged.
 *  @mode host */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Endpoint `drafts/get` answer — the stored draft doc (open,
 *  card-authored) with its stages resolved for the wire. */
export type DraftGetRow = { readonly [key: string]: JsonValue };

/** Endpoint `drafts/delete` answer — the id the door removed. */
export interface DraftDeleteRow {
  /** The canonical draft id the door removed. */
  draft_id: string;
}

/** Endpoint `drafts/patch` body — the door's FIXED key set (unknown
 *  keys refuse at admission with the old door's voice; STAGE_PATCH_KEYS).
 *  Optional: presence IS the write; a null params value is the
 *  merge-patch DELETE (the layered-params law); a null health value
 *  is the same DELETE (the recovery clear, LOW-23). */
export type DraftStagePatch = {
  params?: JsonValue;
  result?: JsonValue;
  runStatus?: JsonValue;
  health?: JsonValue;
  inputs?: JsonValue;
  inputOutputs?: JsonValue;
};

/** The bench verbs' wire body — an open JSON doc (each verb's
 *  admission law constrains its own keys at the door: stage,
 *  expect_rev, index, binding, …). */
export type BenchDoc = { readonly [key: string]: JsonValue };

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
  interface Events {
    /**
     * A bench write landed. Emitted after every successful bench verb
     * (and after the drafts-patch door's bench-shaped write).
     * @mode emit
     * @param session - the bench session whose doc changed.
     */
    "bench.changed": (session: string) => void;
  }
}

/** Install the typed bench event seam on a Context: `bench.ts`
 *  (the pure domain module) emits and subscribes through it.
 *
 *  ONE implementation, three callers: the plugin's service, the tests'
 *  `bootCtx`, and any direct construction outside the package (it is
 *  re-exported from index.ts). The seam is fiber-scoped — `ctx.effect`
 *  detaches it when the fiber is disposed.
 *
 *  ONE SEAM AT A TIME (measured 2026-10-12; the ownership stamp
 *  2026-10-18): the seam is module state, so the LAST install wins.
 *  Dispose carries the installer's stamp — an OLDER fiber's unwind
 *  clears only its own install and a displaced seam detaches nothing,
 *  so the live seam survives the older fiber's unwind. The estate is
 *  single-tenant here (one root Context, one plugin apply); the
 *  failure mode stays loud — `onBenchChange` with no seam installed
 *  refuses rather than subscribing to nothing.
 * @param ctx - the Context whose bus carries `bench.changed`.
 * @returns the effect disposer (the effect owns it; returned for direct callers that need an early detach).
 */
export function installBenchChangeSeam(ctx: Context): () => void {
  let detach: (() => void) | null = null;
  ctx.effect(() => {
    const mine: BenchChangeSeam = {
      emit: (session: string): void => { ctx.emit("bench.changed", session); },
      on: (fn: (session: string) => void): (() => void) => {
        const stop = ctx.on("bench.changed", fn);
        return () => { stop(); };
      },
    };
    setBenchChangeSeam(mine);
    // the ownership stamp: an older fiber's unwind clears only its own
    // install — a displaced seam detaches nothing (clearBenchChangeSeam)
    detach = () => { clearBenchChangeSeam(mine); };
    return detach;
  });
  return () => { detach?.(); };
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

/** ── THE OUTPUT HISTORY HELPERS (stroke 40) ──────────────────────
 *  resultOutputUrls now lives in trail.ts (the cycle-free seam) and
 *  is re-exported below with the trail laws. ───────────────────── */
export function sameResultOutputs(a: unknown, b: unknown): boolean {
  return sameUrlSet(resultOutputUrls(a), resultOutputUrls(b));
}

function sameUrlSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((u): boolean => sa.has(u));
}

/** ── THE TRAIL LAWS (2026-10-22, the operator's bench-session
 *  wounds — each carried its own failing wall in bench-trail.spec).
 *  The helpers live in trail.ts (the cycle-free seam bench.ts's
 *  carriers share); re-exported here for the door's public API. ── */
export { canonicalOutputUrl, resultOutputUrls, isTerminalTrailWord as isTerminalWord, trailDedupe } from "./trail.js";
import {
  canonicalOutputUrl, isTerminalTrailWord as isTerminalWord, resultOutputUrls, sameTrailRunIdentity,
} from "./trail.js";

function sameRunIdentity(a: unknown, b: unknown): boolean {
  return sameTrailRunIdentity(a, b);
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
  admitStageModel?(
    card: string,
    model: unknown,
  ): { ok: true } | { ok: false; error: string; offered: string[] };
  /** THE LANE ADMISSION (2026-10-10, the YOU_ARE_A_LIAR fix shape
   *  3): the registry judges the stage's declared lane — surface +
   *  relation words — over the SAME prepared params the next run
   *  composes, refusing at WRITE TIME in the field's voice with the
   *  cure in the message. The form gates inline from the same
   *  declaration (the judged grammar is shared:
   *  @melite/contracts/laneRelations). */
  admitStageRelations?(
    card: string,
    params: Record<string, unknown>,
  ): { ok: true } | { ok: false; error: string };
  /** THE FAMILY ADMISSION (journey-closure B5, 2026-10-17 — hop 3's
   *  first judge): the registry judges the card's own family clause
   *  (CardDefinition.admitFamily — h3-timeline's t4r inject-keys
   *  walk clause) over the MERGED params view — the params the next
   *  run would compose — so a patch that would land a family-illegal
   *  doc refuses at the write door in the run door's own voice,
   *  one hop earlier. Where the model and lane admissions are dict
   *  membership (board, surface, relation words), this judge is the
   *  family-conditional walk. Optional: a registry without the seam
   *  keeps the pre-B5 law. */
  admitStageFamily?(
    card: string,
    params: Record<string, unknown>,
  ): { ok: true } | { ok: false; error: string };
  /** THE LANE MIGRATION (operator 2026-10-12, the stuck-switch
   *  incident): a write that changes the resolved lane (variant
   *  and/or model axis) drops the stale carry — stated members the
   *  PRIOR lane's surface declared but the new lane's does not —
   *  BEFORE the admission judges, so the switch LANDS instead of
   *  refusing an unclickable cure. Returns the cleaned merged view
   *  (the input reference when nothing is stale). Optional: a
   *  registry without the seam keeps the pre-migration law. */
  laneMigrate?(
    card: string,
    params: Record<string, unknown>,
    priorParams: Record<string, unknown>,
  ): Record<string, unknown>;
  /** THE FAMILY RESEAT (the ERROR g/h cure, 2026-11-08): the
   *  registry drops the family-dead carry a flipped arrival strands
   *  (CardDefinition.reseatFamily — h3's reseatFamilyDead spine)
   *  BEFORE the admission judges and the row stores — the
   *  lane-migration law's spelling on the family axis. Optional: a
   *  registry without the seam keeps the pre-cure law. */
  reseatStageFamily?(
    card: string,
    params: Record<string, unknown>,
  ): { params: Record<string, unknown>; dropped: readonly string[] } | null;
  /** THE SCHEMA-MASTER REPAIR (2026-09-24): the registry's longest
   *  boarded-family dash-prefix repair for era model ids. Nullable —
   *  no match means no repair, the original refusal stands. */
  repairStageModel?(card: string, model: string): { model: string; variant?: string } | null;
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

/** THE WRITE-TIME MODEL ADMISSION (the no-silent-drop law's door):
 *  the registry refuses a model the card does not offer — or a
 *  boarded model the machine has not downloaded — the moment it
 *  would land on the bench (add/patch/load), with the offered list
 *  in the error. Registry-less lanes admit everything (the local
 *  derive; never a silent throw on the serve path).
 *
 *  THE RESTORE REPAIR (operator law 2026-09-24 — receipt: loading
 *  run-257737552c00's history refused "unknown model
 *  'qwen3-tts-voicedesign-design'"; the era's compose wrote ids
 *  today's registry never boarded, so the whole archive died at
 *  the load door). A RESTORED row (provenance 'restored' — the
 *  bench-load wand's stamp on every restore arm) whose model
 *  refuses gets ONE schema-master repair: the registry's longest
 *  boarded-family dash-prefix wins, a declared-variant suffix
 *  restores the variant coordinate, era junk strips. The repair
 *  mutates the row's params IN PLACE (the load lands repaired);
 *  a repair that still refuses rethrows the ORIGINAL refusal. A
 *  live-composed row (no provenance) never repairs — the loud
 *  refusal with the board is the composer's teaching surface.
 *  Exported for the wall (a pure factory over the resolver seat). */
export function admissionOf(ctx: Context): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined {
  const reg = resolverOf(ctx);
  if (reg === null || reg.admitStageModel === undefined) return undefined;
  return (card: string, params: Record<string, unknown>, provenance: unknown): void => {
    const admitOnce = (): void => {
      const verdict = reg.admitStageModel!(card, params["model"]);
      if (!verdict.ok) {
        throw new RemoteError(
          "bench/bad-model",
          verdict.error,
          { card, offered: verdict.offered },
        );
      }
    };
    try {
      admitOnce();
      return;
    } catch (original) {
      if (
        provenance !== RESTORED_PROVENANCE
        && provenance !== RESTORED_WIRE_SPELLING
        || typeof params["model"] !== "string"
        || params["model"] === ""
        || reg.repairStageModel === undefined
      ) throw original;
      const fix = reg.repairStageModel(card, params["model"]);
      if (fix === null) throw original;
      params["model"] = fix.model;
      if (
        fix.variant !== undefined
        && (params["variant"] === undefined || params["variant"] === "")
      ) {
        params["variant"] = fix.variant;
      }
      try {
        admitOnce();
      } catch {
        // the repair did not clear admission — the ORIGINAL refusal
        // is the honest voice, never the repair's shadow error
        throw original;
      }
    }
  };
}

/** The marker that says "this row is being restored BY US" — a
 *  symbol, so a request body carrying the string "restored" buys
 *  nothing (2026-10-10, the door audit's HIGH-2: the carve was
 *  purchasable). Internal restore arms pass this; nothing over the
 *  wire can. */
export const RESTORED_PROVENANCE: unique symbol = Symbol("melite.restored-provenance");

/** THE WIRE SPELLING, MAPPED (2026-10-10, the bypass audit's
 *  CRITICAL-1: the carve compared a SYMBOL that no wire can carry,
 *  so it never fired — every restored row was judged anyway, and the
 *  model-repair arm it also guards was dead. A caller cannot forge
 *  the symbol; it can only say the word `restored`, which is a
 *  REQUEST to restore, and this is the one place that turns the word
 *  into the server's authority. Nothing else in the tree needs it:
 *  the raw string is passed everywhere else and only these two
 *  comparisons treat it as the marker. */
/** THE CONTRACT'S SPELLING (the identity law, 2026-09-28) — the
 *  door and its callers read ONE coordinate, not two. */
export const RESTORED_WIRE_SPELLING = RESTORED_PROVENANCE_SPELLING;

/** The bench documents' id prefix (the bench family, not a flow export). */
const BENCH_ID_PREFIX = "bench-";

/** A plain record (the module's own shape guard). */
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** THE LANE ADMISSION SEAT (2026-10-10, the YOU_ARE_A_LIAR fix
 *  shape 3): after the model admission passes, the registry judges
 *  the DECL's own words — the lane surface + the relation words —
 *  over the merged stage params, refusing at WRITE TIME in the
 *  field's voice with the cure in the message (the operator's
 *  incident A: CustomVoice + design_prompt without voice_name,
 *  refused at bench-write, named, cured). RESTORED rows are exempt
 *  (the same carve the model repair rides: the archive loads, the
 *  Run refusal with the cure teaches — a fresh composer gets the a
 *  priori voice). Returns undefined when the registry seat offers
 *  no lane admission (registry-less lanes). Exported for the wall
 *  (a pure factory over the resolver seat, the admissionOf
 *  precedent). */
export function laneAdmissionOf(
  ctx: Context,
): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined {
  const reg = resolverOf(ctx);
  if (reg === null || reg.admitStageRelations === undefined) return undefined;
  return (card: string, params: Record<string, unknown>, provenance: unknown): void => {
    // THE CARVE IS THE SERVER'S, NOT THE CLIENT'S (2026-10-10, the
    // door audit's HIGH-2): `provenance` arrives in the request body,
    // and melite_construct's load verb forwards it verbatim — so a
    // caller could exempt any state by claiming "restored", and the
    // one receipt for the carve in the suite WAS that bypass. The
    // carve now rides a marker the SERVER sets, never a field a
    // caller writes: a domain-internal restore (bench-load) passes
    // the symbol below, and a client claim is just a string. The run
    // seat re-judges the DECL anyway (li-s), so a pre-law archive
    // still teaches at Run — the carve only spares a live composer
    // the a priori voice, and it is no longer purchasable.
    if (provenance === RESTORED_PROVENANCE || provenance === RESTORED_WIRE_SPELLING) {
      return // the archive loads; the run teaches
    }
    const verdict = reg.admitStageRelations!(card, params);
    if (!verdict.ok) {
      throw new RemoteError("bench/lane-refusal", verdict.error, { card });
    }
  };
}

/** THE LANE MIGRATION, RESOLVED (2026-10-12, the stuck-switch
 *  incident's door half): the registry seam the bench patch seat
 *  runs BEFORE the admission — a lane-switching write drops its
 *  stale carry (stated members the prior lane declared, the new
 *  lane does not) and LANDS instead of refusing an unclickable
 *  cure. Returns undefined when the registry offers no seam (the
 *  pre-migration law stands there). Exported for the wall, the
 *  laneAdmissionOf precedent. */
export function laneMigrationOf(
  ctx: Context,
): LaneMigration | undefined {
  const reg = resolverOf(ctx);
  if (reg === null || reg.laneMigrate === undefined) return undefined;
  return reg.laneMigrate.bind(reg);
}

/** THE FAMILY RESEAT SEAT (the ERROR g/h cure, 2026-11-08): the
 *  registry's reseat face bound for the bench doors — the flip's
 *  own writer, applied BEFORE the strip, the admission, and the
 *  store (the laneMigrationOf precedent). Undefined when the
 *  registry seat offers no reseat seam. Exported for the wall, the
 *  familyAdmissionOf precedent. */
export function familyReseatOf(
  ctx: Context,
): FamilyReseat | undefined {
  const reg = resolverOf(ctx);
  if (reg === null || reg.reseatStageFamily === undefined) return undefined;
  return reg.reseatStageFamily.bind(reg);
}

/** THE FAMILY ADMISSION SEAT (journey-closure B5, 2026-10-17 — hop
 *  3's first judge): the registry judges the card's OWN family
 *  clause (CardDefinition.admitFamily — the same clause the run
 *  door's compose walk enforces, riding the card's contract module)
 *  over the merged stage params. A Final-Cut stamp on a keyframe doc
 *  refuses at the write door with the run door's own voice
 *  (bench/family-refusal) instead of green-lighting to the run
 *  press — the patch door's "the params the NEXT run would compose"
 *  claim, made true for family-conditional cards. The SAME restore
 *  carve the lane admission rides (the server-set marker, never a
 *  caller's claim): the archive loads, the run teaches. Returns
 *  undefined when the registry seat offers no family seam
 *  (registry-less lanes, pre-B5 registries). Exported for the wall,
 *  the laneAdmissionOf precedent. */
export function familyAdmissionOf(
  ctx: Context,
): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined {
  const reg = resolverOf(ctx);
  if (reg === null || reg.admitStageFamily === undefined) return undefined;
  return (card: string, params: Record<string, unknown>, provenance: unknown): void => {
    if (provenance === RESTORED_PROVENANCE || provenance === RESTORED_WIRE_SPELLING) {
      return // the archive loads; the run teaches
    }
    const verdict = reg.admitStageFamily!(card, params);
    if (!verdict.ok) {
      throw new RemoteError("bench/family-refusal", verdict.error, { card });
    }
  };
}

/** THE BENCH-WRITE ADMISSION, COMPOSED (2026-10-10): the model
 *  admission (board + repair law) THEN the lane admission (the
 *  DECL's surface + relation words — fix shape 3) THEN the family
 *  admission (B5 — the card's own family-conditional walk clause
 *  over the merged view, the run door's voice one hop earlier).
 *  The trio is what every params-bearing bench write walks
 *  (ensure/patch/add/load); any judge refusing refuses the write in
 *  its own voice. Each seat is optional; absent seats drop out. */
export function benchAdmissionOf(
  ctx: Context,
): ((card: string, params: Record<string, unknown>, provenance: unknown) => void) | undefined {
  const modelAdmit = admissionOf(ctx);
  const laneAdmit = laneAdmissionOf(ctx);
  const familyAdmit = familyAdmissionOf(ctx);
  const judges = [modelAdmit, laneAdmit, familyAdmit].filter(
    (j): j is NonNullable<typeof j> => j !== undefined,
  );
  if (judges.length === 0) return undefined;
  if (judges.length === 1) return judges[0];
  return (card: string, params: Record<string, unknown>, provenance: unknown): void => {
    for (const judge of judges) judge(card, params, provenance);
  };
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
/** THE BENCH WRITE TRANSACTION (the round-14 race audit's R1/R2/R3,
 *  2026-10-22): every bench mutation is load → CAS check → sync mutate
 *  → terminal put, and its fence compares a rev read in its own
 *  prologue. Two verbs dispatched together both read rev N, both pass
 *  the fence (the check is sync; the only yield is the put), and both
 *  persist rev N+1 — the contracted 409 never fires, the log carries
 *  duplicate revs, and rev-keyed undo targeting conflates the pair.
 *  `undo` is worse: it mutates a deep copy and swaps it in, so a
 *  sibling put landing last discards the other writer wholesale while
 *  both log entries survive. Both services in this module write the
 *  same doc, so the lock is one map keyed by the canonical draft id
 *  (`benchDraftIdOf(session)`) and both doors queue on it. The chain
 *  carries no failure: every link releases in a `finally`, so a
 *  refused verb cannot poison the verbs behind it. */
const benchTransactions = new Map<string, Promise<void>>();

async function withBenchWrite<T>(
  draftId: string,
  body: () => Promise<T>,
): Promise<T> {
  const prev = benchTransactions.get(draftId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const mine = prev.then(() => gate);
  benchTransactions.set(draftId, mine);
  await prev;
  try {
    return await body();
  } finally {
    release();
    if (benchTransactions.get(draftId) === mine) benchTransactions.delete(draftId);
  }
}

export class DraftsRemoteService extends TypertRemoteService {
  /** THE BENCH ADMISSION THIS DOOR OWNS (2026-10-10, the door
   *  audit's CRITICAL): the same composed admission the bench
   *  doors walk, injected at construction from the resolver seat. A
   *  bench doc is a drafts doc ("bench-<session>" satisfies
   *  DRAFT_ID_RE), and the GUI's param editor rides THIS door — so
   *  without the seat a keystroke could write a stage the agent's
   *  bench/patch would refuse. Registry-less lanes get undefined
   *  (the standing degrade, never a throw). */
  /** Read LAZILY, never at construction (2026-10-10): the drafts row
   *  can be constructed before the cards registry seats, and a
   *  captured `undefined` would be a permanent silent degrade — the
   *  exact class of hole this door was closed for. One resolver
   *  lookup per write, and the seat is whatever is live then. */
  private benchAdmit():
    | ((card: string, params: Record<string, unknown>, provenance: unknown) => void)
    | undefined {
    return benchAdmissionOf(this.ctx);
  }

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
  ): Promise<DraftGetRow> {
    return (await this.get(draftId, signal)) as DraftGetRow;
  }

  /** Endpoint `drafts/delete` — removes one doc WHOLE (2026-10-22,
   *  the scratch-residue door): auditor probe docs and other debris
   *  were clearable only by hand because the plane had no delete
   *  verb. The removal JOINS the bench write chain for the same id
   *  (a delete never interleaves an in-flight bench transaction on
   *  the doc it removes) and refuses loud on every bad shape —
   *  never a silent no-op. */
  @Remote("delete")
  async remoteExportDelete(
    draftId: string,
    signal: AbortSignal,
  ): Promise<DraftDeleteRow> {
    return await this.delete(draftId, signal);
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

  /** The in-process delete arm (the adapter above delegates here):
   *  id law first, then the removal INSIDE the bench write chain —
   *  the same serialization the bench doors queue on — and a loud
   *  not-found when the id names no doc (KvTable.delete answers
   *  false; the door never turns that into a silent success). */
  async delete(draftId: string, signal: AbortSignal): Promise<DraftDeleteRow> {
    signal.throwIfAborted();
    if (!DRAFT_ID_RE.test(draftId)) {
      throw new RemoteError("draft/bad-id", `bad draft id ${JSON.stringify(draftId)}`, {
        draftId,
      });
    }
    return await withBenchWrite(draftId, async (): Promise<DraftDeleteRow> => {
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
      const removed = await drafts.table("docs").delete(draftId);
      if (!removed) {
        throw new RemoteError("draft/not-found", `draft not found: ${draftId}`, {
          draftId,
        });
      }
      return { draft_id: draftId };
    });
  }

  /** Endpoint `drafts/patch` — the stage patch door, REBORN on the
   *  domain (2026-09-11; the gateway-era PATCH /v1/flows/drafts/:id/
   *  stages/:sid died with the app and stroke L left the client door
   *  a throwing stub). Semantics VERBATIM from the old door (hDraftStagePatch, the retired gateway drafts door): admission on the fixed key set (STAGE_PATCH_KEYS: params | result | runStatus | inputs | inputOutputs — unknown
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
    patch: DraftStagePatch,
    expectRev: number | null,
    signal: AbortSignal,
  ): Promise<DraftPatchRow> {
    return await this.patch(draftId, stageId, patch, expectRev, signal);
  }

  /** The patch arm the adapter above delegates to — one write
   *  transaction on the draft's own key, shared with the bench
   *  verbs (the round-14 race audit's R3: the author arm's
   *  spread-copy of the log forked against their in-place push). */
  async patch(
    draftId: string,
    stageId: string,
    patch: Record<string, unknown>,
    expectRev: number | null,
    signal: AbortSignal,
  ): Promise<DraftPatchRow> {
    return withBenchWrite(draftId, () =>
      this.patchBody(draftId, stageId, patch, expectRev, signal));
  }

  private async patchBody(
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
    // THE EMPTY BODY (the telemetry law's edge, 2026-10-08): {} is
    // vacuously "telemetry" (every() on no keys) — without this arm
    // it would persist an unchanged doc and wake the stream for
    // nothing. An empty patch is a caller bug: refuse with the
    // door's own voice, like the bench verb refuses its own.
    if (Object.keys(patch).length === 0) {
      throw new RemoteError(
        "draft/bad-patch",
        "patch is empty (nothing to patch)",
        {},
      );
    }
    // THE INPUT KEYS ARE SHAPE-GATED AT THE DOOR (audit S-S8,
    // 2026-10-22): the non-bench arm stored `inputs` verbatim (the
    // wire type permits any JsonValue) and the next compile refused
    // the poisoned row far from the write; `inputOutputs` stored
    // verbatim on BOTH seats while the bench verb refuses the key
    // outright. One shape per key now: inputs is the channel ->
    // wiring record (the bench arm's own isObj law), inputOutputs
    // is the per-slot output-name list (string or null per slot —
    // the wire contract FlowStage declares). The compile seat keeps
    // the deep wiring law; this gate only refuses what could never
    // compile, at the write that would have poisoned the doc.
    if ("inputs" in patch && !isObj(patch["inputs"])) {
      throw new RemoteError(
        "draft/bad-patch",
        "inputs must be an object (channel -> wiring)",
        {},
      );
    }
    if ("inputOutputs" in patch) {
      const io: unknown = patch["inputOutputs"];
      if (
        !Array.isArray(io) ||
        !io.every((entry: unknown): boolean => entry === null || typeof entry === "string")
      ) {
        throw new RemoteError(
          "draft/bad-patch",
          "inputOutputs must be a list of output names (string or null per input slot)",
          {},
        );
      }
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
    // THE TELEMETRY LAW (operator 2026-10-08: "rev keeps ticking *up*
    // even when I am just generating a song"): a patch body whose
    // keys are ALL run telemetry (result and/or runStatus — never
    // params/inputs/inputOutputs) is a RUN FACE, not an author move.
    // The outcome observer writes one such body per poll state —
    // run start, EVERY progress frame, terminal — and under the
    // every-write-bumps law the bench's CAS rev ticked for the whole
    // generation (held expect_revs went stale mid-run; the undo log
    // filled with no-op 'patch' entries that consumed undo targets
    // restoring params_before:{} — telemetry was never authorship).
    // Telemetry now writes the stage row (result/runStatus + the
    // derived history archive) and fires the doc-write notify, but
    // does NOT fence, does NOT bump bench.rev, does NOT append to
    // the bench log — last-write-wins is the poll's own semantics,
    // and the rebase dance the client kept performing was this
    // fence's disease, not its cure. Any body carrying an author key
    // (params | inputs | inputOutputs) walks the full law unchanged.
    const bench = benchBlockOf(doc);
    // `health` walks the telemetry arm with result/runStatus (LOW-23,
    // 2026-10-12): it is the poll's transport word — the escalation
    // writes it, the recovery clears it, neither is authorship.
    const telemetry: boolean = Object.keys(patch).every(
      (k: string): boolean => k === "result" || k === "runStatus" || k === "health",
    );
    // THE CAS WALK (the layered-params law): an AUTHOR patch is a
    // bench author and joins the revision law every other author
    // walks — fence on expectRev BEFORE any mutation (the record is
    // the domain's cached object; a refusal must leave no trace),
    // then bump and log below. A bench that moved under the caller
    // refuses loud, never merges under it.
    if (!telemetry) {
      // THE MISSING-REV FENCE (audit S-S2, 2026-10-22): expectRev
      // null skipped the CAS fence the bench verbs mandate (their
      // law: a non-number expect_rev is a guaranteed refusal) — an
      // unfenced author write merged silently under a moved bench.
      // The door speaks the bench's voice, and the refusal carries
      // current_rev so a rebase-and-retry lands (the client's CAS
      // predicate already names this code).
      if (expectRev === null) {
        throw new RemoteError(
          "bench/cas-conflict",
          "expect_rev is required (the CAS law)",
          { current_rev: bench.rev },
        );
      }
      if (bench.rev !== expectRev) {
        throw new RemoteError(
          "bench/cas-conflict",
          `bench moved under the patch (expect_rev ${expectRev}, current ${bench.rev}) — re-read and re-apply`,
          { current_rev: bench.rev, expect_rev: expectRev },
        );
      }
    }
    // THE TELEMETRY WRITE IS DEFERRED (the bench audit's gap 1,
    // The arms run as one closure AFTER both gates pass. The closure
    // takes the row as its PARAM (shadowing this section's binding):
    // the R6 cure below re-resolves the LIVE row at call time.
    const writeTelemetry = (stage: Record<string, unknown>): void => {
    if ("result" in patch) {
      // THE OUTPUT HISTORY (stroke 40 — the operator's QOL law: the
      // preview's mini row is a CARD OUTPUT HISTORY): a stage's
      // result is the CURRENT run's face, and every poll state
      // overwrites it — the live patch ({run_id, progress}) would
      // destroy the previous run's outputs. Before any result
      // overwrite, a result CARRYING outputs is archived onto the
      // stage's history, newest first, capped (12), deduped by its
      // url set: only UNIQUE outputs ride (the operator's word — a
      // re-run landing the same urls never double-lists). The
      // history is DERIVED here, never patched in — the estate owns
      // the trail; the client reads it.
      //
      // THE PARAMS SNAPSHOT (the output-component stroke — "old
      // generations that had different parameters"): the params that
      // MADE a result are captured at ITS LANDING (a parallel
      // server-derived key), never at overwrite time — params
      // edited between runs must not retroactively re-label the old
      // generation. The archive entry carries the snapshot; the
      // client diffs it against the live params for the chip.
      // THE TERMINAL-HOLDS LAW (bench-trail W3, judged PRE-write): a
      // settled run's row never un-settles — a stale poll/tail pass
      // re-stamping a non-terminal word for the SAME run_id writes
      // NOTHING (result included; the tile's stuck face). A
      // different run_id is a fresh press and runs.
      const settledRunId =
        typeof stage["result"] === "object" && stage["result"] !== null && !Array.isArray(stage["result"])
          ? (stage["result"] as Record<string, unknown>)["run_id"]
          : undefined;
      const patchRunId =
        typeof patch["result"] === "object" && patch["result"] !== null && !Array.isArray(patch["result"])
          ? (patch["result"] as Record<string, unknown>)["run_id"]
          : undefined;
      if (
        isTerminalWord(stage["runStatus"]) && !isTerminalWord(patch["runStatus"])
        && typeof patchRunId === "string" && sameRunIdentity(settledRunId, patchRunId)
      ) return;
      // THE HUSK-DOWNGRADE REFUSAL (trail-defect-hunt §2): a
      // terminal, url-less result for a run whose settled face
      // carries urls is bookkeeping (the seat's own mirror husk
      // racing the client's rich patch) — the hero slot never
      // downgrades. A DIFFERENT run_id is a fresh press and runs.
      if (
        isTerminalWord(patch["runStatus"]) && sameRunIdentity(settledRunId, patchRunId)
        && resultOutputUrls(stage["result"]).length > 0
        && resultOutputUrls(patch["result"]).length === 0
      ) return;
      const prev = stage["result"];
      const next = patch["result"];
      // THE TRAIL IS ONE LIST, HEAD = CURRENT (operator 2026-09-21,
      // the lost-gen disease: "when I make a new gen it doesn't
      // appear in history — clicking a history item overwrites the
      // preview with no way to recover the most recent gen"). Two
      // archives ride the SAME write, oldest-first so the order in
      // the list is append-stable:
      //   1. SUPERSEDE — a cleared/overwritten result that carried
      //      outputs is archived (the stroke-40 law, unchanged: a
      //      face that would LOSE urls never drops them).
      //   2. LANDING — the incoming result itself, when it CARRIES
      //      outputs AND the write is not a LIVE face (the
      //      settled-landing law, bench-trail W1: the current run's
      //      urls never enter history before the card finishes; a
      //      mid-run face archives nothing). A result-only patch (no
      //      runStatus arm) is a pick/manual spell, not a run face —
      //      it lands unless the row reads a live word (the landing
      //      gate below).
      //      History[0] is ALWAYS the newest SETTLED gen. Live
      //      mid-run patches ({run_id, progress} — no urls) archive
      //      nothing either way, and the dedup makes re-landings
      //      idempotent.
      const archiveInto = (urls: string[], entry: Record<string, unknown>): void => {
        const hist = Array.isArray(stage["history"]) ? [...(stage["history"] as unknown[])] : [];
        // THE ONE-ROW-PER-RUN LAW (bench-trail W2): a run is one
        // history entry — the media route and the gallery proxy
        // spell the same file differently, so identity is the
        // run_id, with the canonical-url set as the no-id fallback
        const entryRunId = typeof entry["run_id"] === "string" ? entry["run_id"] : undefined;
        if (entryRunId !== undefined) {
          const already = hist.some(
            (e): boolean => sameRunIdentity((e as Record<string, unknown>)["run_id"], entryRunId),
          );
          if (already) return;
        }
        const canon = urls.map(canonicalOutputUrl);
        const already = hist.some((e): boolean =>
          sameUrlSet(
            resultOutputUrls(e).map(canonicalOutputUrl),
            canon,
          ),
        );
        if (!already) {
          hist.unshift(entry);
          stage["history"] = hist.slice(0, 12);
        }
      };
      // the landing gate (bench-trail W1 vs the pinned pick-spell
      // contract, remote.spec "empty {} snapshot"): a write that
      // DECLARES a live run face (a non-terminal runStatus arm)
      // never lands; a terminal arm lands; and a patch with NO
      // runStatus arm at all is not a run face — it lands unless the
      // row is mid-run (a live word), which is the stuck-row wound's
      // re-add shape.
      const LIVE_TRAIL_WORDS = new Set(["running", "queued", "pending", "stopping"]);
      const landingTerminal =
        isTerminalWord(patch["runStatus"]) ||
        (!("runStatus" in patch) && !LIVE_TRAIL_WORDS.has(String(stage["runStatus"])));
      // the params arm rides only when the snapshot NAMES something —
      // an undefined or empty {} snapshot carries no key (the chip
      // diffs against live params; an empty diff is no chip at all)
      const paramsArm = (snapshot: unknown): Record<string, unknown> =>
        snapshot !== undefined && typeof snapshot === "object" && !Array.isArray(snapshot)
        && Object.keys(snapshot as Record<string, unknown>).length > 0
          ? { params: snapshot }
          : {};
      if (resultOutputUrls(prev).length > 0 && !sameResultOutputs(prev, next)) {
        archiveInto(resultOutputUrls(prev), {
          ...(prev as Record<string, unknown>),
          ...paramsArm(stage["resultParams"]),
        });
      }
      stage["result"] = patch["result"];
      stage["resultParams"] = stage["params"];
      const landingUrls = resultOutputUrls(next);
      if (landingUrls.length > 0 && landingTerminal) {
        archiveInto(landingUrls, {
          ...(next as Record<string, unknown>),
          ...paramsArm(stage["resultParams"]),
        });
      }
    }
    if ("runStatus" in patch) stage["runStatus"] = patch["runStatus"];
    // THE HEALTH ARM (LOW-23): the transport word's own channel — a
    // null value DELETES the field (the recovery clear; a stage that
    // never escalated never carries it), the merge-patch semantics
    // the params arm already owns.
    if ("health" in patch) {
      if (patch["health"] === null) delete stage["health"];
      else stage["health"] = patch["health"];
    }
    }
    // the params the row will HOLD once this write lands (undefined
    // when the body carries no params arm) — judged as half of the
    // (params, inputs) PAIR before either assignment rides.
    let pendingParams: Record<string, unknown> | undefined;
    // NON-RECORD PARAMS REFUSE (audit S-E1, 2026-10-22): this arm
    // used to fall through its own record guard — a string, number,
    // array (the batch-P corruption family) or boolean body answered
    // delivered:true with a rev bump while merging NOTHING, and the
    // bench verb refuses the identical body. The GUI's keystroke
    // door speaks the bench's voice.
    if (
      "params" in patch && patch["params"] !== null &&
      (typeof patch["params"] !== "object" || Array.isArray(patch["params"]))
    ) {
      throw new RemoteError("bench/bad-body", "params must be an object", {});
    }
    // WHOLE-MAP DELETE (the type comment's promise, S-E1's second
    // half): the per-key law at map scale — presence IS the write,
    // and a null params value DELETES the whole map. The empty view
    // rides the SAME pair-gate below (a delete can orphan a $spell
    // into a dead wire exactly like a per-key null can).
    const paramsWholeDelete = "params" in patch && patch["params"] === null;
    if (paramsWholeDelete) pendingParams = {};
    if ("params" in patch && patch["params"] !== null && typeof patch["params"] === "object" && !Array.isArray(patch["params"])) {
      // PER-KEY merge (never replace) — the old door's law, now with
      // JSON Merge Patch null semantics: a null value DELETES the
      // key (the layered-params unset path — presence IS the override
      // mark, so removal is a first-class write, never a value trick).
      const merged: Record<string, unknown> =
        stage["params"] !== null && typeof stage["params"] === "object" && !Array.isArray(stage["params"])
          ? { ...(stage["params"] as Record<string, unknown>) }
          : {};
      // THE STORE-SEAT UNWRAP (the bench audit's gap 10, 2026-10-10):
      // every other params-bearing door (add, patch, load) unwraps the
      // wire's {item:[…]} array shape before it stores, so storage
      // holds clean arrays; this door merged the raw body, so the SAME
      // patch through bench/patch and through drafts/patch produced
      // two different stored rows — and the wrapped shape is poison
      // for every reader downstream.
      const incoming: Record<string, unknown> = unwrapItemArrays(
        patch["params"] as Record<string, unknown>,
      ) as Record<string, unknown>;
      for (const k of Object.keys(incoming)) {
        if (incoming[k] === null) delete merged[k];
        else merged[k] = incoming[k];
      }
      // THE DRAFTS DOOR IS A BENCH DOOR (2026-10-10, the door
      // audit's CRITICAL): bench docs live in THIS table (a
      // "bench-<session>" id satisfies DRAFT_ID_RE), and the GUI's
      // param editor rides exactly this call (card-view's
      // patchStageParams) — so every keystroke edited a live stage
      // with the model board AND the lane relations unjudged, while
      // the agent's bench/patch refused the identical body. The
      // merged view (never the patch arm alone — a per-key merge
      // composes with what the row already carried) walks the same
      // composed admission, BEFORE the assignment: the domain's
      // cached record is mutated in place below, so a refusal after
      // the assignment would leak the refused merge.
      const stageCard = typeof stage["card"] === "string" ? stage["card"] : ""
      const admit = this.benchAdmit()
      if (stageCard !== "" && admit !== undefined) {
        // NO PROVENANCE (the audit's GAP 3): the restored carve is
        // load-time grace; a patch is a live compose act judged by
        // the DECL the next run composes from. Forwarding the row's
        // provenance here made the grace sticky forever.
        // THE JUDGE SEES THE STORED ROW (2026-10-10, the write-seat
        // audit's row 7): the same self-naming strip every bench
        // door judges through — a model key naming the row's own
        // card never survives to compose, so this door judges the
        // stripped view or refuses what the run admits.
        admit(stageCard, strippedForAdmission(stageCard, merged), undefined)
      }
      // DEFERRED (the write-seat audit's row 3, second half): the
      // assignment waits for the wiring pair-gate below — the pair
      // (params, inputs) is judged as ONE write, and a refused
      // orphan must leak NEITHER half into the cached record.
      pendingParams = merged;
    }
    // THE WIRING ARM ADMITS TOO (2026-10-10, the bypass audit's
    // CRITICAL-2: the params arm walked the composed admission and
    // this one did not — so a keystroke through the GUI's param
    // editor could write a phantom wire or a $spell that the agent's
    // bench/patch refuses on the identical body. The wiring gate is
    // the bench domain's own (one implementation): the MERGED edges,
    // judged against the live set BEFORE the assignment (the cached
    // record mutates in place below).
    // ONLY A BENCH ROW HAS A LIVE SET to admit against (2026-10-10):
    // this door also patches FLOW-export drafts, whose inputs wire
    // stages of their own document — a different law, judged where
    // that document is compiled. The wiring gate belongs to the bench.
    // A FLOW-EXPORT DOC'S INPUTS ARE ITS OWN DOCUMENT'S LAW
    // (2026-10-10, the work audit's R2): the merge + null-delete shape
    // below is the BENCH's wire law (a bench row is patched in place,
    // so `null` must remove an edge). A flow-export draft replaces its
    // inputs wholesale, which is what this door did before the wiring
    // gate was added and what a later cut silently changed. The gate
    // itself is bench-only — a flow doc's stages wire within their own
    // document, judged where that document is compiled.
    const isBenchDoc = draftId.startsWith(BENCH_ID_PREFIX);
    if (!isBenchDoc) {
      if ("inputs" in patch) stage["inputs"] = patch["inputs"];
    } else {
      const priorInputs = isObj(stage["inputs"]) ? stage["inputs"] as Record<string, unknown> : {};
      const mergedInputs = { ...priorInputs };
      if (isObj(patch["inputs"])) {
        for (const [chan, ref] of Object.entries(patch["inputs"] as Record<string, unknown>)) {
          if (ref === null) delete mergedInputs[chan];
          else mergedInputs[chan] = ref;
        }
      }
      // THE PAIR, NOT THE HALF (2026-10-10, the write-seat audit's
      // row 3): the gate used to run only when the body carried
      // `inputs`, so a params-only keystroke that dropped the
      // "$image" spell orphaned the wire SILENTLY — the merged pair
      // nobody judged was exactly the dead wire bench/patch refuses
      // on the identical body. The gate now runs whenever EITHER
      // half of the pair changes, over the PENDING params (the row's
      // next view) and the merged inputs, BEFORE either lands.
      if (pendingParams !== undefined || "inputs" in patch) {
        // THE LIVE SET READS THE STAGES THE LOOKUP ABOVE ALREADY
        // WALKED (the re-audit, 2026-10-16): `doc["stages"]` is the
        // same value `stages.find` answered one screen up — a value
        // that answers `find` is the array it walked — so the
        // non-array arm and this row's own `?? ""` were dead legs
        // (the row is the very one the finder selected BECAUSE its
        // `id` equals the stage id asked for).
        const liveIds = (doc["stages"] as unknown[])
          .map((r) => (isObj(r) ? String(r["id"] ?? "") : ""))
          .filter((id) => id !== stageId);
        admitWiring(
          stage,
          pendingParams !== undefined
            ? pendingParams
            : (isObj(stage["params"]) ? stage["params"] as Record<string, unknown> : {}),
          mergedInputs,
          liveIds,
          stageId,
          draftId.replace(/^bench-/, ""),
          // THE UN-WEDGE LAW (audit S-S1, 2026-10-22): every bench
          // author seat tolerates the row's PRE wounds — a
          // pre-broken input ref (dead before this patch) must not
          // wedge every later keystroke with a 400 on the GUI's own
          // param door. The tolerate set is built from the PRE row's
          // inputs against the pre-live ids (the assignments below
          // have not landed yet), so a fresh dead ref this patch
          // introduces stays strict.
          toleratedByRow([stage], new Set(liveIds)).get(stageId),
        );
      }
      stage["inputs"] = mergedInputs;
    }
    if (pendingParams !== undefined) {
      // THE STORED ROW IS THE JUDGED ROW (the bench audit's gap 3,
      // 2026-10-10): this door judged the stripped view and stored
      // the raw one — so a doc written here held a self-naming model
      // key that add/load never store, and the next reader judged a
      // different object than the one on disk. Strip once, judge that,
      // store that. The whole-map delete takes the key out entirely —
      // the row goes bare, the same shape a fresh add carries.
      if (paramsWholeDelete) delete stage["params"];
      else stage["params"] = strippedForAdmission(
        typeof stage["card"] === "string" ? (stage["card"] as string) : "",
        pendingParams,
      );
    }
    if ("inputOutputs" in patch) stage["inputOutputs"] = patch["inputOutputs"];
    // EVERY GATE PASSED — the telemetry write lands now (deferred
    // above so a refusal left no result behind; the run seat's own
    // polls ride the same door and are judged by nothing, which is
    // correct: a poll is not a composition).
    // R6 CURE (round-14 race audit, LOW — telemetry-vs-remove window):
    // the row this section resolved at its top can be REMOVED while
    // the gates ran (remove_stage's resume section between the lookup
    // and this call) — writing into the detached row then persisted
    // the removal with the outcome written nowhere. Re-resolve the
    // LIVE row here, immediately before the write: a still-present
    // row takes the telemetry; a removed row skips the write (its
    // next poll reads the honest delivered:false at the top lookup).
    const liveStage = (doc["stages"] as unknown[]).find(
      (s): s is Record<string, unknown> =>
        typeof s === "object" && s !== null && (s as Record<string, unknown>)["id"] === stageId,
    );
    if (liveStage !== undefined) writeTelemetry(liveStage);
    // THE BUMP (author patches only — the telemetry law above): the
    // rev advances and the log carries the entry; a telemetry write
    // persists the row WITHOUT touching the bench block (no bump, no
    // log — the answer serves the CURRENT rev so a caller that treats
    // it as the next CAS handle stays honest).
    let rev = bench.rev;
    // THE INNER-KEY RECEIPT (operator 2026-09-23: "I changed the seam
    // from cut to carried" — the toggle left NO trace: every params
    // patch logged the summary "params", so four revs of edits could
    // not be told apart from four model stamps. A params patch now
    // names the keys it merged — the log alone answers "did the seam
    // write ever land".) The spell: `params` alone when the patch
    // carried an empty/non-object params arm (a door refusal would
    // never let us get here), else `params:<inner keys sorted>`.
    const paramsSummary = (p: unknown): string => {
      if (p === null || typeof p !== "object" || Array.isArray(p)) return "params";
      const inner = Object.keys(p as Record<string, unknown>).sort();
      return inner.length === 0 ? "params" : "params:" + inner.join(",");
    };
    const summary = Object.keys(patch).sort()
      .map((k) => (k === "params" ? paramsSummary(patch["params"]) : k))
      .join(",");
    if (!telemetry) {
      rev = bench.rev + 1;
      const log = [...bench.log, {
        rev,
        at: Math.floor(Date.now() / 1000),
        author: "user",
        kind: "patch",
        stage: stageId,
        summary,
      }] as BenchBlock["log"];
      doc["bench"] = { rev, log };
    }
    // THE AUDIT VOICE (the same night): the patch's arrival and its
    // named keys also land in the service log — a UI write that dies
    // client-side (never sent) leaves NO such line, so the silence is
    // distinguishable from a refusal.
    this.ctx.logger.info("drafts/patch %s %s rev=%d %s", draftId, stageId, rev, summary);
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
    // THE EVENT SEAT (the hand-roll row 1.2, 2026-10-12): the bench
    // push spine is the typed `bench.changed` event, not a module Set.
    installBenchChangeSeam(ctx);
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
  async *subscribe(
    sessionKey: string,
    signal: AbortSignal,
  ): AsyncIterable<BenchGetRow> {
    signal.throwIfAborted();
    for (;;) {
      // SUBSCRIBE BEFORE READ (audit S-S3, 2026-10-22): the change
      // watch attaches BEFORE the read, not after the yield. A write
      // landing while the consumer still holds the delivered row (the
      // generator suspended at the yield — no park listener attached)
      // once matched no listener and the park slept until the NEXT
      // write; the flag re-loops at once instead of parking past it.
      let changedMidFlight = false;
      const offWatch = onBenchChange((session) => {
        if (session === sessionKey) changedMidFlight = true;
      });
      try {
      // THE ZERO-STATE LAW (the stream tail's birth watch): a fresh
      // conversation's bench does not exist until its first write.
      // The gateway's RemoteStream classifies a REJECTED open as
      // TERMINAL (no retry — terminalStreamFailure), so a throwing
      // first read here would kill the browser's whole bench stream
      // the moment a conversation starts. The watch instead serves
      // the ZERO STATE (rev 0, empty stages — the same row shape the
      // client's emptyBench served in the poll era) and stays open:
      // the birth (ensure's notifyBenchChange) wakes the park and the
      // next read serves the born bench. `bench/get` still refuses
      // not-found for direct unary callers — only the WATCH degrades.
      let row: BenchGetRow;
      try {
        row = await this.get(sessionKey, signal);
      } catch (error) {
        if (
          error instanceof RemoteError &&
          error.code === "bench/not-found"
        ) {
          row = {
            draft_id: benchDraftIdOf(sessionKey),
            session: sessionKey,
            rev: 0,
            intent: "",
            stages: [],
            log: [],
          };
        } else {
          throw error;
        }
      }
      yield row;
      // wake on the session's next write (or abort). An abort that
      // landed while the generator was suspended AT A YIELD has no
      // park listener attached — the executor re-checks
      // signal.aborted AND the mid-flight watch flag (S-S3) so the
      // missed event still wakes the park. The stream then ends
      // CLEAN on abort (done: true — the holder released; a throw
      // would surface as an error on a normal close). One finish arm
      // removes BOTH listeners: no stale abort listener per park.
      await new Promise<void>((resolve) => {
        if (signal.aborted || changedMidFlight) {
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
      } finally {
        offWatch();
      }
    }
  }

  /** Endpoint `bench/ensure` — birth or load (the only creating arm). */
  @Remote("ensure")
  async remoteExportEnsure(
    doc: BenchDoc,
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
    return { ...row, stages: withResolvedStages(this.ctx, row.stages) as JsonValue };
  }

  /** The in-process API the adapter above delegates to. */
  async ensure(
    doc: BenchDoc,
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
    const session: string = typeof doc["session"] === "string" ? doc["session"] : "";
    const row: BenchEnsureRow = await withBenchWrite(benchDraftIdOf(session), () =>
      ensureBench(drafts, doc, benchAdmissionOf(this.ctx)));
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
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchPatchRow> {
    return await this.patch(sessionKey, doc, signal);
  }

  /** Endpoint `bench/add-stage` — append a card stage. */
  @Remote("add-stage")
  async remoteExportAddStage(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.addStage(sessionKey, doc, signal);
  }

  /** Endpoint `bench/add-stages` — append N stages as ONE write (the
   * restore law: the CAS chains server-side, one save, one history
   * event). */
  @Remote("add-stages")
  async remoteExportAddStages(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStagesRow> {
    return await this.addStages(sessionKey, doc, signal);
  }

  /** Endpoint `bench/remove-stage` — splice one stage out. */
  @Remote("remove-stage")
  async remoteExportRemoveStage(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    return await this.removeStage(sessionKey, doc, signal);
  }

  /** Endpoint `bench/clear` — THE OPERATOR'S CLEAR ALL (2026-10-10,
   *  "there is no clear all"): every stage out in one verb, one log
   *  entry, undoable whole. The nuclear seat for a bench that is
   *  itself the wound. */
  @Remote("clear")
  async remoteExportClear(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchClearRow> {
    return await this.clear(sessionKey, doc, signal);
  }

  /** Endpoint `bench/rewire` — set or clear one input binding. */
  @Remote("rewire")
  async remoteExportRewire(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    return await this.rewire(sessionKey, doc, signal);
  }

  /** Endpoint `bench/reorder` — move one stage to a new index (the
   *  drag-reorder door, 2026-09-11). */
  @Remote("reorder")
  async remoteExportReorder(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchReorderRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(sessionKey), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await reorderBench(drafts, sessionKey, doc);
      notifyBenchChange(sessionKey);
      return row;
    });
  }

  /** Endpoint `bench/group` — collapse 2+ stages into a compound row
   *  (the Group Cards sub-view's door, 2026-09-11). */
  @Remote("group")
  async remoteExportGroup(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(sessionKey), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await groupBench(drafts, sessionKey, doc, benchAdmissionOf(this.ctx));
      notifyBenchChange(sessionKey);
      return row;
    });
  }

  /** Endpoint `bench/ungroup` — spill a compound's children back. */
  @Remote("ungroup")
  async remoteExportUngroup(
    sessionKey: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(sessionKey), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await ungroupBench(drafts, sessionKey, doc, benchAdmissionOf(this.ctx));
      notifyBenchChange(sessionKey);
      return row;
    });
  }

  /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
  @Remote("undo")
  async remoteExportUndo(
    sessionKey: string,
    doc: BenchDoc,
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
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchPatchRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await patchBench(drafts, session, doc, benchAdmissionOf(this.ctx), laneMigrationOf(this.ctx), familyReseatOf(this.ctx));
      notifyBenchChange(session);
      return row;
    });
  }

  async addStage(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await addStageBench(drafts, session, doc, benchAdmissionOf(this.ctx));
      notifyBenchChange(session);
      return row;
    });
  }

  /** THE BATCH ADD (the restore law, 2026-10-21): N stages, one
   * write — the same seats and refusals as addStage, the CAS chained
   * server-side. */
  async addStages(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStagesRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await addStagesBench(drafts, session, doc, benchAdmissionOf(this.ctx));
      notifyBenchChange(session);
      return row;
    });
  }

  async removeStage(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchStageRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await removeStageBench(drafts, session, doc);
      notifyBenchChange(session);
      return row;
    });
  }

  async clear(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchClearRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await clearBench(drafts, session, doc);
      notifyBenchChange(session);
      return row;
    });
  }

  async rewire(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchRewireRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await rewireBench(drafts, session, doc);
      notifyBenchChange(session);
      return row;
    });
  }

  async undo(
    session: string,
    doc: BenchDoc,
    signal: AbortSignal,
  ): Promise<BenchUndoRow> {
    signal.throwIfAborted();
    return withBenchWrite(benchDraftIdOf(session), async () => {
      const drafts: Domain<DraftsDomainSpec> = await this.open(signal);
      const row = await undoBench(drafts, session, doc, benchAdmissionOf(this.ctx));
      notifyBenchChange(session);
      return row;
    });
  }
}
