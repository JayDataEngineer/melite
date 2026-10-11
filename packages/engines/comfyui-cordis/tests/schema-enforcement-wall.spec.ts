// @melite/comfyui-cordis — THE SCHEMA-ENFORCEMENT WALL (2026-09-19,
// the operator's order: "THERE IS ZERO POINT OF ANY SCHEMA IF THE
// SCHEMA DOES NOT WALK AND ENFORCE"). Every registered card, every
// DECLARED field, probed at the compose door — the real hop, never
// the serializer in isolation:
//
//   - every bounded number refuses its bounds' far side (min-1, max+1)
//   - every declared number refuses a string
//   - every declared string refuses a number
//   - every declared boolean refuses a string
//
// The probe doc is a single-key body: the schemastery walk validates
// the offending field FIRST (types/bounds/defaults are the walk's own
// law), so the refusal names the field — a card whose compose skips
// or post-dates the walk fails HERE, not in production. New cards and
// newly declared fields join the wall for free (the envelope is the
// SSOT — refs[uid].dict carries every declared name).
//
// Exempt-by-nature rows are named inline (none today): a field whose
// declaration intentionally admits any JSON would be listed HERE with
// its reason, never silently skipped.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "../src/cardDefs.ts";
import type { CardDefinition } from "../src/service.ts";

type Ref = { type?: string, meta?: Record<string, unknown> };
type Envelope = { uid?: number, refs?: Record<string, Ref> };

/** The declared fields of a card's carrier (schemaCarrier ?? schema,
 * the formSchemas seam verbatim): name → { type, min, max }. */
const declaredFields = (def: CardDefinition): Map<string, { type: string, min?: number, max?: number }> => {
  const carrier = (def.schemaCarrier ?? def.schema) as { toJSON?: () => unknown }
  const env = (typeof carrier.toJSON === "function" ? carrier.toJSON() : null) as Envelope | null
  const out = new Map<string, { type: string, min?: number, max: number | undefined }>()
  if (env?.refs === undefined || env.uid === undefined) return out
  const dict = (env.refs[String(env.uid)] as { dict?: Record<string, number> } | undefined)?.dict
  if (dict === undefined) return out
  for (const [name, refId] of Object.entries(dict)) {
    const node = env.refs[String(refId)]
    if (node?.type === undefined) continue
    const meta = node.meta ?? {}
    out.set(name, {
      type: node.type,
      min: typeof meta["min"] === "number" ? meta["min"] : undefined,
      max: typeof meta["max"] === "number" ? meta["max"] : undefined,
    })
  }
  return out
}

/** The bad values a field must refuse at the compose door. */
const probesFor = (f: { type: string, min?: number, max?: number }): Array<{ bad: unknown, why: string }> => {
  const probes: Array<{ bad: unknown, why: string }> = []
  if (f.type === "number") {
    if (f.min !== undefined) probes.push({ bad: f.min - 1, why: "below the declared min" })
    if (f.max !== undefined) probes.push({ bad: f.max + 1, why: "above the declared max" })
    probes.push({ bad: "not-a-number", why: "a string on a declared number" })
  } else if (f.type === "string") {
    probes.push({ bad: 12345, why: "a number on a declared string" })
  } else if (f.type === "boolean") {
    probes.push({ bad: "not-a-bool", why: "a string on a declared boolean" })
  }
  return probes
}

const defs: Map<string, CardDefinition> = await loadCardDefs();
assert.ok(defs.size >= 14, `the registry serves every card (got ${defs.size})`); // 14: voice-lock died 2026-09-21 (design moved into the tts card's mods), quad-remesh left with the autoremesher excision (458c4001)

describe("THE SCHEMA-ENFORCEMENT WALL (every card, every declared field, at the compose door)", () => {
  for (const [id, def] of [...defs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const fields = declaredFields(def);
    if (fields.size === 0) continue;
    describe(`the ${id} card walks and enforces`, () => {
      for (const [name, f] of [...fields.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        for (const { bad, why } of probesFor(f)) {
          it(`${name} refuses ${why} (${JSON.stringify(String(bad))}) — loud, never a silent ride`, () => {
            assert.throws(
              () => def.compose({ [name]: bad } as Record<string, unknown>, undefined as never, new GraphBuilder(), "wall_probe"),
              new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
              `${id}.compose accepted ${name} = ${JSON.stringify(bad)} — the schema did not enforce`,
            );
          });
        }
      }
    });
  }

  it("the wall itself is alive (the registry's probes are non-empty)", () => {
    const total = [...defs.values()].reduce((n, d) => n + probesOf(d), 0);
    assert.ok(total > 100, `the wall probed ${total} field/value pairs — a dead wall is worse than none`);
  });
});

function probesOf(d: CardDefinition): number {
  let n = 0;
  for (const f of declaredFields(d).values()) n += probesFor(f).length;
  return n;
}
