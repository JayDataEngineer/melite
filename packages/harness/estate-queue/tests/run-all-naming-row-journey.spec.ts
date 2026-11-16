// run-all-naming-row-journey.spec.ts — THE OPERATOR'S 30-SECOND PRESS
// (2026-11-16, rc.3 burn): the docs/params_schema TEACH the naming
// row `output_name` on every card declaring none of its own (ONE
// spelling ESTATE_NAMING_ROW), the agent spells it, and the press
// dies — two gates refused what a third seat taught:
//   1. card 'image-gen' got undeclared param(s): output_name
//      (card-kit gatedResolve — schema knobs + riders only)
//   2. field 'output_name' fires nothing on this lane
//      (the form face's lane-surface judge, spec.ts — the served
//      field list includes the taught row; the variant surface
//      does not)
// This wall drives BOTH real judges with the operator's stage shape
// — the taught row stated beside real knobs. Toggle either
// exemption out and the matching arm reds with the burn's own
// voice; that is this wall's firing proof (canon axis JOURNEY).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { gatedResolve, callableSchema } from "@melite/comfyui-card-kit/admission";
import { judgeLaneSurface } from "@melite/contracts/laneRelations";
import { laneViolations } from "@melite/card-base/spec";
import type { FormSpecDoc, SpecField } from "@melite/contracts/formSpec";
import { ESTATE_NAMING_ROW } from "@melite/contracts/formSpec";
import Schema from "@deepseek-ai/schemastery";

/** image-gen's real knob surface (the burn's own refusal named it):
 * prompt, negative_prompt, width, height, seed, steps, cfg, sampler,
 * scheduler — plus the taught naming row riding the served fields. */
const KNOBS = ["prompt", "negative_prompt", "width", "height", "seed", "steps", "cfg", "sampler", "scheduler"] as const;
const LANE_SURFACE: readonly string[] = [...KNOBS];
const SERVED_FIELDS: readonly string[] = [...KNOBS, ESTATE_NAMING_ROW.name];
const RIDERS = ["loras", "model"] as const;

/** The real schema walk shape: a schemastery object over the knobs
 * (the strict resolve's own carrier — same as the card's). */
const schema = Schema.object(Object.fromEntries(
  KNOBS.map((k) => [k, Schema.any()]),
)) as Schema;
const schemaFn = callableSchema(schema);

/** The operator's stage: real knobs stated beside the taught row. */
const STAGE: Record<string, unknown> = {
  prompt: "a cat",
  width: 1024,
  height: 1024,
  output_name: "hero-stem",
};

describe("THE RUN-ALL NAMING-ROW JOURNEY (rc.3 burn, operator 2026-11-16)", () => {
  it("GATE 1 — the card admission gate passes the taught row (gatedResolve)", () => {
    // the burn's voice, kept verbatim as the toggle-red reference:
    // toggle the ESTATE_NAMING_ROW exemption out of gatedResolve and
    // this arm throws ComposeRefusal 'unknown-param' naming
    // output_name — the operator's first error line.
    const doc = gatedResolve("image-gen", schemaFn, [...RIDERS], STAGE);
    assert.equal(doc["prompt"], "a cat", "the schema walk still resolves the real knobs");
  });

  it("GATE 2 — the form face's lane-surface judge never reads the taught row as a knob", () => {
    // THE REAL SEAT (no local copy — the no-cheat law): spec.ts's
    // laneViolations with the burn's own served shape (fields = real
    // knobs + the taught naming row; the variant's lane surface).
    // Toggle the ESTATE_NAMING_ROW filter out of spec.ts and this
    // arm reds with "field 'output_name' fires nothing on this lane"
    // — the operator's second error line.
    const fields: SpecField[] = [...KNOBS, ESTATE_NAMING_ROW.name].map((name) => ({ name } as SpecField));
    const spec = {
      lanes: { base: LANE_SURFACE },
    } as unknown as FormSpecDoc;
    const violations = laneViolations(spec, fields, STAGE);
    assert.deepEqual(violations, [], "the taught row must fire nothing at this judge — it is stage policy");
  });

  it("the judges still fire on REAL typos — the gates stay strict where the burn demands it", () => {
    // a genuine typo'd key (no seat teaches it) refuses at BOTH
    // judges — the exemptions did not blunt the strictness the
    // admission contract exists for.
    const typo = { ...STAGE, promptt: "a cat" };
    assert.throws(() => gatedResolve("image-gen", schemaFn, [...RIDERS], typo), /unknown-param|undeclared param/);
    const typoViolations = judgeLaneSurface(LANE_SURFACE, [...KNOBS, "promptt"], typo);
    assert.equal(typoViolations.length, 1, "the lane judge still refuses an off-surface knob");
  });
});
