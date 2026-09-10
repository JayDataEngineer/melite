// walls — params-spec fidelity (row 12, 2026-09-10).
//
// The tool-DSL projection (emitParamsSpec) must be LOSSLESS
// against the served projection (emitParamsSchema) for everything
// the dsh-tools DSL has keys for: required sets identical, defaults
// native (never folded into description prose), enums scalar-equal
// (numbers stay numbers). Bounds/format/x-* stay served-form-only
// — the DSL has no keys for them (verified against the packed
// dsh-tools schema.d.ts), so their absence here is the documented
// counterpart limit, not drift.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/params-spec-fidelity.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import {
  emitParamsSchema,
  emitParamsSpec,
} from "../../../../packages/engines/comfyui-cordis/src/params-emit.ts";

describe("params-spec fidelity (row 12)", () => {
  it("required sets are identical in both projections, every card", async () => {
    const defs = await loadCardDefs();
    assert.ok(defs.size > 0, "card plane boots");
    for (const [id, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        def.schema;
      const boarded = (def as { boarded?: readonly string[] }).boarded ?? [];
      const schema = emitParamsSchema(
        carrier as Parameters<typeof emitParamsSchema>[0],
        boarded,
      );
      const spec = emitParamsSpec(
        carrier as Parameters<typeof emitParamsSpec>[0],
        boarded,
      );
      const schemaRequired = new Set(schema.required ?? []);
      const specRequired = new Set(
        Object.entries(spec)
          .filter(([, node]) => node.required === true)
          .map(([k]) => k),
      );
      assert.deepEqual(
        [...specRequired].sort(),
        [...schemaRequired].sort(),
        `${id}: spec required ≡ schema required`,
      );
    }
  });

  it("defaults ride natively — the emitter never folds prose, every card", async () => {
    const defs = await loadCardDefs();
    for (const [id, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        def.schema;
      const boarded = (def as { boarded?: readonly string[] }).boarded ?? [];
      const schema = emitParamsSchema(
        carrier as Parameters<typeof emitParamsSchema>[0],
        boarded,
      );
      const spec = emitParamsSpec(
        carrier as Parameters<typeof emitParamsSpec>[0],
        boarded,
      );
      for (const [k, node] of Object.entries(spec)) {
        const served = schema.properties[k] as
          | { default?: unknown }
          | undefined;
        assert.deepEqual(
          node.default ?? null,
          served?.default ?? null,
          `${id}.${k}: spec default ≡ served default`,
        );
      }
    }
    // The emitter fold is dead: a synthetic carrier with defaults
    // and prose-free descriptions yields native defaults and no
    // "(default:" text. (Authored "(default: …)" prose inside card
    // descriptions — e.g. clothing-placement — is documentation,
    // not emitter output, and out of this wall's scope.)
    const synthetic = {
      type: "object",
      dict: {
        mode: {
          type: "string",
          meta: { default: "fast", description: "Speed mode" },
        },
        steps: {
          type: "number",
          meta: { default: 20, min: 1, max: 100, description: "Steps" },
        },
      },
    };
    const out = emitParamsSpec(
      synthetic as Parameters<typeof emitParamsSpec>[0],
      ["only"],
    );
    assert.equal(out.mode.default, "fast");
    assert.equal(out.steps.default, 20);
    assert.ok(!out.mode.description?.includes("(default:"));
    assert.ok(!out.steps.description?.includes("(default:"));
    assert.ok(out.steps.description?.includes("min: 1"));
  });

  it("enums are scalar-equal — numbers stay numbers, every card", async () => {
    const defs = await loadCardDefs();
    for (const [id, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        def.schema;
      const boarded = (def as { boarded?: readonly string[] }).boarded ?? [];
      const schema = emitParamsSchema(
        carrier as Parameters<typeof emitParamsSchema>[0],
        boarded,
      );
      const spec = emitParamsSpec(
        carrier as Parameters<typeof emitParamsSpec>[0],
        boarded,
      );
      for (const [k, node] of Object.entries(spec)) {
        const served = schema.properties[k] as { enum?: unknown[] } | undefined;
        if (served?.enum !== undefined) {
          assert.deepEqual(
            node.enum,
            served.enum,
            `${id}.${k}: spec enum ≡ served enum`,
          );
        }
        if (
          (node.type === "number" || node.type === "integer") &&
          node.enum !== undefined
        ) {
          assert.ok(
            node.enum.every((e) => typeof e === "number"),
            `${id}.${k}: numeric node carries numeric enum`,
          );
        }
      }
    }
  });
});
