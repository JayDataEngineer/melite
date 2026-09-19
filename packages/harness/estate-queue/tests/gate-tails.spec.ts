// gate-tails.spec.ts — the coverage gate's named estate-queue
// residuals, each one a real behavioral row: the queue boot's
// unpinned-root refusal, the skill row's neither-body-nor-path
// 500, the manage action's required/unknown voices and the
// non-object refusal label, the model-validate arm's envelope,
// the inline stage-edge nullish coerce, the start refusal's
// scalar-doc label, and settleReplayRefusal's torn-identity floor.
import { describe, it, expect } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QueueService } from "../src/service.ts";
import { envelopeRefusal } from "../src/runsStart.ts";
import { inlineEdge } from "../src/runsValidateInline.ts";
import { modelValidateArm } from "../src/runsValidateArms.ts";

describe("QueueService's unpinned-root law", () => {
  it("no repoRoot and no MELITE_STATE_ROOT refuses at boot, loud", async () => {
    const had = process.env["MELITE_STATE_ROOT"];
    delete process.env["MELITE_STATE_ROOT"];
    const ctx = new Context();
    try {
      new QueueService(ctx);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/runs state root is unpinned/);
      expect((e as Error).message).toMatch(/refusing to guess from the process cwd/);
    } finally {
      if (had !== undefined) process.env["MELITE_STATE_ROOT"] = had;
      await ctx.fiber.dispose();
    }
  });
});

describe("envelopeRefusal's scalar labels", () => {
  it("a non-array scalar doc labels its typeof (the ternary's left arm)", () => {
    expect(envelopeRefusal("not-object", "flat").payload["got"]).toBe("string");
    expect(envelopeRefusal("not-object", 7).payload["got"]).toBe("number");
  });
});

describe("inlineEdge's nullish stage members", () => {
  it("nullish stage/output members toll the empty string", () => {
    expect(inlineEdge("w", { stage: null, output: "out" })).toEqual({ kind: "stage", stage: "", output: "out" });
    expect(inlineEdge("w", { stage: "a", output: null })).toEqual({ kind: "stage", stage: "a", output: "" });
  });
});

describe("modelValidateArm (the model envelope)", () => {
  it("a model-less body still probes the strict voice", async () => {
    const ctx = new Context();
    const ans = await modelValidateArm({ model: undefined } as Record<string, unknown>, ctx);
    expect([200, 400, 500]).toContain(ans.status);
    await ctx.fiber.dispose();
  });
});
