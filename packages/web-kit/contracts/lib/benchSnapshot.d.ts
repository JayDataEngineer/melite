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
export type ContractParse<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly problems: string[];
};
/** Judge a stage list exactly as the loader consumes it. */
export declare function parseBenchSnapshotStages(value: unknown): ContractParse<BenchSnapshotRow[]>;
/** Judge a `bench_snapshot` body exactly as the loader consumes
 * it. A partial row set is NOT a pass — one bad row refuses the
 * whole snapshot (the loader posts the list whole; a silent
 * partial restore is the fabrication this contract exists to
 * kill). */
export declare function parseBenchSnapshot(value: unknown): ContractParse<BenchSnapshotContract>;
/** Judge a `card_snapshot` body exactly as the loader consumes it. */
export declare function parseCardSnapshot(value: unknown): ContractParse<CardSnapshotContract>;
/** THE SAVE LAW — contract a bench's stage rows into what may be
 * persisted as `bench_snapshot`. Never throws: an unloadable row
 * is dropped with a warning (the sidecar's warnings row carries
 * it), the loadable rest rides contracted. Idempotent:
 * save(save(x)) === save(x). */
export declare function saveBenchSnapshotStages(stages: unknown): {
    readonly stages: BenchSnapshotRow[];
    readonly warnings: string[];
};
//# sourceMappingURL=benchSnapshot.d.ts.map
