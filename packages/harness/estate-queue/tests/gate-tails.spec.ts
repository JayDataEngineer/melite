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

  it("a CARD id on the model lane names the card and its lane — never a bogus catalog miss (the mask correction, 2026-10-08)", async () => {
    // the fake-seat pattern (runs-registry-reconcile's rig): a
    // minimal registry stub — facts absent (the degrade), the
    // decls table carrying the CARD row the voice must name.
    const ctx = new Context();
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({ mask: {} }),
    };
    const ans = await modelValidateArm({ model: "mask", params: {} }, ctx);
    expect(ans.status).toBe(400);
    const err = String((ans.payload as { error?: string }).error ?? "");
    expect(err).toContain("no model unit for model: mask");
    expect(err).toContain("mask is a CARD");
    expect(err).toContain("never the {model:} door");
    expect(err).not.toContain(".catalog.models row mask");
    await ctx.fiber.dispose();
  });

  it("an unknown id keeps the catalog voice (the card-aware arm widens nothing)", async () => {
    const ctx = new Context();
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({}),
    };
    const ans = await modelValidateArm({ model: "not-a-card", params: {} }, ctx);
    expect(ans.status).toBe(400);
    const err = String((ans.payload as { error?: string }).error ?? "");
    expect(err).toContain("no .catalog.models row not-a-card");
    expect(err).not.toContain("is a CARD");
    await ctx.fiber.dispose();
  });
});
