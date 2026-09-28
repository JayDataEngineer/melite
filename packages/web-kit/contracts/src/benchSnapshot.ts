/**
 * benchSnapshot — THE SNAPSHOT CONTRACT (the operator's order,
 * 2026-09-26: "the saving should 100% be a schemamaster contract,
 * that way we know 100% if it will load again").
 *
 * One module owns BOTH faces of a run's persisted workflow:
 *
 *   SAVE  saveBenchSnapshotStages — the writer's law. What
 *         runsStart stamps into `bench_snapshot` is CONTRACTED
 *         HERE, at write time: run memory stripped (the
 *         cross-bench history leak, 2026-09-23 — result/runStatus/
 *         history/resultParams/resolved never ride a snapshot),
 *         the era's self-naming model stripped (run-ffbabb558c8:
 *         params.model === the card's own id is the family-less
 *         compose voice, refused by today's admission), provenance
 *         stamped 'restored' (the admission repair law's
 *         coordinate), and a row that cannot load is DROPPED with
 *         a warning that rides the sidecar — visible loss, never
 *         silent, never persisted-unloadable.
 *
 *   LOAD  parseBenchSnapshot / parseCardSnapshot — the reader's
 *         law. The gallery's restore judges the sidecar through
 *         the SAME contract before posting: a snapshot that fails
 *         parse is refused with the exact problem named, never
 *         best-effort posted to the door.
 *
 * The contract judges the LOAD-CRITICAL structure only (the bench
 * domain's own tolerance — normalizeStages coerces the rest): a
 * stage row is a record with a non-empty string id; params/inputs,
 * when present, are records; engine/card, when present, are
 * strings; children, when present, is an array (group rows carry
 * no engine/params of their own). Extra keys ride verbatim — the
 * domain's schema, not this parse, owns them.
 *
 * WHY NOT a structural refusal at SAVE instead of drop+warn: the
 * run already RAN. A snapshot write that threw would lose the
 * provenance of a real run over a row's shape; the contract drops
 * the unloadable row, SAYS SO in the sidecar's warnings, and the
 * loadable rest restores. The guarantee the operator asked for is
 * exact: everything persisted under this contract parses on the
 * other side — save(x) then parse(save(x)) NEVER fails.
 */
export interface BenchSnapshotRow {
  readonly id: string;
  readonly [key: string]: unknown;
}

/** The bench snapshot exactly as it may appear on disk. */
export interface BenchSnapshotContract {
  readonly stages: BenchSnapshotRow[];
  /** The bench's intent label ('' when the bench carried none). */
  readonly intent: string;
  /** The provenance head (the bench log's first entry), optional. */
  readonly bench_head?: Record<string, unknown>;
}

/** The card snapshot exactly as it may appear on disk. */
export interface CardSnapshotContract {
  readonly card: string;
  readonly params: Record<string, unknown>;
}

/** One contract verdict: the value, or the named problems. */
export type ContractParse<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problems: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** THE LOAD-CRITICAL ROW LAW (see the module doc). Returns the
 * row's problem, or null when the row loads. */
function rowProblem(row: unknown, at: number): string | null {
  if (!isRecord(row)) return `stages[${at}]: not an object`;
  const id: unknown = row['id'];
  if (typeof id !== 'string' || id === '') return `stages[${at}]: id must be a non-empty string`;
  const params: unknown = row['params'];
  if (params !== undefined && !isRecord(params)) return `stages[${at}]: params must be an object`;
  const inputs: unknown = row['inputs'];
  if (inputs !== undefined && !isRecord(inputs)) return `stages[${at}]: inputs must be an object`;
  const engine: unknown = row['engine'];
  if (engine !== undefined && typeof engine !== 'string') return `stages[${at}]: engine must be a string`;
  const card: unknown = row['card'];
  if (card !== undefined && typeof card !== 'string') return `stages[${at}]: card must be a string`;
  const children: unknown = row['children'];
  if (children !== undefined && !Array.isArray(children)) return `stages[${at}]: children must be an array`;
  return null;
}

/** Judge a stage list exactly as the loader consumes it. */
export function parseBenchSnapshotStages(value: unknown): ContractParse<BenchSnapshotRow[]> {
  if (!Array.isArray(value)) return { ok: false, problems: ['stages: must be an array'] };
  const stages: BenchSnapshotRow[] = [];
  const problems: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const problem = rowProblem(value[i], i);
    if (problem !== null) problems.push(problem);
    else stages.push(value[i] as BenchSnapshotRow);
  }
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, value: stages };
}

/** Judge a `bench_snapshot` body exactly as the loader consumes
 * it. A partial row set is NOT a pass — one bad row refuses the
 * whole snapshot (the loader posts the list whole; a silent
 * partial restore is the fabrication this contract exists to
 * kill). */
export function parseBenchSnapshot(value: unknown): ContractParse<BenchSnapshotContract> {
  if (!isRecord(value)) return { ok: false, problems: ['bench_snapshot: not an object'] };
  const stages = parseBenchSnapshotStages(value['stages']);
  if (!stages.ok) {
    return { ok: false, problems: stages.problems.map((p: string): string => `bench_snapshot.${p}`) };
  }
  const intent: unknown = value['intent'];
  if (intent !== undefined && typeof intent !== 'string') {
    return { ok: false, problems: ['bench_snapshot.intent: must be a string'] };
  }
  const head: unknown = value['bench_head'];
  if (head !== undefined && !isRecord(head)) {
    return { ok: false, problems: ['bench_snapshot.bench_head: must be an object'] };
  }
  return {
    ok: true,
    value: {
      stages: stages.value,
      intent: typeof intent === 'string' ? intent : '',
      ...(head !== undefined ? { bench_head: head } : {}),
    },
  };
}

/** Judge a `card_snapshot` body exactly as the loader consumes it. */
export function parseCardSnapshot(value: unknown): ContractParse<CardSnapshotContract> {
  if (!isRecord(value)) return { ok: false, problems: ['card_snapshot: not an object'] };
  const card: unknown = value['card'];
  if (typeof card !== 'string' || card === '') {
    return { ok: false, problems: ['card_snapshot.card: must be a non-empty string'] };
  }
  const params: unknown = value['params'];
  if (params !== undefined && !isRecord(params)) {
    return { ok: false, problems: ['card_snapshot.params: must be an object'] };
  }
  return { ok: true, value: { card, params: isRecord(params) ? params : {} } };
}

/** Run-output memory keys that NEVER ride a snapshot (the
 * cross-bench history leak, 2026-09-23 — live proof
 * bench-session-2bd2a61f). The wand re-stamps the ran card's
 * preview from the run's own artifacts; archived memory belongs to
 * the bench that earned it. */
// the strip's keys are the CONTRACT's (benchStage.ts) — one list, named
// once, for the writer here and every arm that strips a row
import { RESTORED_PROVENANCE_SPELLING } from './benchStage.ts'
import { RESTORE_STRIP_KEYS, stripKeys } from './benchStage.ts';
const RUN_MEMORY_KEYS = RESTORE_STRIP_KEYS;

/** THE SAVE LAW — contract a bench's stage rows into what may be
 * persisted as `bench_snapshot`. Never throws: an unloadable row
 * is dropped with a warning (the sidecar's warnings row carries
 * it), the loadable rest rides contracted. Idempotent:
 * save(save(x)) === save(x). */
export function saveBenchSnapshotStages(stages: unknown): {
  readonly stages: BenchSnapshotRow[];
  readonly warnings: string[];
} {
  const out: BenchSnapshotRow[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(stages)) return { stages: out, warnings };
  for (let i = 0; i < stages.length; i++) {
    const problem = rowProblem(stages[i], i);
    if (problem !== null) {
      warnings.push(`dropped unloadable stage (${problem})`);
      continue;
    }
    const src = { ...(stages[i] as Record<string, unknown>) };
    for (const key of RUN_MEMORY_KEYS) delete src[key];
    // THE SELF-NAMING MODEL STRIP (run-ffbabb558c8): a model naming
    // the row's own card is the era's family-less compose residue —
    // today's admission refuses it; provenance 'restored' lets the
    // repair law handle a model naming a REAL family.
    const params: unknown = src['params'];
    if (
      typeof src['card'] === 'string' && isRecord(params) && params['model'] === src['card']
    ) {
      const cleaned = { ...params };
      delete cleaned['model'];
      src['params'] = cleaned;
    }
    src['provenance'] = RESTORED_PROVENANCE_SPELLING;
    out.push(src as BenchSnapshotRow);
  }
  return { stages: out, warnings };
}
