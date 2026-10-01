
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is EDIT'S — the
// builder, the model order, the args, and the index face.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import { TOOL_NAME, buildImageEditTool as FACE } from "../src/tool.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

// THE MODEL ORDER (operator catch e): 2.1 is the default lane —
// 2511 boards second (the backup).
const harness = registerExecutorBattery({
  makeTool: FACE,
  goodArgs: { prompt: "make it night", image1: "/m/i.png" },
  defaultModel: "qwen-img-edit-21",
  explicitModel: "qwen-img-edit-2511",
  explicitAnchor: "\\s",
  draftIntent: "image-edit",
  flow: "image-edit",
  renderLabel: "image_edit",
  drivingField: /prompt=make it night/,
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
    assert.ok(svc.cardIds().includes("image-edit"), "the card registered");
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
