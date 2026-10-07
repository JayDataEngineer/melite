// @melite/image-gen — the tool face's EMPTY-DERIVATION fallback.
//
// The served style enum derives from the boarded DECLs' own variant
// rows (semanticModelEntries): when every cell hides or resolves no
// route, the derivation serves NOTHING. The tool still builds — the
// default falls back to the boarded head, and a model value the
// derivation never served crosses the wire raw (resolveSemanticModel
// documents exactly that fallback: null for an unserved value,
// callers keep the raw value). Both arms are defensive: production
// boards routeless-free DECLs, so the live derivation never empties.
import { describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import type { EstateCall } from "@melite/estate-call";
import { BOARDED } from "../src/card.ts";
import { buildImageGenTool } from "../src/tool.ts";

vi.mock("../src/card.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/card.ts")>();
  return { ...actual, SEMANTIC_MODELS: [] };
});

const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];

const seam: EstateCall = async (method, path, body) => {
  calls.push({ method, path, body: body as Record<string, unknown> });
  if (path === "/v1/flows/drafts") return { draftId: "d_empty_1" };
  return { run_id: "r_empty_9", status: "queued" };
};

const exec = {
  callId: "test-call",
  name: "image_gen",
  arguments: {},
  signal: new AbortController().signal,
  deferContext: () => {},
  concludeTurn: () => {},
  rootCallId: "test-call",
  token: "test-token",
} as unknown as Parameters<ToolDefinition["execute"]>[1];

describe("the empty-derivation fallback (no served style survives the DECLs)", () => {
  it("an unstated model falls back to the boarded head (the tool builds with no served default)", async () => {
    calls.length = 0;
    const value = (await buildImageGenTool(seam).execute({ prompt: "a cat in neon rain" }, exec)) as Record<string, string>;
    assert.equal(value.model, BOARDED[0], "the envelope echoes the boarded head, never undefined");
    assert.equal(
      (calls[0].body.stages as Array<Record<string, unknown>>)[0]!.service,
      BOARDED[0],
      "the stage's service rides the same fallback",
    );
    expect(calls[1].body.model).toBe(BOARDED[0]);
  });

  it("a boarded-family model the derivation never served crosses the wire raw (no mangling)", async () => {
    calls.length = 0;
    const value = (await buildImageGenTool(seam).execute(
      { prompt: "a cat in neon rain", model: BOARDED[0] },
      exec,
    )) as Record<string, string>;
    assert.equal(value.model, BOARDED[0], "the envelope keeps the stated spelling");
    assert.equal(
      (calls[0].body.stages as Array<Record<string, unknown>>)[0]!.service,
      BOARDED[0],
      "unresolvable values ride as-is — the estate's admission owns the refusal",
    );
  });
});
