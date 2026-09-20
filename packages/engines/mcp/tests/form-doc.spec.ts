// form-doc.spec.ts — THE MCP FORM DOC WALLS (the card-seam law,
// agent's params.spec precedent): the golden literal pins the
// served serialization; the identity pin holds the schema arm and
// the doc together (a change must land consciously in both). The
// PER-SERVER face is this lane's whole surface: the GENERIC picker
// card moved to the agent package (the subagent spawn —
// agentCardFormDoc; the operator's law 2026-09-21).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mcpFormDoc, mcpParams } from "../src/formDoc.ts";

/** Resolve a toJSON envelope into a plain tree (ref ids become
 *  their subtrees). The uid/ref-id counters are ALLOCATION state,
 *  not contract — the walls pin the resolved shape. */
const resolve = (env: { uid: number; refs: Record<string, unknown> }): unknown => {
  const walk = (node: unknown): unknown => {
    if (typeof node === "number") return walk((env.refs as Record<string, unknown>)[String(node)]);
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "dict") {
          out["dict"] = walk(v);
        } else {
          out[k] = walk(v);
        }
      }
      return out;
    }
    return node;
  };
  return walk(env.uid);
};

const TOOLS = [
  { value: "scene_info", label: "scene_info", tooltip: "Scene contents" },
  { value: "render", label: "render", tooltip: "Render the viewport" },
];

describe("mcpParams (the declared contract)", () => {
  it("serializes the golden literal (anti-drift: the form IS the wire gate)", () => {
    const env = mcpParams(TOOLS).toJSON() as { uid: number; refs: Record<string, { type: string; dict?: Record<string, number>; meta?: Record<string, unknown> }> };
    // the dict lives on the object-typed ref, not the envelope head
    const root = env.refs[String(env.uid)]!;
    const dict = root.dict as Record<string, number>;
    assert.deepEqual(Object.keys(dict).sort(), ["args", "tool"]);
    const tool = env.refs[String(dict["tool"])] as Record<string, Record<string, unknown>>;
    assert.equal(tool["type"], "string");
    const toolMeta = tool["meta"] as Record<string, Record<string, unknown>>;
    const toolExtra = toolMeta["extra"] as Record<string, unknown>;
    assert.deepEqual(toolExtra["options"], [
      { value: "scene_info", label: "scene_info" },
      { value: "render", label: "render" },
    ]);
    assert.equal(toolMeta["description"], "Tool");
    const args = env.refs[String(dict["args"])] as Record<string, Record<string, unknown>>;
    assert.equal(args["type"], "string");
    const argsMeta = args["meta"] as Record<string, Record<string, unknown>>;
    assert.equal(argsMeta["description"], "Arguments");
    const argsExtra = argsMeta["extra"] as Record<string, unknown>;
    assert.equal(argsExtra["wtype"], "textarea");
  });

  it("the same instance serializes deterministically; two instances resolve to the SAME tree", () => {
    const once = mcpParams(TOOLS);
    assert.equal(JSON.stringify(once.toJSON()), JSON.stringify(once.toJSON()));
    assert.deepEqual(resolve(mcpParams(TOOLS).toJSON() as never), resolve(once.toJSON() as never));
  });

  it("an EMPTY census serves empty options and the honest tooltip", () => {
    const env = mcpParams([]).toJSON() as { uid: number; refs: Record<string, { dict?: Record<string, number> }> };
    const dict = env.refs[String(env.uid)]!.dict as Record<string, number>;
    const tool = env.refs[String(dict["tool"])] as Record<string, Record<string, unknown>>;
    const extra = (tool["meta"] as Record<string, Record<string, unknown>>)["extra"] as Record<string, unknown>;
    assert.deepEqual(extra["options"], []);
    assert.match(String(extra["tooltip"]), /exposes no tools/);
  });
});

describe("mcpFormDoc (the served doc)", () => {
  it("carries the instance identity and the families rail", () => {
    const doc = mcpFormDoc({ server: "blender", tools: TOOLS, servers: ["blender", "unity"] });
    assert.equal(doc["form"], "mcp:blender");
    assert.equal(doc["engine"], "mcp:blender");
    assert.equal(doc["model"], "mcp:blender");
    assert.equal(doc["service"], "mcp:blender");
    assert.equal(doc["genre"], "3d");
    assert.equal(doc["label"], "MCP · blender");
    assert.deepEqual(doc["families"], [
      { id: "mcp:blender", present: true },
      { id: "mcp:unity", present: true },
    ]);
    assert.deepEqual(doc["outputs"], { default: "text" });
    assert.match(String(doc["description"]), /official protocol/);
  });

  it("IDENTITY PIN: the doc's schema IS the params contract's own serialization", () => {
    const doc = mcpFormDoc({ server: "blender", tools: TOOLS, servers: ["blender"] });
    assert.deepEqual(
      resolve(doc["schema"] as never),
      resolve(mcpParams(TOOLS).toJSON() as never),
    );
  });
});
