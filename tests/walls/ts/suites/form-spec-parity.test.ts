// form-spec-parity.test.ts — THE LIVE/FROZEN PARITY WALL (the
// discharge stroke, 2026-09-08): for EVERY card-carrying spec in
// the frozen discovery catalog, the LIVE svc.formSpec (the cards'
// schemastery declarations walked by the comfyui service) is
// BYTE-EQUAL to the frozen referee — fields array AND
// schema_groups.
//
// This is the regression hole the discharge order closed: the
// discovery doors served the frozen file while walls/params-emit
// consumed the live service; parity was never pinned beyond
// order/set/group. Now every key — type, label, default, options,
// group, zone, order, required, columns, width, min, max, step,
// placeholder, tooltip, visible_when — is pinned, both surfaces.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/form-spec-parity.test.ts
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui/src/cardDefs.ts";
import { modelIds, registryIds, getModel } from "../../../../packages/engines/comfyui/src/models/models.ts";

const CATALOG = JSON.parse(
  readFileSync(
    new URL("../../../../packages/gateway/shell/data/discovery-catalog.json", import.meta.url),
    "utf8",
  ),
) as {
  form_specs: Record<string, { body: { fields: unknown[]; schema_groups: unknown[] } }>;
};

// THE SPEC PLANE serves (caller, atom) pairs — the card-carrying
// served ids (registry models + boarded ROUTES like moss-sfx: THE
// CARD SELECTS THE ATOMS, and a caller may board a route). Variant
// routes no caller boards (krea-2-raw, ace-step-sft…) serve their
// frozen rows through the door's fallthrough — never live-pinned.
const KNOWN = new Set(modelIds());
const DECLS = new Map(modelIds().map((id) => [id, getModel(id)]));

/** The caller of an atom (THE CARD SELECTS THE ATOMS — the model
 *  declares nothing about its callers): the card whose boarded
 *  list names it. */
function callerOf(svc: ReturnType<typeof theService>, modelId: string): string | null {
  for (const cardId of svc.cardIds()) {
    const def = svc.getCardDef(cardId);
    if (def !== undefined && def.boarded.includes(modelId)) return cardId;
  }
  return null;
}

function comparedSpecs(): string[] {
  const svc = theService();
  const out: string[] = [];
  for (const modelId of Object.keys(CATALOG.form_specs).sort()) {
    // retired cells (anny-hmr &c) stay frozen-only — the table's
    // families are the live surface
    if (!KNOWN.has(modelId)) continue;
    if (callerOf(svc, modelId) === null) continue;
    out.push(modelId);
  }
  return out;
}

describe("live formSpec ≡ frozen referee (the parity wall)", () => {
  it("boots the card plane and covers every card-carrying spec", async (): Promise<void> => {
    await loadCardDefs();
    const specs = comparedSpecs();
    // 28: 27 registry models + the sfx card's boarded ROUTE
    // moss-sfx (the caller boards the address, not the model).
    // mask-studio serves its frozen spec through the door's
    // fallthrough now (pure action card — boards nothing).
    // the qwen3-tts-base fold serves its frozen spec through the
    // door's fallthrough (the tts card boards the model; the
    // route inherits) — never live-pinned.
    assert.equal(specs.length, 28, "the frozen catalog carries 28 card-carrying specs");
  });

  it("fields arrays are byte-equal for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = CATALOG.form_specs[modelId].body;
      const caller = callerOf(svc, modelId);
      assert.ok(caller !== null, `${modelId}: no caller boards it`);
      const live = svc.formSpec(caller, modelId);
      assert.ok(live !== null, `${modelId}: no live spec`);
      assert.deepEqual(
        JSON.stringify(live?.fields),
        JSON.stringify(ref.fields),
        `${modelId}: fields drifted from the frozen referee`,
      );
    }
  });

  it("schema_groups are byte-equal for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = CATALOG.form_specs[modelId].body;
      const caller = callerOf(svc, modelId);
      assert.ok(caller !== null, `${modelId}: no caller boards it`);
      const live = svc.formSpec(caller, modelId);
      assert.deepEqual(
        JSON.stringify(live?.schema_groups),
        JSON.stringify(ref.schema_groups),
        `${modelId}: schema_groups drifted from the frozen referee`,
      );
    }
  });

  it("closed vocabularies refuse non-members (the enum union law)", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    const live = svc.formSpec("image-gen", "krea-2");
    const sampler = live?.fields.find((f) => (f as { name: string }).name === "sampler");
    assert.ok(sampler !== undefined, "krea-2 carries a sampler knob");
    const opts = (sampler as { options: string[] }).options;
    assert.equal(opts.length, 45, "the sampler vocabulary is the object_info pin (45)");
    assert.ok(!opts.includes("not_a_sampler"));
  });

  it("the hierarchy: 48 models, every flat route still serves", (): Promise<void> => {
    // THE HIERARCHY STROKE (2026-09-08): one model per engine-lane
    // unit (ace-step ×6 flat ids = ONE model: variants × quants);
    // every flat id the runtime has ever addressed still serves.
    assert.equal(registryIds().length, 48);
    for (const flat of ["ace-step", "ace-step-bf16", "ace-step-base", "ace-step-base-bf16", "ace-step-sft", "ace-step-xl", "qwen3-tts", "qwen3-tts-base"]) {
      assert.ok(modelIds().includes(flat), flat + " still serves (the flat ids survive as routes)");
    }
  });
});
