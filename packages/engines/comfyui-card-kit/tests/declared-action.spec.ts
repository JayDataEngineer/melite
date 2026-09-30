// declared-action.spec.ts — the RULE 5 interlock's only door. The
// helper resolves a card's binding off the family's own DECL; the
// two behaviors the interlock pins: the refusal (a card binding an
// unoffered action id refuses at boarding, naming the family and
// what it does offer) and the identity (the resolved action IS the
// family's declared spec — no wrapper, no copy).
import { describe, expect, it } from "vitest";
import { declaredAction, instantiateAction } from "../src/action.ts";

const action = {
  id: "film",
  inputs: [],
  outputs: [{ name: "video", kind: "VIDEO" }],
  params: [{ name: "seed", type: "number", rule: "seed-sentinel" }],
  facts: (raw: Record<string, unknown>) => raw,
  build: () => ({ node: 1, slot: 0 }) as never,
} as const;

describe("declaredAction — the DECL seam's read", () => {
  it("returns the family's declared action by id, unmodified", () => {
    const decl = { id: "fake-family", actions: [{ ...action }] };
    expect(declaredAction(decl, "film")).toBe(decl.actions[0]);
  });

  it("refuses an unoffered action id at boarding, naming the family and its offers", () => {
    const decl = { id: "fake-family", actions: [{ ...action }] };
    expect(() => declaredAction(decl, "mesh")).toThrow(
      /family 'fake-family' declares no action 'mesh' \(declared: film\) — the card's binding refused at boarding/,
    );
  });

  it("refuses when the family declares no actions at all", () => {
    expect(() => declaredAction({ id: "bare-family" }, "film")).toThrow(
      /family 'bare-family' declares no action 'film' \(declared: none\) — the card's binding refused at boarding/,
    );
  });

  it("feeds instantiateAction: the resolved spec is the interpreter's input", () => {
    // the erasure cast's proof of work — the resolved action runs
    // through instantiateAction and its own facts door + build fire
    const spec = declaredAction({ id: "fake-family", actions: [{ ...action }] }, "film");
    const model = { lane_inputs: { vae: "x.safetensors" } } as never;
    const built = instantiateAction(spec, { seed: -1 }, model, { add: (() => ({})) as never } as never, "run-1");
    expect(built).toEqual({ node: 1, slot: 0 });
  });
});
