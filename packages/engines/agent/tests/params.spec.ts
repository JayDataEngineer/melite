import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { agentParams, agentCardParams, agentModKinds, normalizeAgentStageParams, MCP_ENTRY_FIELD, SKILL_ENTRY_FIELD, type CensusRow } from "../src/params.ts";
import { agentFormDoc, agentCardFormDoc } from "../src/formDoc.ts";

const CAP = 1000;

describe("the agent params contract (stroke 66 — anti-drift)", () => {
  it("THE GOLDEN WALL: the contract's serialization is pinned (a change lands consciously in both the form and the gate)", () => {
    const json = JSON.stringify(agentParams.toJSON());
    // the envelope's ROOT object node (schemastery's toJSON: the
    // dict lives on the object-typed ref, not the envelope head).
    const env = JSON.parse(json) as { uid: number; refs: Record<string, { type: string; dict?: Record<string, { type: string }> }> };
    const root = env.refs[String(env.uid)]!;
    const dict = root.dict as Record<string, number>;
    assert.deepEqual(Object.keys(dict).sort(), ["inputs", "max_turns", "mcps", "model", "skills", "task"]);
    // THE WIRE TYPES (the ref-resolution read — dict values are ref ids):
    assert.equal(env.refs[String(dict["task"])]!.type, "string");
    assert.equal(env.refs[String(dict["max_turns"])]!.type, "number");
    assert.equal(env.refs[String(dict["mcps"])]!.type, "array");
    assert.equal(json, JSON.stringify(agentParams.toJSON()), "serialization is deterministic");
  });

  it("the mod kinds' entry fields are the SHARED constants (the form's grammar cannot drift from the wire's)", () => {
    const census = { mcps: [{ value: "blender", label: "Blender" }], skills: [{ value: "card:mask-form", label: "Mask Form" }] };
    const kinds = agentModKinds(census);
    assert.deepEqual(kinds.map((k) => k["param_key"]), ["mcps", "skills", "inputs"]);
    const mcps = kinds[0]!;
    assert.equal((mcps["fields"] as Array<{ name: string }>)[0]!.name, MCP_ENTRY_FIELD);
    assert.deepEqual((mcps["fields"] as Array<{ options: unknown }>)[0]!.options, [{ value: "blender", label: "Blender" }]);
    const skills = kinds[1]!;
    assert.equal((skills["fields"] as Array<{ name: string }>)[0]!.name, SKILL_ENTRY_FIELD);
    const inputs = kinds[2]!;
    assert.deepEqual((inputs["fields"] as Array<{ name: string }>).map((f) => f.name), ["name", "value"]);
  });

  it("THE CARD FACE's law: agentCardParams is the contract MINUS the model field (a card field named 'model' is the estate's model key — never a brain route)", () => {
    const env = agentCardParams.toJSON() as unknown as { uid: number; refs: Record<string, { type: string; dict?: Record<string, number> }> };
    const root = env.refs[String(env.uid)]!;
    const dict = root.dict!;
    // the full contract minus 'model' — the same shared field
    // declarations, ONE difference by law (the boot route serves)
    assert.deepEqual(Object.keys(dict).sort(), ["inputs", "max_turns", "mcps", "skills", "task"]);
    assert.equal(env.refs[String(dict["task"])]!.type, "string");
    assert.equal(env.refs[String(dict["max_turns"])]!.type, "number");
    assert.equal(env.refs[String(dict["mcps"])]!.type, "array");
  });

  it("THE GENERIC INPUT SQUARE: the inputs kind's value field is file-typed (the construction law builds THE ONE square — upload/drop/upstream pick)", () => {
    const kinds = agentModKinds({ mcps: [], skills: [] });
    const inputs = kinds[2]!;
    const value = (inputs["fields"] as Array<{ name: string; type: string }>)[1]!;
    assert.equal(value.name, "value");
    assert.equal(value.type, "file");
  });

  it("an empty census serves empty options with an empty default (never a fabricated row)", () => {
    const kinds = agentModKinds({ mcps: [], skills: [] });
    const f = (kinds[0]!["fields"] as Array<{ options: unknown[]; default: string }>)[0]!;
    assert.deepEqual(f.options, []);
    assert.equal(f.default, "");
  });
});

describe("normalizeAgentStageParams (both grammars fold into one wire)", () => {
  it("canonical strings pass verbatim", () => {
    const out = normalizeAgentStageParams({ task: "t", mcps: ["blender"], skills: ["card:mask-form"] }, "s", CAP);
    assert.deepEqual(out.mcps, ["blender"]);
    assert.deepEqual(out.skills, ["card:mask-form"]);
    assert.deepEqual(out.inputs, []);
  });

  it("form bag entries fold ({server}/{skill} rows off the mod form)", () => {
    const out = normalizeAgentStageParams({
      task: "t",
      mcps: [{ [MCP_ENTRY_FIELD]: "blender" }, "unity"],
      skills: [{ [SKILL_ENTRY_FIELD]: "card:mask-form" }],
      inputs: [{ name: "n", value: 7 }],
    }, "s", CAP);
    assert.deepEqual(out.mcps, ["blender", "unity"]);
    assert.deepEqual(out.skills, ["card:mask-form"]);
    assert.deepEqual(out.inputs, [{ name: "n", value: 7 }]);
  });

  it("malformed values refuse LOUD with the pinned messages", () => {
    assert.throws(() => normalizeAgentStageParams({}, "s", CAP), /'task' \(the brief\) is required/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", mcps: "blender" }, "s", CAP), /'mcps' must be an array of strings/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", mcps: [""] }, "s", CAP), /'mcps' entries must be non-empty strings/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", mcps: [{ nope: "x" }] }, "s", CAP), /'mcps' entries must be non-empty strings \(or \{server: string\} rows off the mod form\)/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", skills: [{ server: "x" }] }, "s", CAP), /'skills' entries must be non-empty strings \(or \{skill: string\} rows off the mod form\)/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", inputs: "x" }, "s", CAP), /'inputs' must be an array of \{name, value\} entries/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", inputs: [{ name: "" }] }, "s", CAP), /'inputs' entries must be objects/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", max_turns: 0 }, "s", CAP), /'max_turns' must be a positive integer/);
    assert.throws(() => normalizeAgentStageParams({ task: "t", max_turns: 1001 }, "s", CAP), /exceeds the hard cap 1000/);
  });

  it("null bags fold to empty (an absent allow-list is a pure text agent)", () => {
    const out = normalizeAgentStageParams({ task: "t", mcps: null, skills: null, inputs: null }, "s", CAP);
    assert.deepEqual(out.mcps, []);
    assert.deepEqual(out.skills, []);
    assert.deepEqual(out.inputs, []);
  });
});

describe("agentFormDoc (the served form IS the contract)", () => {
  const census = { mcps: [{ value: "blender", label: "Blender" }], skills: [] as CensusRow[] };
  const doc = agentFormDoc(census);

  it("THE IDENTITY PIN: the doc's schema arm is the contract's own serialization (never a re-hand-rolled field list)", () => {
    assert.deepEqual(doc["schema"], agentParams.toJSON());
  });

  it("serves the engine face (no card, no family, no variants) with the modifiers on the one channel", () => {
    assert.equal(doc["form"], "agent");
    assert.equal(doc["engine"], "agent");
    assert.deepEqual(doc["families"], []);
    assert.deepEqual(doc["variants"], []);
    const kinds = (doc["features"] as { modifiers: Array<Record<string, unknown>> }).modifiers;
    assert.deepEqual(kinds.map((k) => k["param_key"]), ["mcps", "skills", "inputs"]);
    // every mod-owned param_key is a schema dict key (the wire owns the bags)
    const env = agentParams.toJSON() as unknown as { uid: number; refs: Record<string, { type: string; dict?: Record<string, unknown> }> };
    const dict = env.refs[String(env.uid)]!.dict!;
    for (const k of kinds) assert.ok(dict[k["param_key"] as string] !== undefined);
  });
});

describe("agentCardFormDoc (the generic MCP card's face — the subagent spawn)", () => {
  const census = { mcps: [{ value: "blender", label: "blender" }, { value: "unity", label: "unity" }], skills: [] as CensusRow[] };
  const doc = agentCardFormDoc(census);

  it("THE IDENTITY PIN: the card's schema arm is the CARD FACE contract's own serialization", () => {
    assert.deepEqual(doc["schema"], agentCardParams.toJSON());
  });

  it("serves the card face: form 'mcp', engine 'agent' (the spawn), no families, no rail — the servers are the MCPs tiles' own census", () => {
    assert.equal(doc["form"], "mcp");
    assert.equal(doc["engine"], "agent");
    assert.equal(doc["service"], "mcp");
    assert.deepEqual(doc["families"], []);
    assert.deepEqual(doc["variants"], []);
    const kinds = (doc["features"] as { modifiers: Array<Record<string, unknown>> }).modifiers;
    const mcps = kinds[0]!;
    const f = (mcps["fields"] as Array<{ options: Array<{ value: string }> }>)[0]!;
    assert.deepEqual(f.options.map((o) => o.value), ["blender", "unity"]);
  });

  it("the enhance prompt seat binds the Task (the brief IS the prompt spot)", () => {
    const ep = doc["enhance_prompts"] as { prompt: string | null };
    assert.equal(ep.prompt, "task");
  });
});
