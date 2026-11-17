// @melite/audio-tts — the tool face's ABSENT-FAMILY fallback.
//
// THE PLUGIN LAW (L3, 2026-11-17): the tool builds even when NO
// family package is installed — the knob falls back to the boarded
// atom alone (no route rows) and the large-default law falls to
// BOARDED[0] when the seat never filled (the run refuses loud at
// the model seat — the image-gen fallback law). The present-family
// arm is tool.spec.ts's; THIS file pins the empty seat.
import { describe, it, expect, vi } from "vitest";
import assert from "node:assert/strict";
import { BOARDED } from "../src/card.ts";
import { buildTtsTool, TOOL_NAME } from "../src/tool.ts";

// simulate the absent estate: no family package primed, no route
// resolves (the per-family degrade law — the card's own module
// never dies for a family).
vi.mock("../src/family-seats.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/family-seats.ts")>();
  return { ...actual, primeFamilySeats: async () => {}, offeredRoutes: () => [], largeRoute: () => undefined };
});

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") };

const tool = await buildTtsTool(REFUSING_CALL);

const modelParam = (() => {
  const params = tool.parameters as { properties?: Record<string, { enum?: string[] }> };
  return params.properties?.model;
})();

describe("the absent-family fallback (no family package installed)", () => {
  it("the tool still builds; the single boarded atom needs no picker (the top-level model IS the card)", () => {
    assert.equal(tool.name, TOOL_NAME);
    // THE SINGLE-FAMILY LAW (params-emit): the model knob exists
    // only on MULTI-family boards. An absent family leaves the
    // boarded atom alone — no synthesized picker, the {model:} door
    // owns admission, and the run refuses loud at the model seat.
    assert.equal(modelParam, undefined, "a single-family board serves no model picker — the top-level model IS the card");
    const params = tool.parameters as { properties?: Record<string, unknown> };
    assert.ok(params.properties?.text !== undefined, "the card's own knobs still serve");
  });
});
