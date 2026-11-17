// @melite/audio-music — the tool face's ABSENT-FAMILY fallback.
//
// THE PLUGIN LAW (L3, 2026-11-17): the tool builds even when NO
// family package is installed — the knob falls back to the BOARDED
// literal (the enum serves the ids; the run refuses loud at the
// model seat — the image-gen fallback law). The present-families
// arm is tool.spec.ts's; THIS file pins the empty seat: the tool
// still builds, the enum serves the boarded ids verbatim, and the
// default is the boarded head.
import { describe, it, expect, vi } from "vitest";
import assert from "node:assert/strict";
import { BOARDED } from "../src/card.ts";
import { buildMusicTool, TOOL_NAME } from "../src/tool.ts";

// simulate the absent estate: no family package primed, no boarded
// model resolves (the per-family degrade law — the card's own
// module never dies for a family).
vi.mock("../src/family-seats.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/family-seats.ts")>();
  return { ...actual, primeFamilySeats: async () => {}, boardedModels: () => [] };
});

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") };

const tool = await buildMusicTool(REFUSING_CALL);

const modelParam = (() => {
  const params = tool.parameters as { properties?: Record<string, { enum?: string[] }> };
  return params.properties?.model;
})();

describe("the absent-family fallback (no family package installed)", () => {
  it("the tool still builds and defaults to the boarded head (never undefined)", () => {
    assert.equal(tool.name, TOOL_NAME);
    assert.ok(modelParam !== undefined, "the model knob still serves");
    assert.deepEqual(modelParam?.enum, [...BOARDED], "the enum serves the BOARDED literal verbatim when no seat resolves");
  });
});
