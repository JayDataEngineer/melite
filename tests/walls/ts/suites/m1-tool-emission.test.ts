// walls — m1: THE CARD EMITS THE TOOL (M1, 2026-09-09).
//
// The second spelling died: TOOLS_JSON (the hand-owned frozen prose
// table) is deleted; the emitted tool row derives from the card unit
// itself — name from the id, primary model from boarded[0] (the one
// source the served UI preselect rides), prose from identity (the
// ring attach or the card's inline declaration). This wall pins the
// derivation LAWS and the refusal, so a card can never again land
// its tool half in a second file:
//
//  1. every registered card carries identity (or the emission
//     throws LOUD — never a generated title, never a silent drop);
//  2. the derivation laws: name = id hyphens→underscores + "_card",
//     version 1, kind "card-compose", model = boarded[0] ?? null;
//  3. the pure-tool law: requiresModel: false ⇔ model null;
//  4. the pin: the 20-card wire set, byte-exact prose homes.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/m1-tool-emission.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { toolBaseRows } from "../../../../packages/gateway/doors/src/doors/toolProjection.ts";
import type { CardDefinition } from "@melite/comfyui";

describe("m1 — the card emits the tool", () => {
  it("derives every registered card's tool row under the laws", async () => {
    const defs = await loadCardDefs();
    const rows = toolBaseRows(defs);
    assert.equal(rows.size, 20, "the wire card set is 20 — a new card updates this pin deliberately");

    for (const [id, row] of rows) {
      assert.equal(row.name, id.replace(/-/g, "_") + "_card", `${id}: name derives from the id`);
      assert.equal(row.version, 1, `${id}: version is the constant 1`);
      assert.equal(row.kind, "card-compose", `${id}: kind is the constant card-compose`);
      assert.ok(row.stageTitle.length > 0, `${id}: stage title is authored prose`);
      assert.ok(row.description.length > 0, `${id}: description is authored prose`);
      const def = defs.get(id)!;
      assert.equal(row.model, def.boarded[0] ?? null, `${id}: model derives from boarded[0]`);
    }
  });

  it("pure-tool law: requiresModel false ⇔ emitted model null", async () => {
    const defs = await loadCardDefs();
    const rows = toolBaseRows(defs);
    for (const [id, row] of rows) {
      const def = defs.get(id)!;
      if (def.requiresModel === false) {
        assert.equal(row.model, null, `${id}: pure-tool cards emit model null`);
      } else {
        assert.notEqual(row.model, null, `${id}: model-demanding cards emit a family id`);
      }
    }
  });

  it("refuses LOUD when a card carries no identity — never a generated title", () => {
    const naked = new Map<string, CardDefinition>([
      ["naked-card", { boarded: [] } as unknown as CardDefinition],
    ]);
    assert.throws(
      () => toolBaseRows(naked),
      /naked-card carries no identity/,
      "the fence fires inside the derivation",
    );
  });

  it("the vestige is corrected: mask-studio emits model null (the stale wire row died with the table)", async () => {
    const defs = await loadCardDefs();
    const rows = toolBaseRows(defs);
    assert.equal(rows.get("mask-studio")!.model, null);
    assert.equal(rows.get("clothing-placement")!.model, null);
  });
});
