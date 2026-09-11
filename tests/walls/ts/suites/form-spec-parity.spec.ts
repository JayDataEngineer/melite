// form-spec-parity.spec.ts — THE LIVE/GOLDEN PARITY WALL: for EVERY
// card-carrying served id, the LIVE svc.formSpec (the cards'
// schemastery declarations walked by the comfyui service) is
// BYTE-EQUAL to the golden referee
// (tests/walls/ts/fixtures/form-spec-referee.json).
//
// HISTORY: the referee transcribed the retired python's served
// answers (the discovery-catalog.json export, deleted 2026-09-10 —
// byte parity with legacy python is NOT a goal). 28 of the 29 rows
// still match the py answers verbatim; the qwen3-tts-base row was
// re-baselined to the live derivation (py absorbed the voice-lock
// qvoice group into base's fields; live scopes fields to the
// serving card's surface — the tts card — so the group is gone by
// design, not drift).
//
// This is the regression hole the discharge order closed: the
// discovery doors served the frozen file while walls/params-emit
// consumed the live service; parity was never pinned beyond
// order/set/group. Now every key — type, label, default, options,
// group, zone, order, required, columns, width, min, max, step,
// placeholder, tooltip, visible_when — is pinned, both surfaces.
//
// Run: npx vitest run tests/walls/ts/suites/form-spec-parity.spec.ts
import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, registryIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const REFEREE = JSON.parse(
  readFileSync(
    new URL("../fixtures/form-spec-referee.json", import.meta.url),
    "utf8",
  ),
) as Record<string, { caller: string; fields: unknown[]; schema_groups: unknown[] }>;

// THE SPEC PLANE serves (caller, atom) pairs — the card-carrying
// served ids (registry models + boarded ROUTES like moss-sfx: THE
// CARD SELECTS THE ATOMS, and a caller may board a route). Variant
// routes no caller boards serve through the door's family envelope,
// never live-pinned here.
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
  for (const modelId of Object.keys(REFEREE).sort()) {
    // retired cells (anny-hmr &c) were never in the referee — the
    // table's families are the live surface
    if (!KNOWN.has(modelId)) continue;
    if (callerOf(svc, modelId) === null) continue;
    out.push(modelId);
  }
  return out;
}

describe("live formSpec ≡ golden referee (the parity wall)", () => {
  it("boots the card plane and covers every card-carrying spec", async (): Promise<void> => {
    await loadCardDefs();
    const specs = comparedSpecs();
    // 29: 28 registry models + the sfx card's boarded ROUTE
    // moss-sfx (the caller boards the address, not the model) +
    // the qwen3-tts-base fold (the tts card boards the route since
    // the base/voicedesign folds landed — its referee row is the
    // live baseline, see the header).
    // mask-studio boards nothing (pure action card) so it never
    // enters this wall — the door serves its envelope live with
    // variants [].
    assert.equal(specs.length, 29, "the referee carries 29 card-carrying specs");
  });

  it("fields arrays are byte-equal for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = REFEREE[modelId];
      const caller = callerOf(svc, modelId);
      assert.ok(caller !== null, `${modelId}: no caller boards it`);
      assert.equal(caller, ref.caller, `${modelId}: caller moved ${ref.caller} -> ${caller}`);
      const live = svc.formSpec(caller, modelId);
      assert.ok(live !== null, `${modelId}: no live spec`);
      assert.deepEqual(
        JSON.stringify(live?.fields),
        JSON.stringify(ref.fields),
        `${modelId}: fields drifted from the golden referee`,
      );
    }
  });

  it("schema_groups are byte-equal for every spec", async (): Promise<void> => {
    await loadCardDefs();
    const svc = theService();
    for (const modelId of comparedSpecs()) {
      const ref = REFEREE[modelId];
      const caller = callerOf(svc, modelId);
      assert.ok(caller !== null, `${modelId}: no caller boards it`);
      const live = svc.formSpec(caller, modelId);
      assert.deepEqual(
        JSON.stringify(live?.schema_groups),
        JSON.stringify(ref.schema_groups),
        `${modelId}: schema_groups drifted from the golden referee`,
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

  it("the hierarchy: 48 models, every flat route still serves", (): void => {
    // THE HIERARCHY STROKE (2026-09-08): one model per engine-lane
    // unit (ace-step ×6 flat ids = ONE model: variants × quants);
    // every flat id the runtime has ever addressed still serves.
    assert.equal(registryIds().length, 48);
    for (const flat of ["ace-step", "ace-step-bf16", "ace-step-base", "ace-step-base-bf16", "ace-step-sft", "ace-step-xl", "qwen3-tts", "qwen3-tts-base"]) {
      assert.ok(modelIds().includes(flat), flat + " still serves (the flat ids survive as routes)");
    }
  });
});
