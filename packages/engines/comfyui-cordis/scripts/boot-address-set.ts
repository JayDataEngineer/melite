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

import { readFileSync } from "node:fs";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
// CORDIS FACES, source-identity only (the sibling scripts' rule):
// every cordis symbol rides the relative src tree — mixing the built
// @melite/comfyui-cordis face with ../src sources double-declares the
// service augmentations in this emit-face program (the TS2717 class).
import { loadCardDefs } from "../src/cardDefs.ts";
import { cascadeInit, getModel, registryIds, registryModel } from "../src/models/models.ts";
import { probeCompose, type ProbeGraph } from "./compose-probe.ts";

/** The probe loop bound — the dead-card wall's own number. */
const PROBE_ROUNDS = 14;

/** A composed graph as the address walk reads it. */
type Graph = Record<string, { class_type?: unknown } | undefined>;

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
export async function deriveBootAddressSet(opts: { facts_path: string }): Promise<BootAddressManifest> {
  await cascadeInit();
  const defs = await loadCardDefs();
  const facts = loadFacts(opts.facts_path, { getModel, registryIds, registryModel });
  // The facts' own rows (the liveness wall reads them the same way —
  // loadFacts derives the models map, the raw file carries the rows).
  const raw = JSON.parse(readFileSync(opts.facts_path, "utf8")) as {
    rows?: Record<string, { card?: string }>;
  };
  const classes: Record<string, string[]> = {};
  const refused: string[] = [];
  let row_count = 0;
  for (const [modelId, row] of Object.entries(raw.rows ?? {})) {
    if (typeof row?.card !== "string") continue;
    row_count += 1;
    const def = defs.get(row.card);
    if (def === undefined) {
      refused.push(`${modelId}: card '${row.card}' is not served by the card defs`);
      continue;
    }
    const model: ModelFacts | undefined = facts.models[modelId];
    if (model === undefined) {
      refused.push(`${modelId}: the registry serves no model for its facts row`);
      continue;
    }
    const { composed, refusals } = probeCompose((doc) => {
      const g = new GraphBuilder();
      def.compose(def.schema({ ...doc }), model, g, "boot-address-probe");
      const graph = g.toJSON() as Graph;
      if (graph === null || typeof graph !== "object" || Object.keys(graph).length === 0) {
        throw new Error("compose produced an EMPTY graph");
      }
      return graph as ProbeGraph;
    }, PROBE_ROUNDS, opts.facts_path);
    if (composed === null) {
      refused.push(`${modelId} / ${row.card}: ${refusals[refusals.length - 1] ?? "never composed"}`);
      continue;
    }
    for (const node of Object.values(composed)) {
      const ct = node?.class_type;
      if (typeof ct !== "string" || ct.length === 0) continue;
      (classes[ct] ??= []).push(`${modelId} / ${row.card}`);
    }
  }
  return {
    classes,
    class_count: Object.keys(classes).length,
    row_count,
    refused,
    facts_path: opts.facts_path,
  };
}
