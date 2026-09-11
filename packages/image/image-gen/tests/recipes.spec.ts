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
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { FactsFile } from "@melite/comfyui-card-kit/facts";
import { registerCard } from "../src/card.ts";
import { RECIPES, DEFAULT_RECIPE } from "../src/recipes.ts";

const boot = async (mods: string[] = []) => {
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
        mods,
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
      sidebar: { key: "probe", order: 99 },
      flowKinds: {
        inputs: {},
        outputs: { default: "image" },
        requiresModel: false,
      },
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

describe("the model-folder layer (the phantom that lied, 2026-09-10)", () => {
  // The cascade's second layer had NO pin and NO data (no boarded
  // model carries a defaults row) while the card's own principle
  // claimed it owned resolution/steps/cfg. These tests stub the
  // layer and pin its position: schema < model-folder < card
  // recipe < explicit. The family rail feeds through HERE — rail
  // selection resolves the model row, so two rows with different
  // defaults compose different values (last test).
  const modelBoot = async (defaults: Record<string, unknown>, extraRows: Record<string, Record<string, unknown>> = {}) => {
    const ctx = new Context();
    const svc = new ComfyUIService(ctx);
    registerCard(ctx, svc);
    const frozen = JSON.parse(
      readFileSync(new URL("../../../engines/comfyui-cordis/data/model-facts.json", import.meta.url), "utf8"),
    ) as { rows: Record<string, { card: string; card_knobs?: unknown[] }> };
    const row = (id: string, d: Record<string, unknown>) => ({
      id,
      card: frozen.rows["krea-2"]!.card,
      defaults: d,
      lane_inputs: {},
      card_knobs: frozen.rows["krea-2"]!.card_knobs ?? [],
      variants: [],
      variant_groups: [],
      outputs: [],
      mods: [],
    });
    svc.setFacts({
      models: {
        "krea-2": row("krea-2", defaults),
        ...Object.fromEntries(Object.entries(extraRows).map(([id, d]) => [id, row(id, d)])),
      },
      extension_node_types: {},
    } as FactsFile);
    return { ctx, svc };
  };

  it("model-folder defaults beat the schema defaults", async () => {
    const { svc, ctx } = await modelBoot({ steps: 20 });
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat" }, "m-1");
    assert.ok(graphText(graph).includes('"steps":20'), "folder steps 20 overlays schema 8");
    await ctx.fiber.dispose();
  });

  it("the card recipe beats the model-folder defaults", async () => {
    const { svc, ctx } = await modelBoot({ steps: 20 });
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat", recipe: "fast_draft" }, "m-2");
    assert.ok(graphText(graph).includes('"steps":6'), "recipe steps 6 overlays folder 20");
    await ctx.fiber.dispose();
  });

  it("explicit args beat the model-folder defaults", async () => {
    const { svc, ctx } = await modelBoot({ steps: 20 });
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat", steps: 10 }, "m-3");
    assert.ok(graphText(graph).includes('"steps":10'), "explicit steps 10 overlays folder 20");
    await ctx.fiber.dispose();
  });

  it("the family rail feeds through the model row (different rows, different values)", async () => {
    const { svc, ctx } = await modelBoot({ steps: 20 }, { "z-image": { steps: 30 } });
    const a = graphText(svc.compose("image-gen", "krea-2", { prompt: "a cat" }, "m-4a"));
    const b = graphText(svc.compose("image-gen", "z-image", { prompt: "a cat" }, "m-4b"));
    assert.ok(a.includes('"steps":20') && b.includes('"steps":30'), "rail selection resolves the row's defaults");
    await ctx.fiber.dispose();
  });
});

describe("the lora wire resolution (the id/name split, 2026-09-10)", () => {
  // The 2026-09-06 wire flip moved the UI boundary to id-keyed rows
  // ({id, strength}) but never the engine consumer — fireLoras read
  // .name off id-keyed rows (undefined) and every LoRA run silently
  // stacked nothing. compose resolves ids through the boarded
  // family's flavor rows; filenames (card-authored recipe payloads)
  // pass through; unknown ids refuse LOUD.
  const loraBoot = async () => {
    const { svc, ctx } = await boot(["loras"]);
    ctx.effect(() => (svc as unknown as {
      registerPack: (c: unknown) => void;
      registerFlavor: (f: unknown) => void;
    }).registerPack({ pack: "loras", fields: z.object({}) }));
    ctx.effect(() => (svc as unknown as {
      registerPack: (c: unknown) => void;
      registerFlavor: (f: unknown) => void;
    }).registerFlavor({
      pack: "loras",
      families: ["krea-2"],
      rows: [{ id: "realism", filename: "krea-2/realism.safetensors", source_url: "https://example.invalid/r.safetensors" }],
    }));
    return { ctx, svc };
  };

  it("id-keyed UI rows resolve to filenames in the graph", async () => {
    const { svc, ctx } = await loraBoot();
    const graph = svc.compose("image-gen", "krea-2", {
      prompt: "a cat", loras: [{ id: "realism", strength: 0.7 }],
    }, "l-1");
    assert.ok(
      graphText(graph).includes("krea-2/realism.safetensors"),
      "the flavor filename lands in the LoraLoader",
    );
    await ctx.fiber.dispose();
  });

  it("unknown lora ids refuse loud (never a silent plain run)", async () => {
    const { svc, ctx } = await loraBoot();
    assert.throws(
      () => svc.compose("image-gen", "krea-2", {
        prompt: "a cat", loras: [{ id: "hand-spelled" }],
      }, "l-2"),
      /hand-spelled/,
    );
    await ctx.fiber.dispose();
  });
});
