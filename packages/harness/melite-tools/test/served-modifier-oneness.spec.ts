// @contract cards-h3-one-bag-one-row
// served-modifier-oneness.spec.ts — THE ONE-BAG-ONE-ROW WALL (F34,
// report round 7, 2026-11-13). The operator's screenshot showed the
// h3-timeline card with TWO identical "LightX2V Turbo 4-8 step" chips
// and "LoRAs" listed TWICE in the add-modifier menu: the family DECL
// serves a `loras` pack row AND the card declares its own `loras`
// kind, so the same bag landed on `params.loras` twice — one row from
// each source.
//
// THE LAW: a card's served modifier list carries ONE row per bag
// param_key. When the card declares a kind for a pack's own
// param_key the CARD's row wins (it is the curated face: served
// bands, defaults, fields) and the pack row is dropped. Judged on the
// REAL card and the REAL registry, through the same door
// `melite_load` rides — not on a fixture.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { formSpecArm } from "../src/discovery.ts";

type Mod = {
  kind?: string; label?: string; param_key?: string;
  cardinality?: string; max_stack?: number;
  fields?: Array<{ name?: string }>;
  options?: Array<{ value?: string; defaults?: Record<string, unknown> }>;
};

let mods: Mod[];

beforeAll(async () => {
  const doc = (await formSpecArm("h3-timeline")) as unknown as
    | { features?: { modifiers?: Mod[] } }
    | null;
  assert.ok(doc !== null, "the h3-timeline card serves a form spec");
  mods = doc.features?.modifiers ?? [];
  assert.ok(mods.length > 0, "the served spec carries modifiers");
});

describe("the served modifier list carries one row per bag", () => {
  it("ARM 1 — no two served rows share a bag param_key (the duplicate 'LoRAs' menu row)", () => {
    const keys = mods.map((m) => m.param_key!);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dupes, [],
      "two served rows name the same bag — the add-modifier menu lists it twice and the panel renders two chips");
  });

  it("ARM 2 — the surviving loras row is the CARD's curated kind, never the pack's flat `lora` row", () => {
    const rows = mods.filter((m) => m.param_key === "loras");
    assert.equal(rows.length, 1, "exactly one row owns params.loras");
    const row = rows[0]!;
    assert.equal(row.kind, "loras",
      "the card's own kind (served fields + bands) wins over the pack's `lora` row (F34)");
    assert.equal(row.max_stack, 4, "the curated row keeps the served stack ceiling");
    const fieldNames = (row.fields ?? []).map((f) => f.name);
    assert.deepEqual(fieldNames, ["id", "strength", "steps"],
      "the curated row serves the bag's own three entry fields");
    const idField = (row.fields ?? []).find((f) => f.name === "id") as
      | { type?: string; options?: Array<{ value?: string }> }
      | undefined;
    assert.equal(idField?.type, "select", "the curated row's id seat is a served select");
    const ids = (idField?.options ?? []).map((o) => o.value);
    assert.ok(ids.includes("h3_lightx2v_turbo") && ids.includes("h3_turbo8_v1"),
      "the curated row's catalog is the family's own H3_LORA_ROWS (both distill rows ride)");
  });

  it("ARM 3 — the other six bags still serve exactly one row each (the dedupe is parceled, not a blanket drop)", () => {
    for (const key of ["replace", "repair", "extend", "refine", "reshoot", "upscale"]) {
      const rows = mods.filter((m) => m.param_key === key);
      assert.equal(rows.length, 1, `${key} serves exactly one row`);
      assert.ok((rows[0]!.fields ?? []).length > 0, `${key}'s curated fields survive the dedupe`);
    }
    expect(mods.length, "seven bags, seven rows").toBe(7);
  });
});
