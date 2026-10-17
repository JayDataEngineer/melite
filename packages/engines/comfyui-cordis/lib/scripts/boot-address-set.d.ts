/**
 * boot-address-set.ts — THE BOOT FIXTURE'S ADDRESS SET, DERIVED
 * (journey-closure E8, closing upstream-parity F3 + the
 * layera-globals open thread).
 *
 * The hermetic boot double (tests/walls/fixtures/object_info.boot.json)
 * was a frozen literal: rows hand-harvested from whatever capture was
 * current at each growth (B1's 58→99), so the fixture drifted from
 * the engine it doubles — F1's value-blindness class. This module is
 * the derivation the fixture now owes its class set to: compose EVERY
 * facts row's card through the dead-card wall's own probe law
 * (scripts/compose-probe.ts — the one probe vocabulary, shared with
 * the wall) and record every class_type the
 * composes address. The regen leg (scripts/regen-node-vocab.mjs
 * --boot) intersects that address set with a /object_info census and
 * emits the fixture; the derivation arm
 * (tests/walls/ts/suites/boot-fixture-derivation.spec.ts) judges the
 * fixture against a fresh derivation of the same law.
 *
 * ONE DERIVATION, TWO RUNNERS: the arm imports this module in-process
 * under vitest (workspace imports resolve through tsconfig paths to
 * src); the regen probe (boot-address-set-probe.ts, spawned by the
 * regen script under `node --experimental-strip-types`) imports the
 * same module and the committed lib. lib-sync walls pin the two
 * planes equal, so both runners derive the same set. A run that
 * refuses rows is recorded in the manifest, and the regen script
 * refuses to write a fixture over an incomplete derivation — never a
 * partial list (the regen-node-vocab law).
 */
/** The derived address set, with the provenance every judge names. */
export interface BootAddressManifest {
    /** class_type → the model/card rows whose compose addresses it. */
    classes: Record<string, string[]>;
    /** Distinct addressed classes — the fixture's coverage floor. */
    class_count: number;
    /** Facts rows probed (every row carrying a card). */
    row_count: number;
    /** Rows that never composed (a dead card blocks the derivation —
     *  its classes are unaddressed and the fixture would under-cover). */
    refused: string[];
    /** The facts file the rows came from. */
    facts_path: string;
}
/**
 * Derive the boot fixture's address set: boot the card tier, probe
 * every facts row's card, collect the union of addressed classes.
 *
 * @param opts.facts_path — the model-facts file whose rows are probed.
 * @returns the manifest; `refused` non-empty means the tier does not
 *   fully compose (the dead-card wall reds the same rows) and the
 *   derivation is incomplete.
 */
export declare function deriveBootAddressSet(opts: {
    facts_path: string;
}): Promise<BootAddressManifest>;
