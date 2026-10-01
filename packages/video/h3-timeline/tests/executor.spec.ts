
// ── the executor battery (TEST-2 breadth, 2026-09-12): the shared
// transport/presentation describes ride the estate-call harness
// (cruft row 10, 2026-10-12); this file owns what is H3'S — the
// builder, the args, the serialized-calls prose, and the DUAL-FACE
// law (the root is the row-mount marker, never a card).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import * as cardFace from "../src/card.ts";
import { TOOL_NAME, buildH3TimelineTool as FACE } from "../src/tool.ts";
import { registerExecutorBattery } from "@melite/estate-call/executorHarness";

const GOOD_ARGS = {
  prompt: "walks forward, then turns",
  calls: [{ text: "walks", start_frame: 0, end_frame: 56 }],
};

const harness = registerExecutorBattery({
  makeTool: FACE,
  goodArgs: GOOD_ARGS,
  defaultModel: "h3",
  explicitModel: "h3",
  defaultAnchor: "(\\s|$)",
  explicitAnchor: "\\s",
  draftIntent: "h3-timeline",
  flow: "h3-timeline",
  renderLabel: "h3_timeline",
  drivingField: /shots=1/,
});

describe("the h3 prose rows (calls is annotation-only json)", () => {
  it("a serialized calls string counts zero shots (the prose reads the parsed array)", () => {
    // calls may arrive as its serialized JSON string (the
    // annotation-only json param) — the prose counts 0 then.
    const asString = harness.tool().presentCall?.({ ...harness.goodArgs, calls: JSON.stringify(GOOD_ARGS.calls) }) as unknown as { rawInput?: unknown };
    assert.match(String(asString?.rawInput), /shots=0/);
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

describe("the dual-face law: the root is the row-mount marker", () => {
  it("comfy AND tools present → the marker still registers NOTHING (the SSOT and melite-tools own the truths)", async () => {
    const ctx = new Context();
    // The second arg is the plugin config (absent here): cordis 4.0.2
    // types require it positionally, so the suite passes undefined
    // (cast with the plugin — the `as never` idiom is the estate's).
    await ctx.plugin(ComfyUIService as never, undefined as never);
    await ctx.plugin(StubToolsService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx);
    assert.ok(!svc.cardIds().includes("h3-timeline"), "no card from the marker");
    assert.equal(stub.registered.length, 0, "no tool from the marker");
  });

  it("the CARD face registers where the registry seat lives (the SSOT subpath)", async () => {
    const ctx = new Context();
    await ctx.plugin(ComfyUIService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    await ctx.plugin(cardFace as never, undefined as never);
    assert.ok(svc.cardIds().includes("h3-timeline"), "the card registered");
  });
});
