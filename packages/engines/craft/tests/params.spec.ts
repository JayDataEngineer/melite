import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { craftParams, craftFormDoc, normalizeCraftStageParams, normalizeCraftCommand, CRAFT_MAX_ITERATIONS_HARD_CAP } from "../src/params.ts";

const W = "craft stage \"s\"";

describe("the craft params contract (stroke 69 — anti-drift)", () => {
  it("THE GOLDEN WALL: the contract's serialization is pinned (envelope root = the four fields, types deterministic)", () => {
    const json = JSON.stringify(craftParams.toJSON());
    const env = JSON.parse(json) as { uid: number; refs: Record<string, { type: string; dict?: Record<string, number> }> };
    // the ROOT is the node the envelope's uid names (the nested
    // command object carries its own dict — never guess by order)
    const root = env.refs[String(env.uid)]!;
    assert.deepEqual(Object.keys(root.dict!).sort(), ["agent_prompt", "command", "max_iterations", "model"]);
    const at = (k: string) => env.refs[String(root.dict![k])]!.type;
    assert.equal(at("agent_prompt"), "string");
    assert.equal(at("model"), "string");
    assert.equal(at("max_iterations"), "number");
    assert.equal(at("command"), "object");
    assert.equal(json, JSON.stringify(craftParams.toJSON()), "serialization is deterministic");
  });

  it("the hard cap is ONE declaration (gate + form tooltip + engine re-export share it)", () => {
    assert.equal(CRAFT_MAX_ITERATIONS_HARD_CAP, 1000);
  });
});

describe("normalizeCraftStageParams (both grammars fold into one wire)", () => {
  it("the canonical object passes (command as object, the wire's shape)", () => {
    const out = normalizeCraftStageParams({ agent_prompt: "p", command: { engine: "image-gen", params: { prompt: "x" } }, model: "p/m" }, W, CRAFT_MAX_ITERATIONS_HARD_CAP);
    assert.deepEqual(out.command, { engine: "image-gen", params: { prompt: "x" } });
    assert.equal(out.model, "p/m");
    assert.equal(out.maxIterations, undefined);
  });

  it("THE FORM FOLD: a JSON-string command (the textarea's face) folds to the same wire; the legacy inputs.command row folds too", () => {
    const a = normalizeCraftStageParams({ agent_prompt: "p", command: '{"engine":"agent","params":{}}' }, W, CRAFT_MAX_ITERATIONS_HARD_CAP);
    assert.deepEqual(a.command, { engine: "agent", params: {} });
    const b = normalizeCraftStageParams({ agent_prompt: "p", inputs: { command: { engine: "agent", params: {} } } }, W, CRAFT_MAX_ITERATIONS_HARD_CAP);
    assert.deepEqual(b.command, a.command, "legacy row and form fold agree");
  });

  it("malformed values refuse LOUD with the pinned messages (the wire's own words)", () => {
    assert.throws(() => normalizeCraftStageParams({}, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'agent_prompt' \(the brief\) is required/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p" }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'inputs' must be a JSON object carrying 'command'/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", inputs: {} }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /command must be a JSON object/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: "not json" }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /command must be a JSON object/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: { params: {} } }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'command' needs a non-empty 'engine' id/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: { engine: "e", params: 5 } }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'command' 'params' must be a JSON object/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: { engine: "e" }, model: "" }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'model' must be a non-empty route id/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: { engine: "e" }, max_iterations: 0 }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /'max_iterations' must be a positive integer/);
    assert.throws(() => normalizeCraftStageParams({ agent_prompt: "p", command: { engine: "e" }, max_iterations: 1001 }, W, CRAFT_MAX_ITERATIONS_HARD_CAP), /exceeds the hard cap 1000/);
  });
});

describe("normalizeCraftCommand (the shared row gate — the critic's refine verdict walks it too)", () => {
  it("folds strings, keeps the original non-row word", () => {
    assert.deepEqual(normalizeCraftCommand('{"engine":"e"}', "w"), { engine: "e", params: {} });
    assert.throws(() => normalizeCraftCommand("junk", "w"), /command must be a JSON object/);
    assert.throws(() => normalizeCraftCommand(undefined, "w"), /command must be a JSON object/);
  });
});

describe("craftFormDoc (the served form IS the contract)", () => {
  const doc = craftFormDoc();

  it("THE IDENTITY PIN: the doc's schema arm is the contract's own serialization", () => {
    assert.deepEqual(doc["schema"], craftParams.toJSON());
  });

  it("serves the engine face (no card, no family, no kinds — craft has no bags)", () => {
    assert.equal(doc["form"], "craft");
    assert.equal(doc["engine"], "craft");
    assert.deepEqual(doc["families"], []);
    assert.deepEqual((doc["features"] as { modifiers: unknown[] }).modifiers, []);
  });
});
