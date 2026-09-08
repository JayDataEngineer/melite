// models-flows.test.ts — THE MODELS→FLOWS/COMPOSE CONTRACT WALL
// (correction stroke A2: the operator's charge "you did the flows").
//
// The registry's variants/routes are not museum data: the compose
// plane (the {model:} arm, R1 variant/quant contract) resolves runs
// through model-facts.json — the LIVE variant matrix the card
// compose consumes. This wall pins the cross-plane agreement:
//
//   1. every family in model-facts.json exists in the registry;
//   2. for every such family, the variant ids, cell quants, cell
//      routes and variant routes AGREE between the registry and the
//      facts (two spellings of one matrix = drift, refuses LOUD);
//   3. the flows plane's registry (flowsRegistry, rebuilt 918c48a0)
//      is loadable and its flow names are legal ids — the models
//      plane's VerbEngine flow arms (phase 2) will name these.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/models-flows.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_REGISTRY, resolve } from "../../../../packages/engines/comfyui/src/models/models.ts";
import { registryFlowNames } from "../../../../packages/gateway/doors/src/doors/flowsRegistry.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "packages",
  "engines",
  "comfyui-cordis",
  "data",
  "model-facts.json",
);

interface FactsCell { quant: string; route: string }
interface FactsVariant { id: string; route: string; cells: FactsCell[] }

const facts = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
  models: Record<string, { variants: FactsVariant[] }>;
};

describe("the models plane feeds the compose/flows plane (A2)", () => {
  it("every compose-plane family exists in the registry", (): void => {
    const factIds = Object.keys(facts.models).sort();
    assert.ok(factIds.length >= 30, `expected ≥30 fact families, got ${factIds.length}`);
    for (const id of factIds) {
      assert.ok(MODEL_REGISTRY[id] !== undefined, `model-facts family '${id}' missing from the registry`);
    }
  });

  it("variant matrices AGREE between registry and model-facts (two spellings refuse)", (): void => {
    let checked = 0;
    for (const [id, fam] of Object.entries(facts.models)) {
      const decl = MODEL_REGISTRY[id];
      if (decl === undefined) continue;
      const regVariants = new Map(decl.variants.map((v) => [v.id, v]));
      for (const fv of fam.variants) {
        const rv = regVariants.get(fv.id);
        assert.ok(rv !== undefined, `${id}: facts variant '${fv.id}' absent from the registry`);
        assert.equal(
          rv.route, fv.route,
          `${id}/${fv.id}: route drift (registry '${rv.route}' vs facts '${fv.route}')`,
        );
        const regCells = new Map(rv.cells.map((c) => [c.quant, c]));
        for (const fc of fv.cells) {
          const rc = regCells.get(fc.quant);
          assert.ok(rc !== undefined, `${id}/${fv.id}/${fc.quant}: facts cell absent from the registry`);
          assert.equal(
            rc.route, fc.route,
            `${id}/${fv.id}/${fc.quant}: cell route drift ('${rc.route}' vs '${fc.route}')`,
          );
          checked++;
        }
      }
    }
    assert.ok(checked >= 38, `expected ≥38 checked cells, got ${checked}`);
  });

  it("resolve() rides for every compose family (the R1 contract)", (): void => {
    for (const id of Object.keys(facts.models)) {
      const r = resolve(id);
      assert.ok(typeof r.route === "string", `${id}: resolve gave no route`);
    }
  });

  it("the flows registry loads with legal flow names", (): void => {
    const names = registryFlowNames();
    assert.ok(names.length > 0, "flows registry empty");
    for (const n of names) {
      assert.match(n, /^[a-z0-9][a-z0-9_.-]*$/, `flow name '${n}' not a legal id`);
    }
  });
});
