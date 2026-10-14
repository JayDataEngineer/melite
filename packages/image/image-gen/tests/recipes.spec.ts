// @melite/image-image-gen — the stroke-34 recipe DEATH certificate.
//
// THE LAW (operator, 2026-09-14: "the recipe doesn't take into
// account models, so it makes bad parameters"): the card-recipe
// layer is GONE. The old catalog stamped model-blind scalars
// (fast_draft: steps 6 — half-formed on raw's 52-step reference
// checkpoint; cinematic: cfg 6 — fights the distilled lane's
// baked-in guidance). One-click presets live in the FAMILY DECL as
// Recipe rows; the client stamps them as macros onto declared
// knobs/bags (never a persisted mode). These walls pin the death:
//
//  1. no catalog on the definition, no knob in the schema;
//  2. compose is the honest three-plane merge — a stray recipe key
//     is INERT at the engine (the estate's admission gate is the
//     plane that refuses it);
//  3. explicit args ride the one merge, same as ever.
//
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import { ComposeRefusal } from '@melite/comfyui-card-kit/errors'
import type { FactsFile } from "@melite/comfyui-card-kit/facts";
import { DECL as krea2Decl } from "@melite/models-krea-2";
import { registerCard } from "../src/card.ts";

const boot = async (mods: string[] = []) => {
  const ctx = new Context();
  const svc = new ComfyUIService(ctx);
  registerCard(ctx, svc);
  // Facts stub: the compose door requires a facts row for the model
  // id (card gate + defaults). The lane truth comes from the DECL
  // itself (one truth — the stub rides the card's ACTION ROUTE
  // since the atom vocabulary, and the bound door parses the row:
  // an empty lane stub is drift, not a lane; the legacy arm had
  // composed undefined-input nodes vacuously).
  const frozen = JSON.parse(
    readFileSync(new URL("../../../engines/comfyui-cordis/data/model-facts.json", import.meta.url), "utf8"),
  ) as { rows: Record<string, { card: string; card_knobs?: unknown[] }> };
  svc.setFacts({
    models: {
      "krea-2": {
        id: krea2Decl.id,
        card: frozen.rows["krea-2"]!.card,
        defaults: { width: 1024, height: 1024, steps: 8 },
        lane_inputs: krea2Decl.lane_inputs ?? {},
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

describe("the card-recipe layer is dead (stroke 34)", () => {
  it("compose is the honest merge — model defaults stand, no overlay leg", async () => {
    const { svc, ctx } = await boot();
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat" }, "run-1");
    assert.ok(graphText(graph).includes('"steps":8'), "the family default survives — nothing overlays it");
    await ctx.fiber.dispose();
  });

  it("a stray recipe key REFUSES at compose (T6: admission is the engine's door too)", async () => {
    const { svc, ctx } = await boot();
    // The recipe layer is dead and its key is declared nowhere — the
    // T6 strict resolve changed the old inert pass-through into a
    // loud refusal: a key no layer consumes never composes (the CLI
    // door already refused it; the run seat now matches). The
    // no-overlay law is unchanged and proven by the sibling tests.
    assert.throws(
      () => svc.compose("image-gen", "krea-2", { prompt: "a cat", recipe: "fast_draft" }, "run-2"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-param" && /recipe/.test(e.message),
    );
    await ctx.fiber.dispose();
  });

  it("explicit args ride the one merge — the user layer wins, same as ever", async () => {
    const { svc, ctx } = await boot();
    const graph = svc.compose("image-gen", "krea-2", { prompt: "a cat", steps: 10 }, "run-3");
    assert.ok(graphText(graph).includes('"steps":10'), "explicit steps win over every base layer");
    await ctx.fiber.dispose();
  });
});
