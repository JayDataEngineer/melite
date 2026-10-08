
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is TTS'S — the
// builder, the args, the large default, the variant rows, and the
// index face.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import { TOOL_NAME, buildTtsTool as FACE } from "../src/tool.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

// THE LARGE DEFAULT (operator 2026-09-23): boarded[0] = the 1.7B
// family — the unstated model resolves to the large checkpoint.
const harness = registerExecutorBattery({
  makeTool: FACE,
  goodArgs: { text: "the words to speak" },
  defaultModel: "qwen3-tts-voicedesign",
  explicitModel: "qwen3-tts-base",
  draftIntent: "tts",
  flow: "tts",
  drivingField: /text=the words to speak/,
});

describe("the tts variant rows (the enum's route addresses)", () => {
  it("the Base variant's address and the family name both ride the closed enum", () => {
    // the Base variant's address rides the closed enum (agents name
    // no matrix variant — the route is the clone lane's name)
    const explicit = harness.tool().presentCall?.({ ...harness.goodArgs, model: "qwen3-tts-base" }) as unknown as { rawInput?: unknown };
    assert.match(String(explicit?.rawInput), /model=qwen3-tts-base/);
    const bigger = harness.tool().presentCall?.({ ...harness.goodArgs, model: "qwen3-tts-voicedesign" }) as unknown as { rawInput?: unknown };
    assert.match(String(bigger?.rawInput), /model=qwen3-tts-voicedesign/);
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
    assert.ok(svc.cardIds().includes("tts"), "the card registered");
  });

  it("tools present (no comfy) → the root registers NOTHING (dual-face law: the tool face is melite-tools' card gate alone)", async () => {
    const ctx = new Context();
    await ctx.plugin(StubToolsService as never, undefined as never);
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx, { call: harness.seam } as never);
    assert.equal(stub.registered.length, 0, "the marker root registers nothing — melite-tools' card gate owns the tool face");
  });

  it("NEITHER service → apply is a no-op (the standalone host)", async () => {
    const ctx = new Context();
    pkg.apply(ctx, { call: harness.seam } as never);
    assert.ok(true, "no throw — both probes undefined");
  });
});
