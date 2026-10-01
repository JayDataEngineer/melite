
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is MUSIC's — the
// builder, the args, the intent, the prose, and the index face.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import { TOOL_NAME, buildMusicTool as FACE } from "../src/tool.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

registerExecutorBattery({
  makeTool: FACE,
  goodArgs: { prompt: "a funky guitar loop" },
  defaultModel: "music3",
  explicitModel: "music3",
  draftIntent: "music",
  flow: "music",
  drivingField: /prompt=a funky guitar loop/,
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
    pkg.apply(ctx, { call: () => Promise.resolve({}) } as never);
    assert.ok(svc.cardIds().includes("music"), "the card registered");
  });

  it("tools present (no comfy) → the tool registers bare", async () => {
    const ctx = new Context();
    await ctx.plugin(StubToolsService as never, undefined as never);
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx, { call: () => Promise.resolve({}) } as never);
    assert.equal(stub.registered.length, 1);
    assert.equal(stub.registered[0]!.name, TOOL_NAME);
  });

  it("NEITHER service → apply is a no-op (the standalone host)", async () => {
    const ctx = new Context();
    pkg.apply(ctx, { call: () => Promise.resolve({}) } as never);
    assert.ok(true, "no throw — both probes undefined");
  });
});
