
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is IMAGE-GEN'S —
// the builder, the args, the recipe-absence pin, and the index face.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import { buildImageGenTool as FACE } from "../src/tool.ts";
import { TOOL_NAME } from "../src/wire.ts";
import { SEMANTIC_MODELS } from "../src/card.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

// The semantic spellings, derived from the card (never re-spelled):
// the envelope carries the style value; the wire carries its route.
const FIRST = SEMANTIC_MODELS[0]!;
const SECOND = SEMANTIC_MODELS[1]!;

const harness = registerExecutorBattery({
  makeTool: FACE,
  goodArgs: { prompt: "a koi pond at dusk" },
  defaultModel: FIRST.value,
  defaultModelRoute: FIRST.route,
  explicitModel: SECOND.value,
  explicitModelRoute: SECOND.route,
  explicitAnchor: "\\s",
  draftIntent: "image-gen",
  flow: "image-gen",
  renderLabel: "image_gen",
  drivingField: /prompt=a koi pond at dusk/,
});

describe("the gen prose rows", () => {
  it("the driving fields are prompt + model; recipe is gone (stroke 34)", () => {
    const card = harness.tool().presentCall?.(harness.goodArgs) as unknown as { rawInput?: unknown };
    assert.match(String(card?.rawInput), /prompt=a koi pond at dusk/);
    // the card-recipe layer is dead — the summary never names a key
    // the card can no longer declare
    assert.doesNotMatch(String(card?.rawInput), /recipe=/);
  });
});

/** The tools-service surface stub (the Consumer-owned shape). */
class StubToolsService extends Service {
  registered: ToolDefinition[] = [];
  constructor(ctx: Context) { super(ctx, "tools"); }
  register(tool: ToolDefinition): () => void {
    this.registered.push(tool);
    return () => {
      const i = this.registered.indexOf(tool);
      if (i >= 0) this.registered.splice(i, 1);
    };
  }
}

describe("the index face: apply takes the services it finds", () => {
  it("comfy present → the card registers; tools absent → no tool", async () => {
    const ctx = new Context();
    await ctx.plugin(ComfyUIService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    pkg.apply(ctx, { call: harness.seam } as never);
    assert.ok(svc.cardIds().includes("image-gen"), "the card registered");
  });

  it("tools present (no comfy) → the tool registers bare", async () => {
    const ctx = new Context();
    await ctx.plugin(StubToolsService as never, undefined as never);
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx, { call: harness.seam } as never);
    assert.equal(stub.registered.length, 1);
    assert.equal(stub.registered[0]!.name, TOOL_NAME);
  });

  it("NEITHER service → apply is a no-op (the standalone host)", async () => {
    const ctx = new Context();
    pkg.apply(ctx, { call: harness.seam } as never);
    assert.ok(true, "no throw — both probes undefined");
  });
});
