// @melite/comfyui-card-kit — the action-contract interpreter walls
// (stroke-1 pilot). The unit is the CONTRACT, not any one action: a
// stub action proves the facts door runs before anything builds, the
// seed-sentinel rule mints through the ONE minter (GATE S: -1 mints
// fresh, a fixed seed rides verbatim), and the rule refuses loud on
// any param but 'seed'. The qwen t2i action's own graph proof lives
// in the family package (packages/models/qwen-img-21/tests).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { instantiateAction, type ComfyActionSpec } from "../src/kit.ts";
import { GraphBuilder } from "../src/graph.ts";
import type { ModelFacts } from "../src/facts.ts";

type EchoParams = { seed: number; steps?: number };

const model: ModelFacts = {
  id: "stub-family",
  card: "stub-card",
  defaults: {},
  lane_inputs: { unet: "stub.safetensors" },
  variants: [],
  variant_groups: [],
  outputs: [],
};

const echo: ComfyActionSpec<EchoParams, { unet: string }> = {
  id: "echo",
  outputs: [{ name: "image", kind: "IMAGE" }],
  // steps rides declared-but-unruled: the interpreter passes it
  // through untouched (only ruled params get managed-affair handling).
  params: [{ name: "seed", rule: "seed-sentinel" }, { name: "steps" }],
  facts: (raw) => {
    const unet = raw.unet;
    if (typeof unet !== "string") throw new Error("facts door: lane_inputs.unet must be a string");
    return { unet };
  },
  build: ({ p, facts, g }) => g.node("EchoNode", { seed: p.seed, steps: p.steps, unet: facts.unet }).out(),
};

const seedOf = (g: GraphBuilder): unknown =>
  (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["EchoNode.0"]?.inputs.seed;

describe("instantiateAction (the interpreter contract)", () => {
  it("the facts door runs first: its refusal propagates and nothing builds", () => {
    const refusing: ComfyActionSpec<EchoParams, { unet: string }> = {
      ...echo,
      facts: () => {
        throw new Error("facts door refused: unknown text_encode_node");
      },
    };
    assert.throws(
      () => instantiateAction(refusing, { seed: 1 }, model, new GraphBuilder({}), "r1"),
      /facts door refused/,
    );
  });

  it("GATE S through the declared rule: the sentinel -1 mints a concrete seed, two runs differ", () => {
    const g1 = new GraphBuilder({});
    instantiateAction(echo, { seed: -1 }, model, g1, "r2a");
    const g2 = new GraphBuilder({});
    instantiateAction(echo, { seed: -1 }, model, g2, "r2b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0, `minted a concrete int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under the sentinel mints fresh");
  });

  it("a fixed seed rides verbatim (explicit user intent is never overridden)", () => {
    const g = new GraphBuilder({});
    instantiateAction(echo, { seed: 1234, steps: 30 }, model, g, "r3");
    const inputs = (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["EchoNode.0"]?.inputs;
    assert.equal(inputs?.seed, 1234);
    assert.equal(inputs?.steps, 30, "a declared-but-unruled param rides untouched — no managed affair fires");
  });

  it("the minter's own floor refuses below the sentinel (never a live engine 400)", () => {
    assert.throws(
      () => instantiateAction(echo, { seed: -2 }, model, new GraphBuilder({}), "r4"),
      /seed = -2/,
    );
  });

  it("the seed-sentinel rule on any param but 'seed' refuses loud", () => {
    const badRule: ComfyActionSpec<{ steps: number }, Record<string, never>> = {
      id: "bad-rule",
      outputs: [],
      params: [{ name: "steps", rule: "seed-sentinel" }],
      facts: () => ({}),
      build: () => {
        throw new Error("unreachable: the rule refusal fires before build");
      },
    };
    assert.throws(
      () => instantiateAction(badRule, { steps: 8 }, model, new GraphBuilder({}), "r5"),
      /'bad-rule': the seed-sentinel rule fires on the 'seed' param, not 'steps'/,
    );
  });
});
