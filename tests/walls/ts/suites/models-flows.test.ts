// models-flows.test.ts — THE MODELS→FLOWS/COMPOSE CONTRACT WALL
// (correction stroke A2: the operator's charge "you did the flows").
//
// The registry's variants/routes are not museum data: the compose
// plane (the {model:} arm, R1 variant/quant contract) resolves runs
// through loadFacts rows — the DERIVED variant matrix the card
// compose consumes (facts.ts assembles each row from the registry +
// frozen card slices; one spelling is truth, the row is its derived
// realization). This wall pins the cross-plane agreement:
//
//   1. every assembled row exists in the registry (or serves a route);
//   2. for every such family, the variant ids, cell quants, cell
//      routes and variant routes AGREE between the registry and the
//      row (derivation that drifts from truth refuses LOUD);
//   3. the flows plane's registry (flowsRegistry, rebuilt 918c48a0)
//      is loadable and its flow names are legal ids — the models
//      plane's VerbEngine flow arms (phase 2) will name these.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/models-flows.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getModel, modelIds, registryIds, registryModel, resolve } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { loadFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

/** Facts keys no model serves are ACTION-CARD lanes (pure-tool
 *  cards boarding nothing — mask-studio: the card owns its pins,
 *  the facts row still truly describes the lane it composes).
 *  Derived from the live card plane — never a hardcoded skip. */
async function actionCardLanes(): Promise<Set<string>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Set<string>();
  for (const id of svc.cardIds()) {
    if ((svc.getCardDef(id)?.boarded ?? []).length === 0) out.add(id);
  }
  return out;
}

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

/** Registry reads for the derivation (facts.ts renders through injected reads). */
const reads = { getModel, registryIds, registryModel };
const facts = loadFacts(FACTS_PATH, reads);

describe("the models plane feeds the compose/flows plane (A2)", () => {
  it("every compose-plane family exists in the registry", async (): Promise<void> => {
    const factIds = Object.keys(facts.models).sort();
    assert.ok(factIds.length >= 30, `expected ≥30 fact families, got ${factIds.length}`);
    const actions = await actionCardLanes();
    for (const id of factIds) {
      if (actions.has(id)) continue;
      assert.ok(modelIds().includes(id), `model-facts family '${id}' missing from the registry`);
    }
  });

  it("variant matrices AGREE between registry and model-facts (two spellings refuse)", async (): Promise<void> => {
    let checked = 0;
    const actions = await actionCardLanes();
    for (const [id, fam] of Object.entries(facts.models)) {
      if (actions.has(id)) continue;
      // the hierarchy fold: a facts key that is a ROUTE (not a
      // registry model) is pinned by the route-survival law
      // (families-golden holds every route byte-equal); its matrix
      // is the owner's ladder — checked when the owner is reached
      if (!registryIds().includes(id)) {
        assert.ok(modelIds().includes(id), `facts family '${id}' serves no route`);
        checked += fam.variants.length;
        continue;
      }
      const decl = getModel(id);
      const regVariants = new Map(decl.variants.map((v) => [v.id, v]));
      for (const fv of fam.variants) {
        const rv = regVariants.get(fv.id);
        assert.ok(rv !== undefined, `${id}: facts variant '${fv.id}' absent from the registry`);
        // THE CONFORMANCE LENS (2026-09-08): absent ≡ "" by law —
        // the registry writes nothing, the facts file keeps its
        // "" spelling (compose readers untouched). Real drift
        // (two different addresses) still refuses below.
        assert.equal(
          rv.route ?? "", fv.route,
          `${id}/${fv.id}: route drift (registry '${rv.route}' vs facts '${fv.route}')`,
        );
        const regCells = new Map(rv.cells.map((c) => [c.quant, c]));
        for (const fc of fv.cells) {
          const rc = regCells.get(fc.quant);
          assert.ok(rc !== undefined, `${id}/${fv.id}/${fc.quant}: facts cell absent from the registry`);
          assert.equal(
            rc.route ?? "", fc.route,
            `${id}/${fv.id}/${fc.quant}: cell route drift ('${rc.route}' vs '${fc.route}')`,
          );
          checked++;
        }
      }
    }
    assert.ok(checked >= 38, `expected ≥38 checked cells, got ${checked}`);
  });

  it("resolve() rides for every compose family (the R1 contract)", async (): Promise<void> => {
    const actions = await actionCardLanes();
    for (const id of Object.keys(facts.models)) {
      if (actions.has(id)) continue;
      const r = resolve(id);
      assert.ok(typeof r.route === "string", `${id}: resolve gave no route`);
    }
  });
});

  it("facts.mods ≡ DECL.mods (the boarding rides to consumption — one spelling is truth, the other is walled)", async (): Promise<void> => {
    // THE CONSUMPTION GATE's data leg: ModelFacts.mods is what the
    // kit gate reads; the DECL is truth. Route-keys (folds) pin
    // against their owning atom; action-card lanes carry no
    // boarding (their mutations, if any, are card-owned).
    const { registryModel } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
    const actions = await actionCardLanes();
    const ownerOf = new Map<string, string>();
    for (const rid of registryIds()) {
      const decl = registryModel(rid);
      for (const v of decl.variants) {
        if (v.route) ownerOf.set(v.route, rid);
        for (const c of v.cells) {
          if (c.route) ownerOf.set(c.route, rid);
        }
      }
    }
    for (const [id, row] of Object.entries(facts.models)) {
      if (actions.has(id)) continue;
      const owner = registryIds().includes(id) ? id : ownerOf.get(id);
      assert.ok(owner !== undefined, `facts family '${id}' is neither registry, route, nor action lane`);
      const truth = (registryModel(owner).mods ?? []) as readonly string[];
      const riding = ((row as { mods?: readonly string[] }).mods ?? []) as readonly string[];
      assert.deepEqual([...riding].sort(), [...truth].sort(), `${id}: facts.mods ≠ DECL.mods of ${owner}`);
    }
  });
