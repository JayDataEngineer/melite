// models-golden.spec.ts — THE GOLDEN-ANCHORED CATALOG WALL
// (correction stroke A1: the wall that replaces the circular one).
//
// The first resurrection wall asserted dump-vs-dump and blessed a
// corrupt dump (enum-repr genres, 12 missing families). This wall
// anchors to the TREE GOLDEN (tests/golden_http/model-catalog.json
// + its causes.md) — every served row deep-equal on shared ids,
// the five sections structurally complete, and every divergence
// NAMED (never silent):
//   - the golden's 11 retired-engine families: the registry CARRIES
//     them as frozen data (engine-marked) but the wire never serves
//     them (LAW 0 — the final py serve agreed: 43);
//   - the golden's 3 since-deleted cards (music-native, auto-rig,
//     forge) are absent from the identity ring (deleted after the
//     regold, receipt 034e1f97^ scan);
//   - the identity ring has 19 cards (not the golden's 22) and the
//     TS card plane's clothing-placement has no identity row yet
//     (phase 2 owns the identity rung's native port).
//
// Run: npx vitest run tests/walls/ts/suites/models-golden.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { buildCatalog, isServedFamily } from "../../../../packages/engines/comfyui-cordis/src/models/catalogEmission.ts";
import { CARD_IDENTITY } from "../../../../packages/engines/comfyui-cordis/src/models/cardIdentity.generated.ts";

const GOLDEN_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "golden_http",
  "model-catalog.json",
);

interface GoldenRow {
  id: string;
  [k: string]: unknown;
}

const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as {
  models: Record<string, GoldenRow>;
  families: Record<string, { label: string; genre: string }>;
  capabilities: Record<string, unknown>;
  cards: GoldenRow[];
  input_vocabulary: Record<string, unknown>;
};

const RETIRED_IN_GOLDEN = [
  "ace-step", "ace-step-base", "ace-step-base-bf16", "ace-step-bf16",
  "ace-step-sft", "ace-step-xl", "anycreature", "moss-tts",
  "moss-tts-local", "moss_voicegenerator", "skintokens",
] as const;

describe("the served catalog vs the tree golden (A1)", () => {
  // the table read (the decls param) — the registry module is
  // retired; the family plugins' sum IS the catalog input
  const cat = buildCatalog(modelIds().map((id) => getModel(id)));

  it("every shared model row is DEEP-EQUAL to the golden (never dump-vs-dump)", (): void => {
    const goldenServed = new Set(
      Object.keys(golden.models).filter((id) => !RETIRED_IN_GOLDEN.includes(id as never)),
    );
    // 55 = the golden's 53 + the stroke-46h z-image base routes
    // (z-image-base, z-image-base-int8 — regolded with cause: the
    // variant landed without its golden rows, and this session's
    // battery surfaced the stale count)
    assert.equal(Object.keys(cat.models).length, 55);
    for (const id of goldenServed) {
      const g = golden.models[id];
      const mine = cat.models[id];
      assert.ok(mine !== undefined, `served set lost golden row ${id}`);
      if (id === "music3") {
        // the ONE willed divergence (the backend fossil catch) —
        // assert everything BUT defaults is byte-equal, and that
        // defaults dropped exactly the fossil key
        const { defaults: gd, ...gRest } = g;
        const { defaults: md, ...mRest } = mine;
        assert.deepEqual(mRest, gRest, "music3 non-defaults diverge");
        assert.equal(md.backend, undefined, "backend fossil must stay dead");
        for (const [k, v] of Object.entries(gd)) {
          if (k !== "backend") assert.deepEqual(md[k], v, `music3 default ${k} diverges`);
        }
        continue;
      }
      assert.deepEqual(mine, g, `row ${id} diverges from the golden`);
    }
  });

  it("genre values are WIRE VALUES (no python enum reprs anywhere)", (): void => {
    for (const row of Object.values(cat.models)) {
      assert.match(row.genre, /^[a-z0-9]+$/, `genre "${row.genre}" is an enum-repr fossil`);
    }
    for (const id of modelIds()) {
      const decl = getModel(id);
      assert.match(decl.genre, /^[a-z0-9]+$/, `registry genre "${decl.genre}" corrupt`);
    }
  });

  it("the registry CARRIES the 11 retired families as engine-marked frozen data", (): void => {
    for (const id of RETIRED_IN_GOLDEN) {
      const decl = getModel(id);
      assert.ok(decl !== undefined, `retired family ${id} missing from the registry`);
      assert.ok(decl.engine !== "comfyui" && decl.engine !== "", `${id} must carry its retired engine marker (got '${decl.engine}')`);
      assert.equal(isServedFamily(decl), false, `${id} must never serve (LAW 0)`);
    }
    // 93 = 91 + the stroke-46h z-image base routes (same regold
    // cause as the served count above)
    assert.equal(modelIds().length, 93);
  });

  it("families section matches the golden on all served ids", (): void => {
    // 55 = the golden's 53 + the stroke-46h z-image base routes
    // (same regold cause as the served models count above)
    assert.equal(Object.keys(cat.families).length, 55);
    for (const [id, fam] of Object.entries(cat.families)) {
      assert.deepEqual(fam, golden.families[id], `family ${id} diverges`);
    }
  });

  it("capabilities: 19 shared tiles deep-equal; the 3 deleted are the only absence", (): void => {
    const deleted = new Set(["music-native", "auto-rig", "forge"]);
    for (const [id, tile] of Object.entries(golden.capabilities)) {
      if (deleted.has(id)) {
        assert.equal(cat.capabilities[id], undefined, `${id} was deleted after the regold — must not serve`);
        continue;
      }
      assert.deepEqual(cat.capabilities[id], tile, `capability ${id} diverges`);
    }
    assert.equal(Object.keys(cat.capabilities).length, 19);
  });

  it("cards: 19 identity rows deep-equal to the golden's shared 19", (): void => {
    const goldenById = new Map(golden.cards.map((c) => [c.id, c]));
    assert.equal(cat.cards.length, 19);
    for (const card of cat.cards) {
      const g = goldenById.get(card.id);
      assert.ok(g !== undefined, `identity row ${card.id} not in golden`);
      assert.deepEqual({ ...card }, g, `card ${card.id} diverges`);
    }
  });

  it("input_vocabulary is deep-equal to the golden's (the slot SSOT)", (): void => {
    assert.deepEqual(cat.input_vocabulary, golden.input_vocabulary);
  });
});

describe("the identity rung rides the live card defs (phase 2 start)", () => {
  it("every ring card carries identity on its CardDefinition", async (): Promise<void> => {
    const { loadCardDefs } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const defs = await loadCardDefs();
    const ringIds = new Set(CARD_IDENTITY.map((c) => c.id));
    let carried = 0;
    for (const [id, def] of defs) {
      if (!ringIds.has(id)) continue;
      assert.ok(def.identity !== undefined, `ring card ${id} carries no identity on its def`);
      assert.ok(typeof def.identity.label === "string" && def.identity.label !== "", `${id} identity label empty`);
      carried++;
    }
    // 18 since stroke 75: mask-studio retired at parity (CONTRACT D) —
    // the ring row stays as frozen py truth, a named divergence like
    // the 3 deleted + the TS-added.
    assert.equal(carried, 18);
    // 19 since stroke 86: clothing-placement retired (operator
    // order — its surface moved to craft-loop + mcp:blender with
    // the vision critic); the TS plane's card count follows the
    // live catalog, never the golden's frozen 22.
    assert.equal(defs.size >= 19, true);
  });
});
