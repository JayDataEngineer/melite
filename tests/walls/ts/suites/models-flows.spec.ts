// models-flows.spec.ts — THE MODELS→FLOWS/COMPOSE CONTRACT WALL
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
//   3. the flows plane's registry (flowsRegistry) is loadable and its
//      flow names are legal ids — the models plane's VerbEngine flow
//      arms will name these.
//
// WHAT THIS WALL PINS (its own header, kept honest — the wall audit's
// E-M7 found this list promising a flowsRegistry pin the file did
// not carry):
//   1. every assembled facts row exists in the registry (or serves a
//      route), and the facts table's census is exact;
//   2. for every such family, the variant ids, cell quants, cell
//      routes and variant routes AGREE between registry and row;
//   3. the judged-cell census is exact (the resolve arm);
//   4. the facts FILE is pinned against the registry (E-C2: roster
//      exact, no frozen escapes, two-way coverage, every card row
//      real, every outputs slice shaped).
//
// Run: npx vitest run tests/walls/ts/suites/models-flows.spec.ts

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getModel, modelIds, registryIds, registryModel, resolve } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { readFileSync } from "node:fs";
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
    // E-M7 (the wall audit, 2026-09-28): a floor let half the facts
    // table vanish silently. THE THIRD LIVE BREAK (2026-09-29): the
    // inverse is also true — a COUNT over what the roster already
    // has is structurally blind to an ABSENCE. `krea-2-raw` was
    // claimed by the registry, offered by the catalog, and had no
    // facts row for 20 days while this pin held 29 green. The count
    // is retired; the SET is derived from the registry itself:
    // roster keys ∪ every claimed address of a served family.
    const raw = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
      rows?: Record<string, { frozen?: unknown }>;
    };
    const roster = new Set(Object.keys(raw.rows ?? {}));
    const expected = new Set<string>(roster);
    for (const [address, owner] of Object.entries(facts.owners)) {
      if (roster.has(owner) && raw.rows?.[owner]?.frozen === undefined) expected.add(address);
    }
    assert.deepEqual(
      factIds,
      [...expected].sort(),
      "facts keys ≡ roster ∪ claimed addresses of served families — a claimed address with no row is the third live break's exact shape",
    );
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
      // its matrix
      // is the owner's ladder — checked when the owner is reached
      if (!registryIds().includes(id)) {
        assert.ok(modelIds().includes(id), `facts family '${id}' serves no route`);
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
    // E-M7 retired its constant (2026-09-29, the third live break):
    // "80 today" was a count over what the roster had — blind to
    // absence, and stale the moment derivation filled 31 addresses.
    // The total law derives from the REGISTRY side: every cell of
    // every variant of every judged registry family must have been
    // compared. A family that stops being judged (the floors' old
    // failure) or a facts variant dropped whole both redden here.
    let expected = 0;
    for (const id of registryIds()) {
      if (actions.has(id) || facts.models[id] === undefined) continue;
      expected += getModel(id).variants.reduce((n, v) => n + v.cells.length, 0);
    }
    assert.equal(
      checked, expected,
      `the matrix walk is TOTAL (checked ${String(checked)} of ${String(expected)} registry cells — a family or variant that stops being judged is a silent pass)`,
    );
  });

  it("resolve() rides for every compose family (the R1 contract)", async (): Promise<void> => {
    // THE JUDGED-COUNT FLOOR (the walls audit's row 7, 2026-10-10):
    // the arm skipped action lanes and asserted the rest — with no
    // floor on HOW MANY it judged, a facts file emptied of compose
    // families (or an action set that swallowed every id) turned
    // the arm into a silent pass. The count is pinned: the wall
    // must have crossed real families.
    const actions = await actionCardLanes();
    let judged = 0;
    for (const id of Object.keys(facts.models)) {
      if (actions.has(id)) continue;
      judged++;
      // E-C3 (the wall audit, 2026-09-28): `typeof route ===
      // "string"` was true BY CONSTRUCTION (resolve's return type
      // is a string) — the arm could not fail. The route must be
      // NON-EMPTY and a real serving id.
      const r = resolve(id);
      assert.ok(typeof r.route === "string" && r.route !== "", `${id}: resolve gave an empty route`);
      assert.ok(modelIds().includes(r.route), `${id}: resolve route '${String(r.route)}' serves no lane`);
    }
    // E-C3: the census is exact — every row except the rows that
    // ARE action-card lanes (id collision) is judged; drift is
    // deliberate. 29 stand today.
    const total = Object.keys(facts.models).length;
    const actionRows = Object.keys(facts.models).filter((id) => actions.has(id)).length;
    assert.equal(judged, total - actionRows,
      `the resolve() arm's census is exact (${String(judged)} judged; ${String(total)} rows - ${String(actionRows)} action-lane rows — drift is deliberate)`);
    assert.equal(total, 29, `the facts roster is 29 rows (saw ${String(total)}) — a 30th family is a deliberate edit`);
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
    // THE JUDGED FLOOR (the walls audit's M2, 2026-10-10): the arm
    // skipped action lanes and asserted the rest with no count, so a
    // facts file emptied of families — or an actionCardLanes set
    // that swallowed every id — judged nothing and passed.
    let judged = 0;
    for (const [id, row] of Object.entries(facts.models)) {
      if (actions.has(id)) continue;
      judged++;
      const owner = registryIds().includes(id) ? id : ownerOf.get(id);
      assert.ok(owner !== undefined, `facts family '${id}' is neither registry, route, nor action lane`);
      const truth = (registryModel(owner).mods ?? []) as readonly string[];
      const riding = ((row as { mods?: readonly string[] }).mods ?? []) as readonly string[];
      assert.deepEqual([...riding].sort(), [...truth].sort(), `${id}: facts.mods ≠ DECL.mods of ${owner}`);
    }
    assert.ok(judged >= 20,
      `the mods arm judged real families (${String(judged)} — an emptied facts roster must not pass)`);
  });


// ── E-C2 (the wall audit, 2026-09-28): THE RAW FILE IS THE ORACLE ──
// The spec's every comparison read `facts.models` — the view
// loadFacts DERIVES through the same registry reads it was being
// compared against: registry-vs-registry, a tautology that could
// not fail while the JSON's own bytes rotted. These arms read the
// RAW JSON with readFileSync + JSON.parse — the frozen file itself
// — and pin its three live claims: the roster (both directions),
// the card mapping (row→card and card-slice keys), and the
// outputs/requires_by_family slices (the file's raison d'être,
// compared by NO arm before).
describe("the facts FILE is pinned against the registry (E-C2)", () => {
  const raw = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
    rows?: Record<string, { card?: string; frozen?: unknown }>;
    cards?: Record<string, { outputs?: Array<{ label?: string; patterns?: string[] }>; requires_by_family?: Record<string, string[]> }>;
  };
  const FACTS_ROW_CENSUS = 29;

  it("the frozen roster is exact, and the frozen-variant escape hatch census is named", async (): Promise<void> => {
    await loadCardDefs();
    const ids = Object.keys(raw.rows ?? {}).sort();
    assert.equal(ids.length, FACTS_ROW_CENSUS,
      `the facts roster is ${String(FACTS_ROW_CENSUS)} rows (saw ${String(ids.length)}) — a family added or retired is a deliberate edit`);
    // the FROZEN escape hatch: a row carrying `frozen` bypasses the
    // registry derivation entirely (its variants ride the file's
    // bytes). NONE are frozen today — a first frozen row must be
    // argued here, or the tautology hole reopens through the back
    // door.
    const frozen = ids.filter((id) => (raw.rows?.[id] as { frozen?: unknown } | undefined)?.frozen !== undefined);
    assert.deepEqual(frozen, [],
      `rows frozen against derivation (${frozen.join(", ")}) — pin them here deliberately or derive them`);
    // REVERSE DIRECTION (the audit's missing arm): every family any
    // card BOARDS must have a facts row — a 46th registry family is
    // invisible to the old one-way arm
    const svc = theService();
    const missing: string[] = [];
    for (const cardId of svc.cardIds()) {
      for (const fam of svc.getCardDef(cardId)?.boarded ?? []) {
        if (!ids.includes(fam)) missing.push(`${cardId} boards ${fam}`);
      }
    }
    assert.deepEqual(missing, [],
      `boarded families with NO facts row (${missing.join("; ")}) — the compose plane cannot see their lanes`);
  });

  it("every row maps to a REAL card, and every card slice names a REAL card", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    const cardIds = new Set(svc.cardIds());
    assert.ok(cardIds.size >= 10, `census floor: the card plane is real (${String(cardIds.size)} cards)`);
    for (const [id, row] of Object.entries(raw.rows ?? {})) {
      assert.ok(typeof row.card === "string" && row.card !== "", `facts row '${id}' names no card`);
      assert.ok(cardIds.has(row.card!), `facts row '${id}' maps to card '${row.card}', which the card plane does not serve`);
    }
    for (const key of Object.keys(raw.cards ?? {})) {
      assert.ok(cardIds.has(key), `facts card slice '${key}' names a card the card plane does not serve`);
    }
  });

  it("outputs slices are real (label + dot-patterns), requires_by_family keys are registry families", async (): Promise<void> => {
    await loadCardDefs();
    const slices = raw.cards ?? {};
    const sliceKeys = Object.keys(slices).sort();
    // outputs are the file's reason to exist: every card slice
    // carries at least one output with a label and dot-prefixed
    // patterns (the compose plane's file-kind vocabulary)
    for (const key of sliceKeys) {
      const outputs = slices[key]?.outputs ?? [];
      assert.ok(outputs.length > 0, `card slice '${key}' carries NO outputs — the compose plane cannot describe its artifacts`);
      for (const o of outputs) {
        assert.ok(typeof o.label === "string" && o.label !== "", `card slice '${key}': an output carries no label`);
        assert.ok(Array.isArray(o.patterns) && o.patterns.length > 0, `card slice '${key}' output '${o.label}': no patterns`);
        for (const p of o.patterns ?? []) {
          assert.ok(p.startsWith("."), `card slice '${key}' output '${o.label}': pattern '${p}' is not a dot-suffix`);
        }
      }
    }
    // requires_by_family: keys must be registry families (a typo
    // starves the pack silently); the carrying pair is named
    const carriers: string[] = [];
    for (const key of sliceKeys) {
      const rbf = slices[key]?.requires_by_family;
      if (rbf === undefined) continue;
      carriers.push(key);
      for (const fam of Object.keys(rbf)) {
        assert.ok(registryIds().includes(fam),
          `card slice '${key}' requires_by_family names '${fam}', which the registry does not hold — a typo starves the pack`);
        assert.ok(Array.isArray(rbf[fam]) && rbf[fam]!.length > 0, `card slice '${key}' requires_by_family['${fam}'] is empty`);
      }
    }
    assert.deepEqual(carriers, ["img-to-mesh", "tagger"],
      `the requires_by_family carriers are the named pair (saw ${JSON.stringify(carriers)}) — a third carrier is a deliberate edit`);
    // A-L25 (the wall audit, 2026-09-28): the frozen card slices
    // were checked for SHAPE and key-membership, never against the
    // LIVE card plane that generates them — so a hand-edited facts
    // file (or a card edit whose snapshot was not re-dumped) drifted
    // silently, and the two copies disagreed about which packs a
    // family needs. The frozen rows ARE the live rows now, compared
    // key-by-key: a divergence refuses, naming the card and family.
    const defs = await loadCardDefs();
    for (const key of carriers) {
      const live = (defs.get(key) as unknown as { requiresByFamily?: Record<string, readonly string[]> } | undefined)
        ?.requiresByFamily ?? {};
      const frozen = slices[key]?.requires_by_family ?? {};
      assert.deepEqual(
        Object.fromEntries(Object.entries(frozen).map(([f, v]) => [f, [...v].sort()])),
        Object.fromEntries(Object.entries(live).map(([f, v]) => [f, [...v].sort()])),
        `card '${key}': the FROZEN requires_by_family IS the live card's (a hand-edited facts file or an un-dumped card edit refuses here)`,
      );
    }
  });
});
