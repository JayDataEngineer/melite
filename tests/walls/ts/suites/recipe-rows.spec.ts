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
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { modelIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { QueueService } from "../../../../packages/harness/estate-queue/src/service.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// the variant rows ARE VariantRows (group + wire_defaults on the
// seam) — the wall reads them as such, not as loose Records.
import type { VariantRow } from "../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts";

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
  "flux-klein": "stamps",       // ← image-gen (2026-10-22, the 006-tail cure: BFL's own base defaults 50/4.0 — flux2 util.py — stamp as the author recipe)
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
      const stamping = (f.variants ?? []).filter((v: VariantRow) =>
        v.group === "Recipe" && Object.keys(v.wire_defaults ?? {}).length > 0);
      assert.ok(stamping.length > 0,
        `${id}: declares the Recipe group, its card (${caller}) renders the dropdown, and NO row stamps — author truthful rows (the 2026-09-18 retirement left zero exemptions)`);
    }
    // E-M10 (the wall audit, 2026-09-28): a `> 13` floor let a
    // family stop carrying Recipe rows unnoticed. The census is
    // exact: 17 card-carried families judge the law.
    assert.equal(checked, 17, `the law reaches the table, exactly (checked ${String(checked)})`);
  });

  it("DEBT RETIRED: the 16-family census resolutions hold (stamps stamp, scoped stay scoped)", async (): Promise<void> => {
    await loadCardDefs();
    assert.equal(Object.keys(RESOLVED).length, 16, "the census pins all 16 resolutions (wan-vace + scail2-animate retired 2026-09-21; flux-klein joins stamps 2026-10-22)");
    for (const [id, how] of Object.entries(RESOLVED)) {
      const f = getModel(id);
      const groups = (f.variant_groups ?? []).map((g: unknown) => typeof g === "string" ? g : (g as { id?: string }).id);
      const stamping = (f.variants ?? []).filter((v: VariantRow) =>
        v.group === "Recipe" && Object.keys(v.wire_defaults ?? {}).length > 0);
      if (how === "scoped") {
        assert.ok(!groups.includes("Recipe"), `${id} re-declared the Recipe group — author truthful rows instead of re-promising`);
      } else {
        assert.ok(stamping.length > 0, `${id} lost its stamps — restore the truthful rows`);
      }
    }
    // E-M10 (the wall audit, 2026-09-28): the "15 families" census
    // counted 14 ATOMS plus the h3-keyframe ALIAS — a second name
    // for h3-timeline's rows, so a family could be retired and the
    // alias kept the number at 15. The atom set is named, and the
    // alias is asserted to BE one (it resolves to the same variants
    // array — a separate declaration would be a second SSOT).
    // 2026-10-22: flux-klein joins as the 15th atom (the 006-tail
    // author-recipe cure).
    const ALIASES: Record<string, string> = { "h3-keyframe": "h3" };
    const atoms = Object.keys(RESOLVED).filter((id) => !(id in ALIASES));
    assert.equal(atoms.length, 15,
      `the census carries 15 model ATOMS (saw ${String(atoms.length)}): ${atoms.join(", ")}`);
    for (const [alias, atom] of Object.entries(ALIASES)) {
      assert.ok(alias in RESOLVED, `${alias} is a resolved name`);
      const aliasRows = (getModel(alias).variants ?? []).map((v: VariantRow) => v.id);
      const atomRows = (getModel(atom).variants ?? []).map((v: VariantRow) => v.id);
      assert.deepEqual(aliasRows, atomRows,
        `${alias} is an ALIAS of ${atom} — the same variants, not a second declaration`);
    }
  });

// E-M10: the two action cards carry no live envelope (no form
// params to stamp against) — the census that makes the skip honest.
const ACTION_CARDS_WITHOUT_ENVELOPE: string[] = [];

  it("LAW B + C: every stamp key is a declared card param and every scalar sits inside the card's own bounds", async (): Promise<void> => {
    await loadCardDefs();
    const carried = cardCarriedFamilies();
    // THE JUDGED FLOOR (the walls audit's H4, 2026-10-10): the two
    // skips below meant that a formSchemas() that returned null, or
    // declaredScalars that broke for every family, left this arm
    // judging ZERO stamps and bounds and passing. LAW A pins its
    // checked count; this arm pins its own.
    let judged = 0;
    // E-M10: the `scalars.size === 0` skip had NO census — a family
    // whose formSchemas went null would skip and the arm stayed
    // green. The skipped set is now COUNTED and pinned: exactly the
    // two action cards carry no live envelope, by design.
    const noEnvelope: string[] = [];
    for (const id of modelIds()) {
      const f = getModel(id);
      const caller = carried.get(id);
      if (caller === undefined) continue;
      const scalars = declaredScalars(caller, id);
      if (scalars.size === 0) { noEnvelope.push(id); continue } // action cards: no live envelope
      for (const row of f.variants ?? []) {
        const stamp = row.wire_defaults ?? {};
        for (const [k, v] of Object.entries(stamp)) {
          judged++;
          assert.ok(scalars.has(k), `${id} recipe ${row.id}: stamps "${k}" — the card ${caller} declares no such param (a dead stamp)`);
          const spec = scalars.get(k)!;
          if (typeof v === "number") {
            if (spec.min !== undefined) assert.ok(v >= spec.min, `${id} recipe ${row.id}: ${k}=${v} under the card's declared min ${spec.min}`);
            if (spec.max !== undefined) assert.ok(v <= spec.max, `${id} recipe ${row.id}: ${k}=${v} over the card's declared max ${spec.max}`);
          } else if (typeof v === "string" && spec.enum !== undefined) {
            assert.ok(spec.enum.includes(v), `${id} recipe ${row.id}: ${k}="${v}" is not in the card's declared vocabulary`);
          }
        }
      }
    }
    // E-M10: no card-carried family skips today (the set is empty,
    // and it is PINNED as empty — a family landing here means its
    // formSchemas went null, which used to skip in silence).
    assert.deepEqual(noEnvelope, ACTION_CARDS_WITHOUT_ENVELOPE,
      `no card-carried family may skip the scalar law (saw ${noEnvelope.join(", ")}) — ` +
      "a card that lost its formSchemas would land here, and the law would stop judging it");
    assert.ok(judged > 40,
      `LAW B + C judged real stamps (${String(judged)} — a formSchemas that returns null, or a declaredScalars that broke everywhere, would empty this arm)`);
  });

  // THE LOAD-SIZED TIMEOUT (2026-10-10): this arm boots the REAL
  // card registry (every model family, every card def) — the spec
  // default of 5s cannot hold that under a full-fleet run, and a
  // wall that dies of its own boot time reports a red the code never
  // produced.
  it("TEETH PROOF: the REAL admission refuses an out-of-bounds stamp and a dead key (the constants are not the proof)", { timeout: 60_000 }, async (): Promise<void> => {
    // 2026-10-10, the walls audit's row 6: this arm used to compare
    // ITS OWN constants — `900 > duration.max` proves the wall can
    // do arithmetic, never that the master refuses. The teeth are
    // behavioural, through the real bench-write admission
    // (admitStageRelations — the door a draft crosses):
    //   - the lawful body ADMITS (a door that refuses everything
    //     would make every refusal below vacuous),
    //   - the out-of-domain value REFUSES, naming the domain,
    //   - the undeclared key REFUSES, naming the surface.
    // The lane is the edit-2.1 family: it DECLARES a surface and a
    // bounds row, so LAW B and LAW C bind there by declaration.
    await loadCardDefs();
    const carried = cardCarriedFamilies();
    // E-L12 (the wall audit, 2026-09-28): the arm derived scalars
    // from MUSIC3 (the TTS lane) and then judged the IMAGE lanes'
    // admissions — two different paths, so the derivation proved
    // nothing about what was judged. The judged lanes' OWN scalars
    // are derived now: the image-edit row's width/height bounds come
    // from image-edit's envelope, and the dead-key refusal from the
    // image-gen envelope.
    const editCaller = carried.get("qwen-img-edit-21");
    assert.ok(editCaller !== undefined, "qwen-img-edit-21 is card-carried");
    const editScalars = declaredScalars(editCaller!, "qwen-img-edit-21");
    const width = editScalars.get("width");
    assert.ok(width !== undefined, "width is a declared scalar on the JUDGED lane's own card");
    const genCaller = carried.get("krea-2");
    assert.ok(genCaller !== undefined, "krea-2 is card-carried");
    const genScalars = declaredScalars(genCaller!, "krea-2");
    assert.ok(!genScalars.has("not_a_param"),
      "the dead key is absent from the JUDGED lane's own envelope (the refusal below is about this card)");
    // J12: the registry's dangling sweep reads the queue seat's
    // stateRoots manifest — mount the REAL queue on a temp root so
    // the admission judges with its trees (a seat-less registry
    // stands its sweep down, and a stood-down door admits anything)
    const registry = new CardRegistryService(new Context());
    new QueueService(registry.ctx, { stateRoot: mkdtempSync(join(tmpdir(), "recipe-rows-")) });
    await registry.prime();
    const lawful = registry.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      image1: "x.png",
      width: 1024,
      height: 1024,
    });
    assert.ok(lawful.ok, "the lawful body admits (the refusals below are not vacuous)");
    // LAW C's teeth: outside the DECL's own domain → refused, named
    const over = registry.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      image1: "x.png",
      width: -50,
      height: 512,
    });
    assert.ok(!over.ok, "an out-of-domain stamp is refused");
    assert.match(over.ok ? "" : String(over.error), /256–1536|outside this lane's range/);
    // LAW B's teeth: a key the card never declared → refused, named
    const dead = registry.admitStageRelations("image-gen", {
      model: "krea-2",
      prompt: "a harbour",
      not_a_param: 1,
    });
    assert.ok(!dead.ok, "a dead key is refused");
    assert.match(dead.ok ? "" : String(dead.error), /not_a_param|unknown param/);
  });
});
