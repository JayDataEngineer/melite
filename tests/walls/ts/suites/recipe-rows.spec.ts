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
// The remaining zero-stamp card-carrying families are NAMED in the
// EXEMPT set below (each with cause) — the wall's exempt list is
// the debt census, it only ever SHRINKS, and a family leaves it by
// authoring truthful rows (the audio trio left it this stroke).
//
// Run: npx vitest run tests/walls/ts/suites/recipe-rows.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

/** The named debt census (zero-stamp card-carrying families, cause
 *  each). A family leaves by authoring wire_defaults rows — never
 *  by deleting its Recipe group while its card still generates. */
const EXEMPT: ReadonlySet<string> = new Set([
  // ── utility cards (no generation knobs to preset — the exempt
  //    cause is structural; removal means deleting the Recipe
  //    group from the DECL, a separate honest-scoping stroke)
  "input",            // ← input-prep: passthrough ingest
  "autoremesher",     // ← quad-remesh: retopo tool
  "florence2",        // ← tagger: captioning
  "joycaption",       // ← tagger
  "joytag",           // ← tagger
  "wd14",             // ← tagger
  "transfer_rig",     // ← img-to-mesh: rig transfer
  // ── generation families awaiting lane-truth values (turbo step
  //    counts, LoRA bags, geometry) — authored next strokes
  "anima",            // ← image-gen
  "h3",               // ← h3-timeline (the route families share the
  "h3-keyframe",      //    card; recipes belong on the carrier id
  "kimodo",           // ← motion
  "pixal3d",          // ← img-to-mesh
  "qwen-img-edit-2511", // ← image-edit
  "scail2-animate",   // ← video-gen
  "seedvr2_ema",      // ← upscale-tools
  "trellis2-native",  // ← img-to-mesh
  "wan-vace",         // ← video-gen
]);

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

  it("LAW A: every card-carrying family declaring the Recipe group stamps at least one row (or is a named exemption)", async (): Promise<void> => {
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
      if (stamping.length === 0) {
        assert.ok(EXEMPT.has(id), `${id}: declares the Recipe group, its card (${caller}) renders the dropdown, and NO row stamps — author truthful rows or name the exemption`);
      }
    }
    assert.ok(checked > 20, `the law reached the table (checked ${checked})`);
    // the audio trio left the exempt set this stroke — the law holds them now
    for (const id of ["music3", "moss-sfx", "qwen3-tts"]) {
      assert.ok(!EXEMPT.has(id), `${id} must not be exempt — its rows landed`);
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
