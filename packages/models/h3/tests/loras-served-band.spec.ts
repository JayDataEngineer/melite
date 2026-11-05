// @melite/models-h3 — THE SERVED-BAND / DOOR-DOMAIN WALL (GAPS-4/F18
// residual, ALL-MELITE §6's proposed wall). The widget serves the
// loras `steps` dial with NO blanket default and NO blanket floor
// (max 50 is the widget ceiling) while the compose door
// (service.ts `lora-steps-range`, engine-walled by service-plane.spec)
// refuses any stated count outside the named row's declared
// [steps_min, steps_max] — an omitted steps rides the row's own
// count, lawful on every row by construction (the SERVED-FIX, landed
// by the video/skill lane as followup to the 2026-11-01 h3-residual
// cure: card.ts:138 dropped the 0 default and the 0 floor the door
// refused on every row).
//
// The door's clamp/validate is the truth this wall mirrors — every
// expectation below derives from the REAL served def (boot +
// loadCardDefs, the value-roundtrip precedent) and the REAL served
// rows (H3_LORA_ROWS), never a frozen band. No @contract marker:
// package-local law, prose header — the registry row it will join
// (the served-fix row the card owner lands with card.ts:138)
// does not exist yet; the flip below carries the proof until it does.
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { H3_LORA_ROWS } from "@melite/models-h3/mods/loras";

type FieldRow = {
  name: string; type?: string; default: unknown;
  min?: number; max?: number;
};
type Kind = Record<string, unknown> & { param_key?: string; fields?: FieldRow[] };

const servedSteps = async (): Promise<{ min: number | undefined; max: number; def: unknown }> => {
  const def = (await loadCardDefs()).get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const kinds = ((def as unknown as { mods?: Kind[] }).mods ?? []).filter(
    (k) => typeof k.param_key === "string",
  );
  const loras = kinds.find((k) => k.param_key === "loras");
  assert.ok(loras, "the served card carries the loras mod kind");
  const steps = (loras.fields ?? []).find((f) => f.name === "steps");
  assert.ok(steps, "the served loras kind carries the steps dial");
  assert.equal(typeof steps.max, "number", "the served steps dial states its ceiling");
  return {
    min: typeof steps.min === "number" ? (steps.min as number) : undefined,
    max: steps.max as number,
    def: steps.default,
  };
};

type Domain = { id: string; lo?: number; hi?: number };
const rowDomains = (): Domain[] =>
  [...H3_LORA_ROWS].map((r) => ({
    id: r.id,
    ...(("steps_min" in r) ? { lo: r.steps_min } : {}),
    ...(("steps_max" in r) ? { hi: r.steps_max } : {}),
  }));

describe("the loras served band against the door's row domains (GAPS-4/F18)", () => {
  it("ARM 1 — the served ceiling covers every declared row domain; the floor is row-owned (no blanket floor)", async () => {
    // SERVED-FIX: card.ts:138 dropped the blanket 0 floor alongside
    // the 0 default — the row domain owns the floor, so no served
    // floor may strand (or fake-cover) a row. The widget ceiling
    // still must cover every row ceiling, or a lawful count falls
    // off the widget.
    const served = await servedSteps();
    assert.equal(served.min, undefined,
      "no blanket floor is served — the row's declared domain owns the floor");
    const constrained = rowDomains().filter((d) => d.lo !== undefined || d.hi !== undefined);
    assert.ok(constrained.length > 0, "the catalog declares at least one bounded row — a vacuous cover reds");
    for (const d of constrained) {
      if (d.hi !== undefined) {
        assert.ok(served.max >= d.hi,
          `served ceiling ${served.max} strands row '${d.id}' (domain ceiling ${d.hi}) off the widget`);
      }
    }
  });

  it("ARM 2 — THE AGREEMENT LAW: the served default is absent, so an omitted steps rides the row's own count on every row", async () => {
    // SERVED-FIX (the tripwire's owed flip, landed): card.ts:138
    // dropped the 0 default — omit rides the row, the door's lawful
    // default. The old trap arm (served 0, refused outside every row
    // domain) is retired by this agreement arm: absent default +
    // every row's own count inside its own domain = omit is lawful
    // everywhere. A red here means the served face re-printed a
    // blanket default, or a row's own count left its domain — read
    // which before touching anything.
    const served = await servedSteps();
    assert.equal(served.def, undefined,
      "the served steps default is absent — omit rides the row");
    assert.ok(H3_LORA_ROWS.length > 0, "the catalog declares rows to agree with");
    for (const row of H3_LORA_ROWS) {
      if (row.steps_min !== undefined) {
        assert.ok(row.steps >= row.steps_min,
          `row '${row.id}' own count ${row.steps} fell BELOW its domain floor ${row.steps_min} — omit would refuse`);
      }
      if (row.steps_max !== undefined) {
        assert.ok(row.steps <= row.steps_max,
          `row '${row.id}' own count ${row.steps} fell ABOVE its domain ceiling ${row.steps_max} — omit would refuse`);
      }
    }
  });
});
