// @melite/video-h3-timeline — the LoRA bag's served kind and its rail
// row (F29, 2026-10-30).
//
// THE BURN (round 4, operator verbatim: "I can't see or change the
// LORA at all, it seems to not exist in the UI"): the `loras` bag
// reached every graph (a strength patch moved the distill seat
// 0.6 → 1) and the model facts served it, but the card's `mods:`
// array was the six edit bags only and no schema knob existed — so
// the studio rendered NO seat and both stacked adapters (the
// distill/speed row and the CrossView camera row) were invisible.
//
// THE LAW: a bag the compose honors has a served kind AND a rail row.
// The kind names the family catalog's own rows (id + strength +
// steps); the rail derives one row per armed bag with the entry's
// seats verbatim.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { H3_LORA_ROWS } from "../../../models/h3/mods/loras.ts";
import { deriveCommissions } from "../src/ui/studio/commissions.ts";
import { studioCopy } from "../src/ui/studio/studioCopy.ts";

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
});

const lorasKind = (): Record<string, unknown> => {
  const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
  const kind = kinds.find((k) => k.kind === "loras");
  assert.ok(kind, "the h3-timeline card serves a `loras` kind on the modifiers channel");
  return kind;
};

describe("the LoRA kind (F29 — the bag the compose honors owes a UI seat)", () => {
  it("is served verbatim: the bag's own key, the family catalog as its options, the strength band 0–2", () => {
    const kind = lorasKind();
    assert.equal(kind.param_key, "loras", "the kind rides the bag's own key");
    assert.equal(kind.schema_key, "loras");
    assert.equal(kind.max_stack, 4, "the stacked lane: distill + camera adapters");
    const fields = kind.fields as Array<Record<string, unknown>>;
    const id = fields.find((f) => f.name === "id");
    assert.ok(id, "the id seat exists");
    assert.equal(id.type, "select");
    // THE DEPTH LAW: the options ARE the catalog rows (a hand-maintained
    // option list would pass while the catalog grew)
    const options = id.options as Array<{ value: string; label: string }>;
    assert.deepEqual(options.map((o) => o.value), H3_LORA_ROWS.map((r) => r.id));
    assert.deepEqual(options.map((o) => o.label), H3_LORA_ROWS.map((r) => r.label));
    const strength = fields.find((f) => f.name === "strength");
    assert.ok(strength, "the strength seat exists");
    assert.equal(strength.type, "number");
    assert.equal(strength.min, 0);
    assert.equal(strength.max, 2);
    const steps = fields.find((f) => f.name === "steps");
    assert.ok(steps, "the steps seat exists (0 = the catalog row's designed count)");
  });

  it("the rail derives the LoRA row with the entry's own seats, under its own label", () => {
    const rows = deriveCommissions({ loras: [{ id: "h3_lightx2v_turbo", strength: 1 }] });
    assert.equal(rows.length, 1, "one armed bag is one row");
    assert.equal(rows[0]!.kind, "loras");
    assert.deepEqual(rows[0]!.seats, [
      { key: "id", value: "h3_lightx2v_turbo" },
      { key: "strength", value: "1" },
    ], "the seats are the entry's own keys and values, verbatim");
    assert.equal(studioCopy.commissionKindLabel("loras"), "LoRAs");
    // the stack reads as rows: two adapters, TWO rows (naming only the
    // first entry would hide the second adapter — the reported burn)
    const stacked = deriveCommissions({ loras: [
      { id: "h3_lightx2v_turbo", strength: 1 },
      { id: "h3_larryvrh_v4_ema", strength: 0.6 },
    ] });
    assert.equal(stacked.length, 2, "one row per stacked adapter");
    assert.deepEqual(stacked.map((r) => r.seats[0]!.value), ["h3_lightx2v_turbo", "h3_larryvrh_v4_ema"]);
  });

  it("an empty bag renders nothing (the unused arm stays surface, never a placeholder)", () => {
    assert.deepEqual(deriveCommissions({ loras: [] }), []);
  });
});
