// models-against-cards.spec.ts — THE CROSS-VALIDATION WALL.
//
// The killer feature resurrected (grammar 1323-1375 @ 034e1f97):
// every model default must live inside the OWNING card's field
// domains. This wall wires the two planes — the frozen registry
// (packages/engines/comfyui models/) and the 21 TS cards (comfyui-
// cordis loadCardDefs, schemastery schema.dict) — through the pure
// core (models/validate.ts). A default naming no field, an enum
// miss, or an out-of-range number refuses; a dead card ref refuses
// (the amnesty is over). The wall runs at every walls invocation
// (pre-commit + CI) — the boot-loud rail.
//
// Run: npx vitest run tests/walls/ts/suites/models-against-cards.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import {
  ModelError,
  getModel,
  modelIds,
  registryIds,
  registryModel,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import {
  fieldDomains,
  validateRegistryAgainstCards,
  type CardDomains,
} from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";

const here = fileURLToPath(import.meta.url);

/** The registered table as decls (the REGISTRY plane — raw model
 *  atoms; the route view merges variant resolver_defaults into
 *  defaults, which the card-domain gate must never see). */
function allDecls() {
  return registryIds().map((id) => registryModel(id));
}

/** Route id → its cascade-derived view (the check's subject for
 *  boarded routes — mirrors the boot's threading). */
function allRouteViews(): Map<string, ReturnType<typeof getModel>> {
  const out = new Map<string, ReturnType<typeof getModel>>();
  for (const id of modelIds()) out.set(id, getModel(id));
  return out;
}

/** THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
 *  only form the relation exists in — models declare no callers). */
async function allBoardings(): Promise<Map<string, readonly string[]>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Map<string, readonly string[]>();
  for (const id of svc.cardIds()) out.set(id, svc.getCardDef(id)?.boarded ?? []);
  return out;
}

/** comfyui compose's engine truth (ENGINE_TRUTH_KEYS @ 034e1f97,
 *  compose/__init__.py line 76 — "the audio lanes' default mode
 *  (tts/design) rides defaults and the renderer reads it as data"). */
const ENGINE_TRUTH = ["mode", "variant"] as const;

async function cardTable(): Promise<CardDomains> {
  const defs = await loadCardDefs();
  const out: Map<string, ReturnType<typeof fieldDomains>> = new Map();
  for (const [id, def] of defs) {
    // schemaCarrier when the registered schema is a hand-written
    // normalizer (the h3-timeline precedent), else the schema itself
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
      (def as { schema?: unknown }).schema;
    const dict = (carrier as { dict?: Record<string, never> } | undefined)?.dict;
    assert.ok(
      dict !== undefined,
      `card ${id} must expose a schemastery object schema (.dict)`,
    );
    out.set(id, fieldDomains(dict));
  }
  return out;
}

/** The full card-id set with ONE poisoned card's domains — the
 *  semantics probes (never real data drift: every card id present,
 *  so refusals come from the poisoned domain, not the amnesty). */
async function tableWith(
  cardId: string,
  domains: ReadonlyMap<string, { min?: number; max?: number; options?: readonly string[] }>,
): Promise<CardDomains> {
  const defs = await loadCardDefs();
  const table: CardDomains = new Map();
  for (const id of defs.keys()) table.set(id, new Map());
  table.set(cardId, domains);
  return table;
}

describe("models against cards (the cross-validation, resurrected)", () => {
  it("every model default lives inside its owning card's field domains", async (): Promise<void> => {
    const cards = await cardTable();
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, await allBoardings(), new Set(modelIds()), allRouteViews());
    // every caller-owned pair is checked (27 boardings since
    // stroke 87 — fit + skin retired with their cards)
    assert.ok(checked.length >= 24, `expected ≥24 checked pairs (wan-vace/scail2 retired 2026-09-21), got ${checked.length}`);
  });

  it("every non-empty COMFYUI card ref names a REGISTERED card (the amnesty is over)", async (): Promise<void> => {
    const cards = await cardTable();
    // THE CARD SELECTS THE ATOMS: a boarded id naming no
    // registered atom refuses (caller-owned edge, the dead-ref
    // gate in its caller-side form)
    const known = new Set(modelIds());
    await loadCardDefs();
    const svc = theService();
    for (const cardId of svc.cardIds()) {
      for (const boarded of svc.getCardDef(cardId)?.boarded ?? []) {
        assert.ok(known.has(boarded), `card '${cardId}' boards '${boarded}' — no such atom`);
      }
    }
  });

  it("a default naming no card field refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1, max: 150 }]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("names no field on card"),
    );
  });

  it("an out-of-bounds numeric default refuses LOUD", async (): Promise<void> => {
    // poisoned bounds — the semantics probe, never real data drift
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1000, max: 2000 }], ["width", { min: 1 }, ], ["height", { min: 1 }], ["cfg", { min: 0 }], ["sampler", {}], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("outside card image-gen field bounds"),
    );
  });

  it("an enum miss refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", {}], ["width", {}], ["height", {}], ["cfg", {}], ["sampler", { options: ["euler_ancestral"] }], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("not in card image-gen options"),
    );
  });

  it("a dead card ref refuses LOUD (never a skip)", (): void => {
    const cards: CardDomains = new Map([["some-other-card", new Map()]]);
    // caller-owned form: a caller naming a nonexistent atom refuses
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, [], new Map([["ghost-caller", ["no-such-atom"]]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("no such model registered"),
    );
  });

  it("engine-truth keys skip the card-domain gate (qwen3-tts 'mode')", async (): Promise<void> => {
    // REAL card table: qwen3-tts carries default mode='tts' — no tts
    // card field, but the compose consumes it as run truth (the py
    // ENGINE_TRUTH_KEYS declaration). Without the truth keys the
    // refusal fires; with them the full estate validates CLEAN.
    const cards = await cardTable();
    const boarded = await allBoardings();
    const served = new Set(modelIds());
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, [], boarded, served),
      (err: unknown): boolean =>
        err instanceof ModelError && String(err.message).includes("qwen3-tts: default 'mode'"),
    );
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, boarded, served, allRouteViews());
    assert.ok(checked.length >= 24, `expected 24 checked pairs (wan-vace/scail2 retired 2026-09-21), got ${checked.length}`);
  });

  it("every served owner is claimed (the catalog offers only runnable atoms)", async (): Promise<void> => {
    // paper §3.2.2 at the catalog plane: a served address no caller
    // boards is an unsatisfiable offer (the 13 hollow models,
    // 2026-09-08 — served, callerless, unrunnable). The unit is the
    // OWNER: variants inherit callers through the model boarding.
    // Unoffered/foreign-engine atoms never serve — this wall and
    // the SERVE LAW read one rule.
    const { buildCatalog } = await import("../../../../packages/engines/comfyui-cordis/src/models/catalogEmission.ts");
    const boarded = await allBoardings();
    const claimed = new Set<string>();
    for (const list of boarded.values()) for (const b of list) claimed.add(b);
    const cat = buildCatalog(modelIds().map((id) => getModel(id)));
    const servedAddr = new Set(Object.keys(cat.models));
    const owners = new Map<string, string[]>();
    for (const addr of servedAddr) {
      const o = [...registryIds()].find((rid) => {
        const d = registryModel(rid);
        return d.variants.some((v) => v.route === addr || v.cells.some((c) => c.route === addr));
      });
      assert.ok(o !== undefined, `served address '${addr}' has no owning atom`);
      owners.set(o, [...(owners.get(o) ?? []), addr]);
    }
    for (const [o, addrs] of owners) {
      const covered = [o, ...addrs].some((a) => claimed.has(a));
      assert.ok(covered, `served owner '${o}' is claimed by no card (board it or unoffer it — the catalog offers only runnable atoms)`);
    }
  });

  it("fieldDomains extracts schemastery min/max/options", (): void => {
    // schemastery truth (probed 2026-09-08): the union's
    // alternatives live at .list (NODE level), each const carries
    // .value — .meta.list/.meta.const was the pre-probe fiction
    const domains = fieldDomains({
      steps: { type: "number", meta: { min: 1, max: 150, default: 30 } },
      pick: {
        type: "union",
        list: [{ value: "a" }, { value: "b" }, null],
      },
      plain: { type: "string" },
    } as never);
    assert.deepEqual(domains.get("steps"), { min: 1, max: 150 });
    assert.deepEqual(domains.get("pick"), { options: ["a", "b"] });
    assert.deepEqual(domains.get("plain"), {});
  });
});
