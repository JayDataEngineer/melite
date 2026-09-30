// @melite/models-z-image — THE IP-ADAPTER LANE GATE, at its new home
// (the kit-arm retirement, 2026-09-30). The t2i lane is composed by
// the families' declared actions, so the gate that refuses a stated
// adapter bag before any node renders is pinned here — on the row the
// old kit wall used. Every t2i family carries the same gate; the law
// is pinned once, where the lane now lives (the wire itself is pinned
// per family in action.spec.ts's goldens).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { t2i } from "../src/actions.ts";
import { DECL } from "../src/index.ts";

const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS = {
  id: DECL.id,
  card: "image-gen",
  defaults: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
  lane_inputs: (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs,
} as unknown as ModelFacts;

const PLAIN = {
  prompt: "x", negative_prompt: "", width: 512, height: 512, seed: 1, steps: 8,
  cfg: 1, sampler: "euler", scheduler: "simple",
};

describe("the lane gate (the family's t2i action refuses before any node renders)", () => {
  it("a stated bag refuses inside the compose lane — never a silent plain run", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => instantiateAction(t2i, { ...PLAIN, ip_adapters: [{ kind: "style", weight: 1 }] }, FACTS, g, "probe-ipa"),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("no executable IP-Adapter lane"),
    );
  });
  it("no bag = the plain path renders (the gate never fires)", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, { ...PLAIN }, FACTS, g, "probe-plain");
    assert.ok(Object.keys(g.toJSON() as object).length > 0, "the plain run renders");
  });
});
