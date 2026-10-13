
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is MOTION'S — the
// builder, the args, and the index face.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import * as cardFace from "../src/card.ts";
import { TOOL_NAME, buildMotionTool as FACE } from "../src/tool.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

const harness = registerExecutorBattery({
  makeTool: FACE,
  goodArgs: { prompt: "walks forward, then turns" },
  defaultModel: "kimodo",
  explicitModel: "motion3",
  draftIntent: "motion",
  flow: "motion",
  drivingField: /prompt=walks forward, then turns/,
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

describe("the dual-face law (2026-09-12, the loader-proven split)", () => {
  it("the ROOT face registers NOTHING (the web profile's row-mount marker)", async () => {
    const ctx = new Context();
    // The second arg is the plugin config (absent here): cordis 4.0.2
    // types require it positionally, so the suite passes undefined
    // rather than weakening the plugin cast.
    await ctx.plugin(ComfyUIService as never, undefined as never);
    await ctx.plugin(StubToolsService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx);
    assert.ok(!svc.cardIds().includes("motion"), "no card from the marker");
    assert.equal(stub.registered.length, 0, "no tool from the marker");
  });

  it("the CARD face (./card — the cardPackages SSOT row) registers the card under comfyui", async () => {
    const ctx = new Context();
    await ctx.plugin(ComfyUIService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    await ctx.plugin(cardFace, undefined as never);
    assert.ok(svc.cardIds().includes("motion"), "the card registered");
  });

  it("the tool ride is melite-tools' — buildMotionTool stays the one builder", () => {
    const def = FACE(harness.seam);
    assert.equal(def.name, TOOL_NAME);
  });
});
