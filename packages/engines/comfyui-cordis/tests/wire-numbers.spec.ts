// THE NUMERIC-STRING WALL (commission 035, 2026-09-24 — receipt:
// `card 'image-gen' refused params: $.width expected number but
// got 768`): the wire stringified a nested numeric param and the
// compose door refused a lawful commission on its FIRST production
// call. The fill is schema-derived through the schemaCarrier at
// BOTH compose paths — card-agnostic, every card, no opt-out (the
// assertNoCheat precedent). These arms pin the door, not the kit
// helper (the kit's own spec owns the grammar).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal } from "../src/service.ts";
import type { CardDefinition } from "../src/service.ts";

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  return ctx.comfyui;
};

const carrier = z.object({
  width: z.number().min(256).max(2048).default(1024),
  prompt: z.string().default("x"),
});

const numCard = (): CardDefinition => ({
  id: "numeric",
  skeleton: "gen",
  boarded: [],
  schema: carrier as unknown as (v: unknown) => Record<string, unknown>,
  schemaCarrier: carrier as never,
  compose: (p, _m, g) => { g.node("TestNode", { width: p["width"] }); },
  sidebar: { key: "gen", order: 1 },
  flowKinds: { inputs: {}, outputs: { image: "image" } },
  requiresModel: false,
});

describe("the compose door — the numeric-string fill (commission 035)", () => {
  it("THE RECEIPT: a wire-stringified width COMPOSES (string '768' → number)", async () => {
    const svc = await boot();
    svc.registerCard(numCard());
    const graph = svc.compose("numeric", null, { width: "768" }, "run-wire-num");
    assert.ok(JSON.stringify(graph).includes("768"), "the width rode the graph");
  });

  it("the walked value is a NUMBER (the graph pin, not just absence-of-refusal)", async () => {
    const svc = await boot();
    let seen: unknown;
    const card = { ...numCard(), compose: (p: Record<string, unknown>, _m: unknown, g: { node: (n: string, v: Record<string, unknown>) => void }) => { seen = p["width"]; g.node("TestNode", { width: p["width"] }); } } as CardDefinition;
    svc.registerCard(card);
    svc.compose("numeric", null, { width: "768" }, "run-wire-num2");
    assert.equal(seen, 768);
    assert.equal(typeof seen, "number");
  });

  it("THE MODEL PATH RE-SPREAD: the coerced body survives the defaults merge (attempt-035's live escape — the raw re-spread re-poisoned merged past the wrap)", async () => {
    const svc = await boot();
    let seen: unknown;
    const card = { ...numCard(), boarded: ["fam"], compose: (p: Record<string, unknown>, _m: unknown, g: { node: (n: string, v: Record<string, unknown>) => void }) => { seen = p["width"]; g.node("TestNode", { width: p["width"] }); } } as CardDefinition;
    svc.registerCard(card);
    svc.setFacts({ models: { fam: { card: "numeric", defaults: { prompt: "model default" }, variants: {}, requires: [] } } } as never);
    // the model arm: a family present + modelId named drives the
    // merge path — the RAW params re-spread once defeated the fill
    svc.compose("numeric", "fam", { width: "768" }, "run-wire-num3");
    assert.equal(seen, 768);
    assert.equal(typeof seen, "number");
  });

  it("a genuinely non-numeric string still REFUSES (the bounds voice stays honest)", async () => {
    const svc = await boot();
    svc.registerCard(numCard());
    assert.throws(
      () => svc.compose("numeric", null, { width: "wide" }, "run-wire-num3"),
      (e: unknown) => e instanceof ComposeRefusal && /refused params: \$\.width expected number but got wide/.test(e.message),
    );
  });

  it("an out-of-bounds number still REFUSES (the fill never re-limits)", async () => {
    const svc = await boot();
    svc.registerCard(numCard());
    assert.throws(
      () => svc.compose("numeric", null, { width: "9999" }, "run-wire-num4"),
      (e: unknown) => e instanceof ComposeRefusal && /refused params: \$\.width expected number <= 2048 but got 9999/.test(e.message),
    );
  });
});
