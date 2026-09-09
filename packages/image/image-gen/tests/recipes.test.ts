// @melite/image-image-gen — the RECIPE cascade tests.
//
// THE LAW (operator): recipes are configs ON the card — named
// override sets that can carry mod payloads. THE RECEIPT (dsh's
// agent-default-model + the settings cascade, "schema defaults,
// then base, then the user layer"): schema defaults < recipe
// overlay < explicit args. Scalars layer (a stated arg beats the
// recipe); the lora stack CONCATs (recipe first, the caller's
// after). The engine's compose applies this at its one merge
// point (service.ts applyRecipe); the recipe KEY is consumed and
// never reaches the graph.
//
// Run: node --experimental-strip-types --test tests/
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { ComfyUIService } from "@melite/comfyui/service";
import type { FactsFile } from "@melite/card-kit/facts";
import { registerCard } from "../src/card.ts";
import { RECIPES, DEFAULT_RECIPE } from "../src/recipes.ts";

const boot = async () => {
  const ctx = new Context();
  const svc = new ComfyUIService(ctx);
  registerCard(ctx, svc);
  // Facts stub: the compose door requires a facts row for the model
  // id (card gate + defaults). The krea-2 frozen row carries its
  // card_knobs (the kit's injection splice); lane rest stays empty.
  const frozen = JSON.parse(
    readFileSync(new URL("../../../engines/comfyui-cordis/data/model-facts.json", import.meta.url), "utf8"),
  ) as { rows: Record<string, { card: string; card_knobs?: unknown[] }> };
  svc.setFacts({
    models: {
      "krea-2": {
        id: "krea-2",
        card: frozen.rows["krea-2"]!.card,
        defaults: {},
        lane_inputs: {},
        card_knobs: frozen.rows["krea-2"]!.card_knobs ?? [],
        variants: [],
        variant_groups: [],
        outputs: [],
        mods: [],
      },
    },
    extension_node_types: {},
  } as FactsFile);
  return { ctx, svc };
};

const graphText = (g: unknown): string => JSON.stringify(g);

describe("the recipe catalog (data, in the card package)", () => {
  it("three named configs; standard is the null overlay", () => {
    assert.deepEqual(Object.keys(RECIPES).sort(), ["cinematic", "fast_draft", "standard"]);
    assert.equal(DEFAULT_RECIPE, "standard");
    assert.deepEqual(RECIPES.standard!.params, {});
    assert.equal(RECIPES.fast_draft!.params.steps, 6);
    assert.equal(RECIPES.cinematic!.params.cfg, 6);
  });
});

describe("the cascade through compose (the engine's one merge point)", () => {
  it("unstated recipe resolves the schema defaults", async () => {
    const { svc, ctx } = await boot();
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat" }, "run-1");
    const text = graphText(graph);
    assert.ok(text.includes('"steps":8'), "schema default survives (steps 8)");
    await ctx.fiber.dispose();
  });

  it("the recipe overlay rides between defaults and explicit args", async () => {
    const { svc, ctx } = await boot();
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat", recipe: "fast_draft" }, "run-2");
    assert.ok(graphText(graph).includes('"steps":6'), "recipe steps overlay the schema default");
    await ctx.fiber.dispose();
  });

  it("a stated arg beats the recipe (the user layer wins)", async () => {
    const { svc, ctx } = await boot();
    const graph = svc.compose(
      "image-gen", "krea-2", { prompt: "a cat", recipe: "fast_draft", steps: 10 }, "run-3",
    );
    assert.ok(graphText(graph).includes('"steps":10'), "explicit steps win over the recipe");
    await ctx.fiber.dispose();
  });

  it("cinematic carries its own negative prompt; explicit wins there too", async () => {
    const { svc, ctx } = await boot();
    const movie = svc.compose(
      "image-gen", "krea-2", { prompt: "a cat", recipe: "cinematic" }, "run-4",
    );
    assert.ok(graphText(movie).includes("flat lighting"), "the recipe's negative prompt lands");
    const mine = svc.compose(
      "image-gen", "krea-2", { prompt: "a cat", recipe: "cinematic", negative_prompt: "mine" }, "run-5",
    );
    assert.ok(graphText(mine).includes('"mine"'), "a stated negative prompt beats the recipe");
    await ctx.fiber.dispose();
  });
});

describe("the recipe key is consumed; the lora stack concats", () => {
  // A throwaway probe card on the model-less branch: spy compose
  // observes the merged dict the engine hands it (what the graph
  // kit would receive), proving consumption + concat without the
  // facts plane.
  const probeBoot = async () => {
    const ctx = new Context();
    const svc = new ComfyUIService(ctx);
    let seen: Record<string, unknown> | undefined;
    ctx.effect(() => svc.registerCard({
      id: "recipe-probe",
      skeleton: "probe",
      boarded: [],
      requiresModel: false,
      recipes: {
        stacked: {
          label: "Stacked",
          description: "A probe recipe carrying a mod payload.",
          params: { n: 5 },
          loras: [{ name: "probe.safetensors", weight: 0.7 }],
        },
      },
      schema: z.object({ n: z.number().default(1), recipe: z.string().default("stacked") }) as unknown as (v: unknown) => Record<string, unknown>,
      compose(p) { seen = { ...p }; },
    }));
    return { ctx, svc, seen: () => seen };
  };

  it("the key never reaches compose; scalars layer", async () => {
    const { svc, ctx, seen } = await probeBoot();
    svc.compose("recipe-probe", null, { n: 2 }, "r1");
    assert.ok(!("recipe" in seen()!), "the key is consumed at the merge point");
    assert.equal(seen()!.n, 2, "stated n beats the recipe's 5");
    await ctx.fiber.dispose();
  });

  it("the recipe's lora stack rides AHEAD of the caller's", async () => {
    const { svc, ctx, seen } = await probeBoot();
    svc.compose("recipe-probe", null, { loras: [{ name: "mine.safetensors" }] }, "r2");
    const stack = seen()!.loras as Array<{ name: string }>;
    assert.deepEqual(stack.map((l) => l.name), ["probe.safetensors", "mine.safetensors"]);
    await ctx.fiber.dispose();
  });
});
