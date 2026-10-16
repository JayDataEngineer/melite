// mod-bag-pipeline.spec.ts — THE MOD-BAG CLASS WALL: the studio's
// bag rows ({id, strength}) must reach the ENGINE-VISIBLE loader
// stack (a serialized stack_data row carrying the flavor row's
// FILENAME) through the real service door — the exact compose path
// every run takes. Judged at the wire, never at node presence: a
// row with no `lora` field IS the silent no-op the operator caught
// live (2026-10-16: "I see lora in modifiers. I add it, and drop
// it. The result is the same.") — this wall burns on that class,
// graph-wide.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService } from "../src/service.ts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { loadCardDefs, composeModPlane } from "../src/cardDefs.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel, cascadeInit } from "../src/models/models.ts";

await cascadeInit();

const here = dirname(fileURLToPath(import.meta.url));
const factsDoc = loadFacts(join(here, "..", "data", "model-facts.json"), { getModel, registryIds, registryModel });
const defs: Map<string, CardDefinition> = await loadCardDefs();
const H3_CARD = [...defs.keys()].find((id) => id.includes("h3")) ?? "";
const H3_MODEL = (defs.get(H3_CARD)?.boarded ?? [null])[0] as string | null;

type Graph = Record<string, { class_type: string, inputs: Record<string, unknown> }>;

const boot = async (): Promise<{ svc: ComfyUIService, ctx: Context }> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  // THE MOD PLANE, the estate's own boot (cardsCompose.ts): packs +
  // flavors register from the family DECLs' mods trees — the REAL
  // catalog rows, never synthetic ones (the wall judges the same
  // truth every run resolves against)
  await composeModPlane(ctx);
  return { svc: ctx.comfyui as ComfyUIService, ctx };
};

const stackRows = (graph: Graph): Array<Array<Record<string, unknown>>> =>
  Object.values(graph)
    .filter((n) => n.class_type === "LTX_lora_loader")
    .map((n) => JSON.parse(String(n.inputs.stack_data ?? "[]")) as Array<Record<string, unknown>>);

// THE EXPECTED ROWS DERIVE FROM THE DECL (tautology sweep 2026-10-16:
// the hand-copied table had ALREADY drifted — its dmad filename was
// stale vs mods/loras.ts while the wall stayed green, dead data
// proving hand-copies rot; a wall judging a copy of the truth passes
// while the truth burns). Import the served rows; never retype them.
import { H3_LORA_ROWS } from "@melite/models-h3/mods/loras";
const turbo = H3_LORA_ROWS.find((r) => r.id === "h3_lightx2v_turbo")!;
const dmad = H3_LORA_ROWS.find((r) => r.id === "h3_dmad_4step")!

describe("THE MOD-BAG PIPELINE (studio bag → service door → loader stack)", () => {
  let svc: ComfyUIService;

  beforeAll(async () => {
    const booted = await boot();
    svc = booted.svc;
    svc.registerCard(defs.get(H3_CARD)!);
    svc.setFacts(factsDoc);
  });

  it("THE CLASS LAW: every stack row carries a non-empty lora filename — a row without one is the silent no-op, anywhere in the graph", () => {
    const graph = svc.compose(H3_CARD, H3_MODEL, {
      calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90 }],
      loras: [{ id: "h3_lightx2v_turbo", strength: 1 }],
      seed: 42,
    }, "wall_bag") as Graph;
    const rows = stackRows(graph).flat();
    assert.ok(rows.length > 0, "a bagged compose builds loader stack rows");
    for (const r of rows) {
      assert.equal(typeof r.lora, "string", `every stack row names its weights file (got keys: ${Object.keys(r).join(",")})`);
      assert.notEqual((r.lora as string).trim(), "", "the lora filename is non-empty");
    }
    // THE RESOLVER'S RECEIPT: the studio's {id} became the flavor
    // row's FILENAME — the engine can only load what it can name
    assert.ok(
      rows.some((r) => r.lora === turbo.filename && r.str === 1),
      "the studio row {id: h3_lightx2v_turbo, strength: 1} arrives as the flavor row's filename at strength 1",
    );
  });

  it("AN UNKNOWN ID REFUSES LOUD at the service door — never a silent plain run", () => {
    assert.throws(
      () => svc.compose(H3_CARD, H3_MODEL, {
        calls: [{ text: "x", start_frame: 0, end_frame: 90 }],
        loras: [{ id: "ghost", strength: 1 }],
      }, "wall_ghost"),
      /unknown-lora|names lora id 'ghost'/,
    );
  });

  it("AN EMPTY BAG rides the family default — and THAT row too carries the DECL'S real filename", () => {
    const graph = svc.compose(H3_CARD, H3_MODEL, {
      calls: [{ text: "x", start_frame: 0, end_frame: 90 }],
      loras: [],
      seed: 1,
    }, "wall_empty") as Graph;
    const rows = stackRows(graph).flat();
    assert.ok(rows.length > 0, "the default solo rides");
    for (const r of rows) {
      assert.equal(typeof r.lora, "string", "the default row names real weights");
      assert.notEqual((r.lora as string).trim(), "");
    }
    // THE DECL-BOUND RECEIPT (tautology sweep 2026-10-16: the old arm
    // narrated "a REAL filename" but tested only non-empty-string — a
    // placeholder passed): the default row is the DECL's own dmad
    // filename, derived — the wall rots no more hand-copies
    assert.ok(
      rows.some((r) => r.lora === dmad.filename),
      `the default row is the DECL's dmad filename (${dmad.filename})`,
    );
  });
});
