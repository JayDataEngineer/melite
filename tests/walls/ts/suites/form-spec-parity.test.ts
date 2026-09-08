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
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, getModel } from "../../../../packages/engines/comfyui/src/models/models.ts";

const CATALOG = JSON.parse(
  readFileSync(
    new URL("../../../../packages/gateway/shell/data/discovery-catalog.json", import.meta.url),
    "utf8",
  ),
) as {
  form_specs: Record<string, { body: { fields: unknown[]; schema_groups: unknown[] } }>;
};

const KNOWN = new Set(modelIds());
const DECLS = new Map(modelIds().map((id) => [id, getModel(id)]));

function comparedSpecs(): string[] {
  const svc = theService();
  const out: string[] = [];
  for (const modelId of Object.keys(CATALOG.form_specs).sort()) {
    // retired cells (anny-hmr &c) stay frozen-only — the table's
    // families are the live surface
    if (!KNOWN.has(modelId)) continue;
    const decl = DECLS.get(modelId);
    if (!decl?.card || svc.getCardDef(decl.card) === undefined) continue;
    out.push(modelId);
  }
  return out;
}

describe("live formSpec ≡ frozen referee (the parity wall)", () => {
  it("boots the card plane and covers every card-carrying spec", async (): Promise<void> => {
    await loadCardDefs();
    const specs = comparedSpecs();
    assert.equal(specs.length, 30, "the frozen catalog carries 30 card-carrying specs");
  });

  it("fields arrays are byte-equal for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = CATALOG.form_specs[modelId].body;
      const live = svc.formSpec(getModel(modelId).card as string, modelId);
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
      const live = svc.formSpec(getModel(modelId).card as string, modelId);
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

  it("the table still serves 59 families through the family plugins", (): Promise<void> => {
    assert.equal(modelIds().length, 59);
  });
});
