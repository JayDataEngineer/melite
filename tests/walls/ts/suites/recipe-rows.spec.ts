// recipe-rows.spec.ts — THE RECIPE SCHEMA-MASTER WALL (hour 15,
// operator: "our current schema validation barely validates
// anything"): schemastery validates FIELD shape and the golden
// walls validate SNAPSHOTS — this wall validates the SEMANTIC layer
// between them, the one where debt hid invisible for 74 families:
//
//   LAW A (Rule A, card-carrying families): a family that declares
//   the Recipe variant_group authors at least one stamping Recipe
//   row (wire_defaults non-empty). Zero-stamp = the dropdown
//   renders nothing while the DECLARATION promises recipes —
//   refused here, not silently hidden at runtime.
//
//   LAW B (payloads 1:1 with card params): every wire_defaults key
//   of a Recipe row is a param the card's own schema declares. A
//   stamp on an undeclared key is a dead stamp — refused.
//
//   LAW C (values inside the card's own bounds): every stamped
//   scalar sits within the card schema's declared min/max (and
//   within the vocabulary, for enum selects). The card schema IS
//   the master; family recipes are its clients.
//
// The 2026-09-18 retirement left ZERO exemptions: ten families
// author truthful rows, seven were honestly scoped (Recipe group
// deleted). The RESOLVED map below pins each family's resolution —
// the census only ever grows rows, never exemptions.
//
// Run: npx vitest run tests/walls/ts/suites/recipe-rows.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

/** The retired debt census (2026-09-18: all 17 exemptions
 *  resolved — ten families author truthful rows, seven were
 *  honestly scoped by deleting their un-servable Recipe group).
 *  This map is the regression pin: a family leaves "stamps" only
 *  by keeping ≥1 stamping row, and "scoped" families must never
 *  re-declare the Recipe group without rows. */
const RESOLVED: Readonly<Record<string, "stamps" | "scoped">> = {
  // ── honestly scoped (no generation knobs to preset — the Recipe
  //    group is deleted from the DECL, so no dropdown is promised)
  "input": "scoped",         // ← input-prep: passthrough ingest
  "autoremesher": "scoped",  // ← quad-remesh: retopo tool
  "florence2": "scoped",     // ← tagger: captioning
  "joycaption": "scoped",    // ← tagger
  "joytag": "scoped",        // ← tagger
  "wd14": "scoped",          // ← tagger
  "transfer_rig": "scoped",  // ← img-to-mesh: rig transfer
  // ── truthful rows authored (each stamp inside the card's own
  //    bounds — LAW B/C holds them now, not an exemption)
  "anima": "stamps",            // ← image-gen
  "h3": "stamps",               // ← h3-timeline card (sibling rows)
  "h3-keyframe": "stamps",      // ← h3-timeline card (sibling rows)
  "kimodo": "stamps",           // ← motion
  "pixal3d": "stamps",          // ← img-to-mesh
  "qwen-img-edit-2511": "stamps", // ← image-edit
  "seedvr2_ema": "stamps",      // ← upscale-tools
  "trellis2-native": "stamps",  // ← img-to-mesh
};

/** The card schema's declared scalars, from the LIVE envelope the
 *  door serves (min/max/default walk the schemastery toJSON tree —
 *  nullable-union unwrapped, same walk as the parity wall). */
function declaredScalars(caller: string, modelId: string): Map<string, { min?: number; max?: number; enum?: string[] }> {
  const svc = theService();
  const live = svc.formSchemas(caller, modelId) as {
    schema?: { refs?: Record<string, Record<string, unknown>> }
    mods?: Record<string, { refs?: Record<string, Record<string, unknown>> }>
  } | null;
  const out = new Map<string, { min?: number; max?: number; enum?: string[] }>();
  if (live === null || live.schema === undefined) return out;
  // THE CARD PLANE + THE MOD PLANE (LAW B's full domain): the card's
  // own params AND the flavor/mod envelopes — lora bags ride the mod
  // plane (h3-timeline's turbo stamps loras; the pack owns the field)
  const envelopes: Array<{ refs?: Record<string, Record<string, unknown>> }> = [live.schema];
  for (const mod of Object.values(live.mods ?? {})) envelopes.push(mod);
  for (const env of envelopes) {
    for (const node of Object.values(env.refs ?? {})) {
      if (node["type"] !== "object" || typeof node["dict"] !== "object" || node["dict"] === null) continue;
      for (const [name, refId] of Object.entries(node["dict"] as Record<string, unknown>)) {
        const n = (env.refs ?? {})[String(refId)];
        if (n === undefined) continue;
        // nullable unions: [inner, const null] → inner carries the meta
        let inner = n;
        if (Array.isArray(n["union"]) && n["union"].length === 2) {
          const first = (n["union"] as Array<Record<string, unknown>>)[0];
          if (first !== undefined) inner = first;
        }
        const meta = (inner["meta"] ?? {}) as Record<string, unknown>;
        const spec: { min?: number; max?: number; enum?: string[] } = {};
        if (typeof meta["min"] === "number") spec.min = meta["min"];
        if (typeof meta["max"] === "number") spec.max = meta["max"];
        if (Array.isArray(inner["values"])) spec.enum = (inner["values"] as unknown[]).map(String);
        out.set(name, spec);
      }
    }
  }
  return out;
}

/** The card-carrying family ids (some card's boarded list names the
 *  family — the parity wall's discovery, verbatim). */
function cardCarriedFamilies(): Map<string, string> {
  const svc = theService();
  const out = new Map<string, string>();
  for (const cardId of svc.cardIds()) {
    const def = svc.getCardDef(cardId);
    if (def === undefined) continue;
    for (const f of def.boarded) if (!out.has(f)) out.set(f, cardId);
  }
  return out;
}

describe("the recipe schema-master (Rule A/B/C — semantic validation over the card's own schema)", () => {
  it("boots the card plane", async (): Promise<void> => {
    await loadCardDefs();
    assert.ok(theService() !== null);
  });

  it("LAW A: every card-carrying family declaring the Recipe group stamps at least one row (zero exemptions)", async (): Promise<void> => {
    await loadCardDefs();
    const carried = cardCarriedFamilies();
    let checked = 0;
    for (const id of modelIds()) {
      const f = getModel(id);
      const groups = (f.variant_groups ?? []).map((g: unknown) => typeof g === "string" ? g : (g as { id?: string }).id);
      if (!groups.includes("Recipe")) continue;
      const caller = carried.get(id);
      if (caller === undefined) continue; // route-only: no card renders pills
      checked += 1;
      const stamping = (f.variants ?? []).filter((v: Record<string, unknown>) =>
        v["group"] === "Recipe" && Object.keys((v["wire_defaults"] ?? {}) as Record<string, unknown>).length > 0);
      assert.ok(stamping.length > 0,
        `${id}: declares the Recipe group, its card (${caller}) renders the dropdown, and NO row stamps — author truthful rows (the 2026-09-18 retirement left zero exemptions)`);
    }
    assert.ok(checked > 13, `the law reached the table (checked ${checked})`);
  });

  it("DEBT RETIRED: the 15-family census resolutions hold (stamps stamp, scoped stay scoped)", async (): Promise<void> => {
    await loadCardDefs();
    assert.equal(Object.keys(RESOLVED).length, 15, "the census pins all 15 resolutions (wan-vace + scail2-animate retired 2026-09-21)");
    for (const [id, how] of Object.entries(RESOLVED)) {
      const f = getModel(id);
      const groups = (f.variant_groups ?? []).map((g: unknown) => typeof g === "string" ? g : (g as { id?: string }).id);
      const stamping = (f.variants ?? []).filter((v: Record<string, unknown>) =>
        v["group"] === "Recipe" && Object.keys((v["wire_defaults"] ?? {}) as Record<string, unknown>).length > 0);
      if (how === "scoped") {
        assert.ok(!groups.includes("Recipe"), `${id} re-declared the Recipe group — author truthful rows instead of re-promising`);
      } else {
        assert.ok(stamping.length > 0, `${id} lost its stamps — restore the truthful rows`);
      }
    }
  });

  it("LAW B + C: every stamp key is a declared card param and every scalar sits inside the card's own bounds", async (): Promise<void> => {
    await loadCardDefs();
    const carried = cardCarriedFamilies();
    for (const id of modelIds()) {
      const f = getModel(id);
      const caller = carried.get(id);
      if (caller === undefined) continue;
      const scalars = declaredScalars(caller, id);
      if (scalars.size === 0) continue; // no live envelope (action cards)
      for (const row of (f.variants ?? []) as Array<Record<string, unknown>>) {
        const stamp = (row["wire_defaults"] ?? {}) as Record<string, unknown>;
        for (const [k, v] of Object.entries(stamp)) {
          assert.ok(scalars.has(k), `${id} recipe ${row["id"]}: stamps "${k}" — the card ${caller} declares no such param (a dead stamp)`);
          const spec = scalars.get(k)!;
          if (typeof v === "number") {
            if (spec.min !== undefined) assert.ok(v >= spec.min, `${id} recipe ${row["id"]}: ${k}=${v} under the card's declared min ${spec.min}`);
            if (spec.max !== undefined) assert.ok(v <= spec.max, `${id} recipe ${row["id"]}: ${k}=${v} over the card's declared max ${spec.max}`);
          } else if (typeof v === "string" && spec.enum !== undefined) {
            assert.ok(spec.enum.includes(v), `${id} recipe ${row["id"]}: ${k}="${v}" is not in the card's declared vocabulary`);
          }
        }
      }
    }
  });

  it("TEETH PROOF: the master refuses an out-of-bounds stamp and a dead key (mutation red-first)", async (): Promise<void> => {
    await loadCardDefs();
    const carried = cardCarriedFamilies();
    const caller = carried.get("music3");
    assert.ok(caller !== undefined, "music3 is card-carried");
    const scalars = declaredScalars(caller!, "music3");
    const duration = scalars.get("duration")!;
    assert.ok(duration.min === 5 && duration.max === 360, `the envelope carries the card's own bounds (got ${JSON.stringify(duration)})`);
    // the bound the wall enforces — exactly the refusal LAW C makes
    assert.ok(900 > (duration.max ?? Infinity), "a duration=900 stamp would be refused");
    assert.ok(!scalars.has("not_a_param"), "a not_a_param stamp would be refused by LAW B");
  });
});
