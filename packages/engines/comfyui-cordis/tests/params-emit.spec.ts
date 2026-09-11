// @melite/comfyui-cordis — the knob projector's union + overlay
// arms (TEST-2 breadth, 2026-09-12). emitKnob reads only the
// schema SHAPE (type/list/meta/extra) — hand-built shapes drive
// every arm; no card import needed (the walls pin real cards).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { emitKnob, emitParamsSchema, emitParamsSpec } from "../src/params-emit.ts";
import type { Schema } from "@deepseek-ai/schemastery";

const shape = (s: Record<string, unknown>): Schema => s as unknown as Schema;
const c = (v: unknown): Record<string, unknown> => ({ type: "const", value: v });

describe("emitKnob (the union resolution)", () => {
  it("an all-null union serves the null type", () => {
    assert.deepEqual(emitKnob(shape({ type: "union", list: [c(null), c(null)] })), { type: "null" });
  });

  it("a nullable number serves the inner type (floors merge, inner wins)", () => {
    const out = emitKnob(shape({
      type: "union",
      list: [{ type: "number", meta: { min: 1, max: 5 } }, c(null)],
      meta: { description: "outer desc", default: 3 },
    }));
    assert.equal(out.type, "number");
    assert.equal(out.description, "outer desc", "the DEFAULT/description ride the OUTER union");
    assert.equal(out.default, 3);
    assert.equal(out.minimum, 1, "floors ride the inner branch");
    assert.equal(out.maximum, 5);
  });

  it("a const-only union serves a string enum", () => {
    const out = emitKnob(shape({ type: "union", list: [c("a"), c("b"), c("c")] }));
    assert.equal(out.type, "string");
    assert.deepEqual(out.enum, ["a", "b", "c"]);
  });

  it("a boolean union serves the stringified pair", () => {
    // a NULLABLE boolean rides the nullable arm (inner wins); the
    // stringified pair is the multi-branch boolean arm
    const out = emitKnob(shape({
      type: "union",
      list: [{ type: "boolean" }, { type: "string" }],
      meta: { default: true },
    }));
    assert.equal(out.type, "string");
    assert.deepEqual(out.enum, ["true", "false"]);
    assert.equal(out.default, "true", "boolean defaults stringify on the wire");
  });

  it("a number|string Select serves stringified (default + options)", () => {
    const out = emitKnob(shape({
      type: "union",
      list: [{ type: "number" }, { type: "string" }],
      meta: { default: 512, extra: { options: [256, 512, 1024] } },
    }));
    assert.equal(out.type, "string");
    assert.deepEqual(out.enum, ["256", "512", "1024"], "options stringify");
    assert.equal(out.default, "512", "numeric defaults stringify on the wire");
  });

  it("extra.options coerces ANY atom to the Select class", () => {
    const out = emitKnob(shape({ type: "number", meta: { default: 2, extra: { options: [1, 2] } } }));
    assert.equal(out.type, "string");
    assert.deepEqual(out.enum, ["1", "2"]);
  });
});

describe("emitKnob (the atom + overlay arms)", () => {
  it("step-1 numbers serve integer; any serves string", () => {
    assert.equal(emitKnob(shape({ type: "number", meta: { step: 1 } })).type, "integer");
    assert.equal(emitKnob(shape({ type: "number", meta: {} })).type, "number");
    assert.equal(emitKnob(shape({ type: "any", meta: {} })).type, "string");
  });

  it("the path role serves the path format", () => {
    assert.equal(emitKnob(shape({ type: "string", meta: { role: "path" } })).format, "path");
    assert.equal(emitKnob(shape({ type: "string", meta: {} })).format, undefined);
  });

  it("an explicit empty-array default serves ONLY with serveDefault", () => {
    const bare = emitKnob(shape({ type: "array", meta: { default: [] } }));
    assert.equal("default" in bare, false, "schemastery's auto-default [] never serves");
    const served = emitKnob(shape({ type: "array", meta: { default: [], extra: { serveDefault: true } } }));
    assert.deepEqual(served.default, []);
  });

  it("hint-only floors fill when the validating meta lacks them", () => {
    const out = emitKnob(shape({ type: "number", meta: { extra: { min: 0, max: 9 } } }));
    assert.equal(out.minimum, 0);
    assert.equal(out.maximum, 9);
  });

  it("the display overlays ride (description, visible-when, families)", () => {
    const out = emitKnob(shape({
      type: "string",
      meta: { description: "the prompt", extra: { visibleWhen: { mode: "x" }, families: ["f"] } },
    }));
    assert.equal(out.description, "the prompt");
    assert.deepEqual(out["x-visible-when"], { mode: "x" });
    assert.deepEqual(out["x-families"], ["f"]);
  });

  it("a bare knob serves its type alone", () => {
    assert.deepEqual(emitKnob(shape({ type: "string" })), { type: "string" });
  });
});

describe("emitKnob (the meta-less nullable arm)", () => {
  it("a nullable branch WITHOUT meta merges the outer only", () => {
    const out = emitKnob(shape({
      type: "union",
      list: [{ type: "number" }, c(null)],
      meta: { default: 4 },
    }));
    assert.equal(out.type, "number");
    assert.equal(out.default, 4);
  });
});

describe("emitParamsSchema (the served projection)", () => {
  const carrier = (dict?: Record<string, unknown>): Schema =>
    (dict === undefined ? {} : { dict }) as unknown as Schema;
  const knob = (extra?: Record<string, unknown>): Record<string, unknown> =>
    ({ type: "string", meta: { ...(extra === undefined ? {} : { extra }) } });

  it("a dict-less carrier serves an empty object (the ?? {} arm)", () => {
    assert.deepEqual(emitParamsSchema(carrier(), []), { type: "object", properties: {} });
  });

  it("a single-family board serves no model knob; required rides", () => {
    const out = emitParamsSchema(
      carrier({ prompt: knob({ required: true }), steps: knob() }),
      ["krea-2"],
    );
    assert.equal("model" in out.properties, false, "unambiguous boards need no picker");
    assert.deepEqual(out.required, ["prompt"]);
    assert.equal(out.properties["prompt"]!.type, "string");
  });

  it("a multi-family board synthesizes the model picker", () => {
    const out = emitParamsSchema(carrier({ prompt: knob() }), ["a", "b"]);
    assert.deepEqual(out.properties["model"], {
      type: "string",
      enum: ["a", "b"],
      default: "a",
      description: "The boarded family to run — the request's top-level `model`. Options: a, b.",
    });
    assert.equal(out.required, undefined, "nothing required, no key");
  });
});

describe("emitParamsSpec (the DSL projection)", () => {
  const carrier = (dict: Record<string, unknown>): Schema => ({ dict }) as unknown as Schema;

  it("unknown atoms project as json; bounds fold into the description", () => {
    const spec = emitParamsSpec(carrier({
      blob: shape({ type: "object", meta: {} }),
      steps: shape({ type: "number", meta: { description: "steps", default: 20, min: 1, max: 30 } }),
      bare: shape({ type: "number", meta: { min: 0, max: 9 } }),
      pick: shape({ type: "union", list: [c(1), c(2)] }),
    }), ["krea-2"]);
    assert.equal(spec["blob"]!.type, "json");
    assert.equal(spec["steps"]!.description, "steps (min: 1, max: 30)");
    assert.equal(spec["steps"]!.default, 20);
    assert.equal(spec["bare"]!.description, "(min: 0, max: 9)", "bounds alone serve trimmed");
    assert.deepEqual(spec["pick"]!.enum, [1, 2], "numeric enums ride natively");
  });

  it("string enums stringify; the model picker projects too", () => {
    const spec = emitParamsSpec(carrier({
      mode: shape({ type: "union", list: [c("x"), c("y")] }),
    }), ["a", "b"]);
    assert.deepEqual(spec["mode"]!.enum, ["x", "y"]);
    assert.equal(spec["model"]!.type, "string");
    assert.deepEqual(spec["model"]!.enum, ["a", "b"]);
  });

  it("a knob with no description and no bounds serves no description", () => {
    const spec = emitParamsSpec(
      carrier({ steps: shape({ type: "number", meta: {} }) }),
      ["krea-2"],
    );
    assert.equal(spec["steps"]!.description, undefined);
  });
});
