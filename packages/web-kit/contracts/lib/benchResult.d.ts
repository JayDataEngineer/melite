/** benchResult.ts — THE BENCH STAGE RESULT CONTRACT (the operator's
 * law, 2026-09-20: "this can all be validated by contract"). The
 * run observer patches this row onto the bench stage; every
 * consumer (the preview harvest, the drill, the studio adapters)
 * reads through this shape. The contract carries its own runtime
 * validator — `benchResultDefects` — and the WRITER asserts it
 * before patching, the READER normalizes through it, and the WALLS
 * pin it against real served bytes. A fixture can lie; a contract
 * pinned to the live shape cannot.
 *
 * THE ONE-FILE-ONE-KEY LAW: every url appears under EXACTLY ONE
 * artifacts key. A file under two keys renders twice — the doubled
 * rowset disease (the legacy 'video' stamp wrote the stage url —
 * which IS gallery[0] — under a second key, so every image-gen
 * result rendered the same picture as hero AND rest-thumb). The
 * primary `url` field may NAME a file that also lives in the map
 * (it is the primary POINTER, not a second key) — but the map's
 * VALUES are unique, always. */
/** A machine-readable verdict an agent loop writes beside its media
 *  (ROADMAP 11e — the rig→validate→fix loop's gate). INLINE DATA,
 *  never a file: `reports` rides the result row beside `artifacts`,
 *  each entry declaring its own kind — today exactly 'report'. The
 *  agent loop reads the same object the result row renders; the
 *  ONE-FILE-ONE-KEY law governs `artifacts` (urls) and never sees
 *  this map. */
export interface BenchReport {
    /** the kind declaration — the claim key. Always 'report'. */
    kind: 'report';
    /** the gate's verdict. */
    status: 'pass' | 'fail' | 'warn';
    /** display title; omitted → the entry's own name renders. */
    title?: string;
    /** short status chips (the check names that make up the verdict). */
    chips?: string[];
    /** the key-value body — the machine-readable rows. */
    rows?: Record<string, string | number | boolean>;
}
/** The bench row's result face — what a run writes onto the stage. */
export interface BenchStageResult {
    /** The producing run's identity (stable across the run cycle:
     * the start patch and the terminal patch carry the same id). */
    run_id: string;
    /** The primary output's url (the hero's own file). */
    url?: string;
    /** Named artifacts → urls. ONE FILE, ONE KEY (see the law above). */
    artifacts?: Record<string, string>;
    /** Named machine-readable verdicts (kind 'report') — INLINE, no
     *  urls, never subject to the one-file-one-key law. */
    reports?: Record<string, BenchReport>;
    /** The flat url list (primary first) — consumers that don't key
     * by name (the h3 timeline's stitch-first list). */
    assetUrls?: string[];
    /** A failed run's reason, verbatim (the silent-failure cure). */
    error?: string;
}
/** Validate a result row against the contract. Returns the defect
 * list — EMPTY means the row is lawful. Each defect names the law
 * and the offending keys, in the door's own voice. */
export declare function benchResultDefects(row: unknown): string[];
/** THE DOWNLOAD FILENAME (the boundary audit's C5, promoted to the
 *  contract by A-M10): a source URL names a file by its PATHNAME's
 *  last segment, percent-decoded — never the query, never the
 *  fragment, never "". `split("/").pop()` kept both, so the manager
 *  downloaded under a clean name while the row inspected one with
 *  "f.safetensors?download=1" glued on, and the post-download check
 *  reported model-not-landed for a model that WAS on disk. A URL
 *  ending in "/" names no file: the result is "" and the caller's
 *  destination check refuses it by name. One derivation, contract-
 *  owned, so the wall can DRIVE it (a source-substring pin passed on
 *  dead code).
 *
 *  THE INPUT IS ABSOLUTE, ALWAYS: the sole caller hands it a cell
 *  artifact's `source_url`, which the DECL contract pins to
 *  `/^https?:\/\//` (models/families/contract.ts, CellArtifact), so
 *  `new URL()` never throws here and a relative spelling cannot
 *  reach this function (the re-audit, 2026-10-16). */
export declare function artifactFileName(sourceUrl: string): string;
//# sourceMappingURL=benchResult.d.ts.map
