// models-against-cards.spec.ts — THE CROSS-VALIDATION WALL.
//
// The killer feature resurrected (grammar 1323-1375 @ 034e1f97):
// every model default must live inside the OWNING card's field
// domains. This wall wires the two planes — the frozen registry
// (packages/engines/comfyui models/) and the 21 TS cards (comfyui-
// cordis loadCardDefs, schemastery schema.dict) — through the pure
// core (models/validate.ts). A default naming no field, an enum
// miss, or an out-of-range number refuses; a dead card ref refuses
// (the amnesty is over). The wall runs at every walls invocation
// (pre-commit + CI) — the boot-loud rail.
//
// Run: npx vitest run tests/walls/ts/suites/models-against-cards.spec.ts

import "../../../helpers/boot-models.ts";
import { modelsService } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { ENGINE_TRUTH as ENGINE_TRUTH_SSOT } from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";
import { assertSchemaAcceptsMinimalRows } from '../../../../packages/engines/comfyui-card-kit/src/model-contract.ts';
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** Which non-grammar files NAME a token (the readers census — the
 *  design audit's Q5: a declarer nobody reads is a claim nothing
 *  keeps). */
function execGrep(token: string, roots: string[], skip: readonly string[] = []): string[] {
  try {
    const out = execFileSync("grep", ["-rl", token, ...roots, "--include=*.ts", "--include=*.tsx"], {
      encoding: "utf8",
    });
    return out.split("\n").filter((f) => f !== "" && !skip.some((s) => f.includes(s)));
  } catch (e) {
    const out = (e as { stdout?: string }).stdout ?? "";
    return out.split("\n").filter((f) => f !== "" && !skip.some((s) => f.includes(s)));
  }
}
import { describe, it } from "vitest";

// D-M11 (the wall audit, 2026-09-28): the catalog's served-address
// census and the owner-atom census are EXACT — floors let the
// roster drift dark. Adding a family/variant/cell is a deliberate
// edit that touches these numbers.
// 60 -> 62 (2026-10-22, audit 006/U1: flux-klein lands — the
// distilled + base 4B tiers each serve one address)
// 62 -> 61 (2026-10-13, the autoremesher excision — the pack the owner removed from the system)
// 61 -> 63 (2026-10-23, the operator's turbo call — the qwen 2.1 turbo
// lane serves turbo-int8 + turbo-bf16 addresses)
// 67 -> 51 (2026-11-02, the folded-lanes + mesh-trio retirements):
// h3's six folded variant rows (fl2va, fl2va-turbo, ref2va,
// ref2va-turbo, keyframe, timeline-ref2va — each with its bf16/int8
// cells) left with the operator's recipe rework ("1 model, 1
// variant, 1 quant, and 3 recipes"), and both mesh families lost
// their 1536/512 rows (the trio's fast/standard tiers floor at 1024;
// quality's 1536 is a recipe pick, not a served route).
// 51 -> 59 (2026-10-16, the anima three checkpoints): base keeps
// route anima; turbo + aesthetic add variant routes and all three
// add int8/bf16 cell routes (8 new served addresses).
// 59 -> 60 (2026-10-17, the Singularity checkpoint): the h3 timeline
// lane's second checkpoint takes its own variant route address
// (h3-singularity; the krea-2 raw-lane precedent — two lanes, one
// family, distinct route addresses per lane).
// 60 -> 66 (2026-11-07, the operator's drop): krea-2 serves the two
// Kroma lanes (variant route kroma + the int8/bf16 cell routes
// kroma-int8/kroma-bf16, and kroma-base whose single cell shares its
// route) and moss-image lands (variant route moss-image + the bf16
// cell route moss-image-bf16; the int8 cell shares the variant
// route).
// 67 -> 74 (2026-11-08, the third edit lane): fibo2-edit serves its
// family route + two lanes × variant/cell routes (7 addresses).
const SERVED_ADDR_CENSUS = 74 // 75→74 2026-11-12: the openjutsu lane deleted (operator order) — viggle-animate's route address dies with its only card; earlier: 74→75 2026-10-27: the openjutsu lane serves viggle-animate (feature 023) — the ref2va INT8 body's route address joins; 74→73 2026-11-12: seedvr2-ema-7b died (the 7B death — no cells, no provision); 73→74 2026-10-27: music3-int8 joins — the wave's music3 quant work (2164b71a3, audit 014 C5) serves the int8_convrot cell's own route address
// 24 -> 25 (2026-10-22, audit 006/U1): flux-klein claims its own
// atom (the family's routes resolve to its declared owners)
// 25 -> 24 (2026-10-13, the autoremesher excision — the pack the owner removed from the system)
// 24 -> 23 (2026-10-26, the operator's size-at-quant fold: the
// qwen3-tts-voicedesign atom merges into THE ONE QWEN FAMILY — its
// five addresses survive as qwen3-tts cell routes (the FOLD LAW),
// so the served-address census is unmoved at 67 while the owner
// census drops one)
// 66 -> 67 (2026-11-09, E2-4 THE QUANT AXIS CONTRACT): seedvr2-ema's
// 3B body seats its two real tiers as cells — the fp8 lane gains
// its own route address (seedvr2-ema-fp8), the fp16 tier keeps the
// family head
// 23 -> 24 (2026-11-07, the operator's drop): moss-image claims its
// own atom (the kroma lanes ride the krea-2 atom — variants, not
// families).
// 24 -> 25 (2026-11-08, the third edit lane): fibo2-edit claims its
// own atom (its routes resolve to their declared owner).
// 26 -> 25 (2026-11-12): the openjutsu lane deleted by operator
// order — viggle-animate's claimed atom dies with its only card.
const OWNER_ATOM_CENSUS = 25
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { ModelError } from "../../../../packages/engines/comfyui-card-kit/src/model-contract.ts";
import {
  getModel,
  modelIds,
  owningAtom,
  registryIds,
  registryModel,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import {
  fieldDomains,
  validateRegistryAgainstCards,
  type CardDomains,
  type FieldDomain,
} from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";

const here = fileURLToPath(import.meta.url);

/** The registered table as decls (the REGISTRY plane — raw model
 *  atoms; the route view merges variant resolver_defaults into
 *  defaults, which the card-domain gate must never see). */
function allDecls() {
  return registryIds().map((id) => registryModel(id));
}

/** Route id → its cascade-derived view (the check's subject for
 *  boarded routes — mirrors the boot's threading). */
function allRouteViews(): Map<string, ReturnType<typeof getModel>> {
  const out = new Map<string, ReturnType<typeof getModel>>();
  for (const id of modelIds()) out.set(id, getModel(id));
  return out;
}

/** THE CALLER OWNS THE EDGE: card id → its boarded atoms (the
 *  only form the relation exists in — models declare no callers). */
async function allBoardings(): Promise<Map<string, readonly string[]>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Map<string, readonly string[]>();
  for (const id of svc.cardIds()) out.set(id, svc.getCardDef(id)?.boarded ?? []);
  return out;
}

/** THE ADMISSION LAW (2026-09-22, ledger vii): CardDefinition.admits
 *  keys are legal defaults targets — the boot validator's 7th arg.
 *  Route-stamped by the variant rail, never rendered. */
async function allAdmits(): Promise<Map<string, readonly string[]>> {
  await loadCardDefs();
  const svc = theService();
  const out = new Map<string, readonly string[]>();
  for (const id of svc.cardIds()) {
    const admits = (svc.getCardDef(id) as { admits?: readonly string[] } | undefined)?.admits;
    if (admits !== undefined) out.set(id, admits);
  }
  return out;
}

/**
 * The compose's own declaration keys, never card fields (born
 * ENGINE_TRUTH_KEYS @ 034e1f97 — "the audio lanes' default mode
 * (tts/design) rides defaults and the renderer reads it as data").
 * One SSOT since the models-against-cards audit's finding 5:
 * validate.ts exports it; the boot call (service.ts) and this wall
 * import the same triple. */
const ENGINE_TRUTH = ENGINE_TRUTH_SSOT;

async function cardTable(): Promise<CardDomains> {
  const defs = await loadCardDefs();
  const out: Map<string, ReturnType<typeof fieldDomains>> = new Map();
  for (const [id, def] of defs) {
    // schemaCarrier when the registered schema is a hand-written
    // normalizer (the h3-timeline precedent), else the schema itself
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
      (def as { schema?: unknown }).schema;
    const dict = (carrier as { dict?: Record<string, never> } | undefined)?.dict;
    assert.ok(
      dict !== undefined,
      `card ${id} must expose a schemastery object schema (.dict)`,
    );
    out.set(id, fieldDomains(dict));
  }
  return out;
}

/** The full card-id set with ONE poisoned card's domains — the
 *  semantics probes (never real data drift: every card id present,
 *  so refusals come from the poisoned domain, not the amnesty). */
async function tableWith(
  cardId: string,
  domains: ReadonlyMap<string, { min?: number; max?: number; options?: readonly string[] }>,
): Promise<CardDomains> {
  const defs = await loadCardDefs();
  // CardDomains is the READ face (ReadonlyMap) — build the mutable
  // table, then hand it over (Map IS a ReadonlyMap; same object,
  // same reference for the poisoned arm below).
  const table = new Map<string, ReadonlyMap<string, FieldDomain>>();
  for (const id of defs.keys()) table.set(id, new Map<string, FieldDomain>());
  table.set(cardId, domains);
  return table;
}


/** The pairs the cross-validation MUST check, derived from the
 *  same inputs the validator reads (models/validate.ts:138-148): a
 *  card's every boarded family that resolves to a registered decl on
 *  the comfyui plane. A family that stops boarding, or a card that
 *  starts, moves this list — nothing needs a hand edit. */
function expectedPairs(
  boardings: ReadonlyMap<string, readonly string[]>,
  routeViews: ReadonlyMap<string, unknown>,
): string[] {
  // the validator's own byId: every family PLUS every route address
  // (a card may board a VARIANT route, not only a family — the tts
  // card boards qwen3-tts-base and the design route directly)
  const byId = new Map(allDecls().map((d): [string, { id: string; engine?: string }] => [d.id, d]));
  for (const [route, view] of routeViews) {
    if (!byId.has(route)) byId.set(route, view as { id: string; engine?: string });
  }
  const out: string[] = [];
  for (const [cardId, boarded] of boardings) {
    for (const mid of boarded) {
      const decl = byId.get(mid);
      if (decl === undefined) continue;
      if (decl.engine !== undefined && decl.engine !== "" && decl.engine !== "comfyui") continue;
      out.push(`${cardId}<-${mid}`);
    }
  }
  return out;
}

describe("models against cards (the cross-validation, resurrected)", () => {
  it("every model default lives inside its owning card's field domains", async (): Promise<void> => {
    const cards = await cardTable();
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, await allBoardings(), new Set(modelIds()), allRouteViews(), await allAdmits());
    // DERIVED, NOT A LITERAL (the flake audit, 2026-10-15): the
    // census IS the tree — every (card, boarded family) pair that
    // resolves to a registered, comfyui-engine family. The old 26
    // counted a set the estate grows by design, and its own comment
    // already disagreed with it (27 boardings, 26 checked).
    assert.deepEqual(
      checked.map(([mid, cardId]) => `${cardId}<-${mid}`).sort(),
      expectedPairs(await allBoardings(), allRouteViews()).sort(),
    );
    assert.ok(checked.length > 10, "the census is not empty (the derivation rotted)");
  });

  // THE STARVING-FIELD LAW (2026-10-09, the empty-form burn): a
  // numeric PARAM knob with NO schema .default() and NO owning
  // family DECL default renders EMPTY on the form while the lane
  // may silently hardcode its fallback — the width/height burn
  // (image-edit rendered empty fields for months while only the
  // LANE knew `?? 1024`). The invariant this wall enforces:
  // every numeric params-zone field carries EXACTLY ONE default
  // owner — the schema (meta.default) or the visible_when-named
  // family's DECL defaults row. Strings are exempt (a prompt's
  // emptiness is honest); booleans and sliders default in-schema.
  // Lose an owner, lose the build — the wolf walks through the
  // front door no more.
  /** The named hand-built schema carriers — a card exempted from
   *  the field census is listed here, so the exemption is an
   *  argument, not a hole. EMPTY by the pin of 2026-10-10: the
   *  h3 precedent card now carries a serialized dict like every
   *  other card, so the census sees the WHOLE estate. The next
   *  hand-built carrier must be named in this list to walk past the
   *  wall — which is the point. */
  const HAND_WRITTEN_CARRIERS: string[] = [];

  it("NO STARVING FIELD: every numeric params field has a default owner (schema or the owning family's DECL)", async (): Promise<void> => {
    const defs = await loadCardDefs();
    const starving: string[] = [];
    const handWritten: string[] = [];
    // THE JUDGED FLOOR (the walls audit's H6, 2026-10-10): three
    // filters skip fields (no dict — pinned below; non-params zone;
    // non-number type; schema-owned default) and none of them was
    // counted, so retagging every numeric params field to another
    // zone judged ZERO fields and the width/height burn returned
    // green. The census states how many fields it walked.
    // D-C5 (the wall audit, 2026-09-28): the counter incremented
    // BEFORE the continue filters — re-typing every numeric field to
    // string kept the census fat while ZERO fields reached the
    // judge, and the arm greened over an empty pass. The counted
    // number is JUDGED now: incremented only where the starving law
    // actually runs.
    let judged = 0;
    let walked = 0;
    // finding 6 (the audit, 2026-09-28): the surface-successor
    // `continue` skips the field for a family whose params SURFACE
    // excludes it — a legitimate successor law, but INVISIBLE: a
    // surface emptied to `[]` skipped every unscoped knob while
    // the census stayed fat. The skip is COUNTED now (exact pin),
    // and the dict-less exemption census below already names the
    // neither-bucket cards.
    let surfaceSkips = 0;
    // THE OPT-IN-TOGGLE GATE's own counter (the resize order's final
    // shape): one skip per surfaced opt-in numeric per boarded family.
    let toggleSkips = 0;
    for (const [cardId, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        (def as { schema?: unknown }).schema;
      const dict = (carrier as { dict?: Record<string, { type?: string; meta?: { default?: unknown; extra?: { zone?: string; visible_when?: string } } }> | undefined })?.dict;
      // THE EXEMPTION IS PINNED, NOT OPEN (the walls audit's row 15,
      // 2026-10-10): a carrier without a `.dict` SKIPS the whole
      // arm, and the exemption's own size was never counted — a
      // card rewritten with a hand-built carrier walked out of the
      // wall silently. The hand-written set is named here (h3's
      // precedent): a NEW exemption is a deliberate edit that has
      // to touch this list.
      if (dict === undefined) {
        handWritten.push(cardId);
        continue;
      }
      for (const [name, field] of Object.entries(dict)) {
        const meta = field?.meta;
        const zone = meta?.extra?.zone;
        const guard = meta?.extra?.visible_when;
        walked++;
        if (zone !== "params") continue;
        if (field.type !== "number") continue; // strings' emptiness is honest
        if (meta?.default !== undefined) continue; // the schema owns it
        judged++;
        // THE OPT-IN-TOGGLE GATE (the resize order's final shape,
        // operator 2026-11-12): a numeric the schema shows ONLY under
        // an opt-in toggle (`key=false` where the key is a boolean
        // defaulting true) never starves — its HIDDEN face is the
        // default (match-source: unstated IS the deliverable), its
        // SHOWN face is explicit typing, and the absent pair composes
        // the byte-stable identity (the E8 pin), never a silent
        // hardcoded fallback. The gate is DERIVED (guard + the
        // toggle's schema default), never a name: retype the guard
        // or drop the default and the field falls back into the
        // family loop. Counted and pinned below — a new opt-in knob
        // moves the number and is argued there.
        if (typeof guard === "string") {
          const m = guard.match(/^([A-Za-z0-9_]+)=false$/);
          const toggle = m?.[1] === undefined ? undefined : dict[m[1]];
          if (m?.[1] !== undefined && toggle?.type === "boolean" && toggle.meta?.default === true) {
            for (const fam of def.boarded) {
              const decl = registryModel(fam);
              if (decl === undefined) continue;
              const surface = decl.params as string[] | undefined;
              if (Array.isArray(surface) && surface.includes(name)) toggleSkips++;
            }
            continue;
          }
        }
        if (typeof guard === "string" && guard.startsWith("model=")) {
          // family-SCOPED knob: the named family is the one owner
          const fam = guard.slice("model=".length);
          const decl = registryModel(fam);
          if (decl === undefined) {
            starving.push(`${cardId}.${name}: visible_when names unknown family '${fam}'`);
          } else if ((decl.defaults as Record<string, unknown> | undefined)?.[name] === undefined) {
            starving.push(`${cardId}.${name}: scoped to family '${fam}' whose DECL declares no default for it — the form starves (the width/height burn)`);
          }
          continue;
        }
        // UNSCOPED knob: EVERY family boarded on the card owns a
        // default for it — a family that boards without declaring
        // starves its own users (the law the first cut missed:
        // image-gen.width is fine on krea-2 and empty on any
        // family that boards without a resolution).
        // THE SURFACE SUCCESSOR (2026-10-10, fix shape 2): the
        // visible_when guard is dead — a family that declares a
        // params SURFACE which EXCLUDES the field never renders it,
        // so it cannot starve there (2511 edits at source
        // resolution; width/height are not its params at all).
        // Absent surface = the legacy truth: the card's union
        // table serves the field on every lane, and every family
        // must own its default.
        for (const fam of def.boarded) {
          const decl = registryModel(fam);
          if (decl === undefined) continue; // unknown families refuse elsewhere
          const surface = decl.params as string[] | undefined;
          if (Array.isArray(surface) && !surface.includes(name)) { surfaceSkips++; continue; } // not that family's param (counted — an emptied surface is visible)
          if ((decl.defaults as Record<string, unknown> | undefined)?.[name] === undefined) {
            // THE VARIANT-CLASS OWNER (audit 013 cure 3, the steps
            // envelope): a required_defaults row with class "variant"
            // whose every VARIANT row carries the key in its own
            // resolver_defaults — the default owner is the VARIANT
            // plane (each lane's own face); the family block must NOT
            // restate it (the 25-on-Turbo prefill burn). Recipe rows
            // are stamp macros — the canon keeps resolver_defaults
            // off them, so the owner walk judges Variant rows only.
            const required = (decl.required_defaults ?? []) as Array<{ name?: string; class?: string }>;
            const variantRows = ((decl.variants ?? []) as Array<{ group?: string; resolver_defaults?: Record<string, unknown> }>)
              .filter((v) => v.group === "Variant");
            const variantOwned = required.some((r) => r.name === name && r.class === "variant") &&
              variantRows.length > 0 &&
              variantRows.every((v) => v.resolver_defaults?.[name] !== undefined);
            if (!variantOwned) {
              starving.push(`${cardId}.${name}: unscoped but family '${fam}' declares no default — that family's form starves`);
            }
          }
        }
      }
    }
    assert.deepEqual(starving, [], "starving fields found:\n  " + starving.join("\n  "));
    // the exemption list itself is a wall: hand-built carriers are
    // named, never a growing hole
    // 2026-10-12: 465 -> 469, the img-to-mesh card's four sign-mode
    // separation knobs (remesh_qef, remesh_drop_inverted,
    // remesh_drop_enclosed, remesh_fix_poles) — the audit's pinned-off
    // literals became card params with the core defaults as schema
    // defaults
    // 2026-10-07 (batch 008 M5, the FBX door): 469 -> 470, the rig
    // card's file_format knob (glb|fbx vocabulary, schema default
    // glb — a string field, so the numeric judge is unmoved and no
    // family starves)
    // 470 -> 471 (2026-10-18, audit 010/R1): h3's ref_mods seat —
    // an ARRAY field (the numeric judge owns numbers only); growth
    // argued: one new card seat. RETIRED-STALE 2026-11-12: the
    // original reason said "walked but never judged" — the refmod
    // value arms (h3 door.spec, refmod-value-arms-2026-11-08) now
    // judge the seat's composed value at the consumer node; the row
    // stays (this census counts seats, the numeric judge owns
    // numbers), the reason is corrected to the tree.
    // 471 -> 472 (2026-10-21, the af-move cure): the quad-remesh
    // preset budget-class knob (a string vocabulary — the node's
    // combo takes a class, never '') — walked, never judged.
    // 472 -> 473 (2026-10-22, audit 003/V4): h3's ref_video_trims
    // seat — an ARRAY field on the family schema the h3-timeline
    // card carries as its schemaCarrier (the ref_mods precedent:
    // walked, never judged — the numeric judge owns numbers only).
    // 473 -> 474 (2026-10-22, audit 004/C4): image-gen's
    // reference_images seat — the phantom port's return condition
    // met (a card schema ARRAY field the 2.1 t2i lane reads; the
    // cross-family refusal is compose's, not the census').
    // RE-PINNED DOWN AT THE OWNER'S CLOSEOUT ORDER (2026-10-13):
    // the working tree's in-flight estate changes (sibling
    // session) emptied one params field; the archaeology was
    // deliberately not performed — the pin matches observed
    // reality.
    // 473 -> 465 (2026-10-13, the autoremesher excision): the
    // quad-remesh card's whole schema left with the pack the owner
    // removed from the system (preset, target_quads, sharp_edge,
    // smooth_normal and the rest of the remesh surface).
    // 465 -> 466 (2026-10-22, audit 004/C4): the image-gen card's
    // reference_images seat joins (the qwen-img-21 encoder's
    // reference port).
    // 466 -> 467 (2026-10-13, the match toggle): the image-edit
    // card's match_input_resolution seat — a BOOLEAN params field on
    // the card schema, walked, never judged (the numeric judge owns
    // numbers only), admitted on both edit lanes (2511 as a no-op).
    // 467 -> 466 (2026-10-31, the template-fidelity cure): the
    // img-to-mesh card's bg_removal seat leaves — birefnet left both
    // mesh families' routes, the knob fired nothing on the lane, and
    // the crop eats the photo unconditionally. A deliberate loss,
    // argued here per this arm's own law.
    // 466 -> 465 (2026-11-06, the film-prompt completion): the
    // storm's wave-6 removal of h3's film-level prompt (operator
    // order — calls own their text) completes at the DECL surface:
    // the schema field left in schema.ts and params drops it here,
    // else the claim law names a dead declaration. One walked dict
    // field departs, deliberately, argued here.
    // 465 -> 467 (2026-10-16 late, THIS session's archaeology — two
    // seats arrived unargued while the pin sat at 466):
    // (1) the image-prep card's scale_model (8ccd5d7fe, seq 77744,
    // the ANNY-studio cure): a string vocabulary field (the family's
    // SCALE_MODEL_OPTIONS export — one truth, card vocabulary +
    // action enum), walked, never judged. The 8ccd5d7fe receipt
    // CLAIMED "census 466->467" and never edited this pin — a
    // receipt outside the wall, the exact class this census refuses.
    // (2) h3's schema fps row (8548cdc9e, the second-pass
    // doc-clock seat): numeric WITH the schema default(24), so the
    // starving judge passes it and the judged pin is unmoved; the
    // walk counts it. Identified by the per-file key-set diff
    // (git show <pin>:file vs HEAD) — the enumeration is the
    // receipt, never a silent bump.
    // judged 7 -> 8 (2026-11-02, the dual-floor cure): image-gen's
    // cfg dropped its schema .default(4.5) — the boarded families
    // (krea-2: 1, z-image: 1, anima: 4, qwen-img-21: 1, flux-klein:
    // 1) own the floor, so the knob ENTERS the judged set as a
    // family-owned numeric params field (no starve: every boarded
    // family declares it — the starving array above stayed empty).
    // 467 -> 468 (2026-11-08, (l) 1905dedc0): the anny card's
    // body_image — a string field, judged by the wtype judge, only
    // walked here (the enumeration is the receipt).
    // 468 -> 472 (2026-10-19, the stated bake): the h3 family's
    // refmod group (mode/pool/identity/save) — the bake's fidelity
    // dials declared on the serve plane, judged like every knob.
    // 472 -> 473 (2026-10-20, the SOTA refine window): h3's
    // refine_denoise — a numeric knob WITH the schema default(1),
    // so the starving judge passes it (default-owned by the schema)
    // and the walk counts it. One new knob, argued here.
    // 473 -> 475 (2026-10-21, SOTA P2 LIMB 3): h3's upscale_route +
    // upscale_model — the two-pass latent-upscale pair (both carry
    // schema defaults: off + the LBH bf16 file), walked like every
    // knob. Two new fields, argued here.
    // 475 -> 476 (2026-10-21, the studio-unbrick cure, row
    // cards-tts-export-pair-renders): tts voice_name — the design
    // export pair's other half joins the walked set (a string, not
    // a numeric knob; the walk counts every walked field). One new
    // field, argued here.
    // 476 -> 475 (2026-10-22, THE MOD-PRESENCE LAW, row
    // cards-tts-mod-presence): the qvoice_save pack shrank to its
    // one boolean stamp — voice_name + the five sampling knobs died
    // with the duped-pane burn; save_qvoice joins the walked set.
    // 475 -> 476 (2026-11-12, slice 1 the keyframe bus): h3-timeline's
    // keyframes — the any-frame pin lane (an array of { frame, image }
    // rows; the row's shape law is the walk's assertKeyframeRowShape,
    // not a numeric default owner). One new field, argued here.
    // 476 -> 475 (2026-10-27, audit 013 cure 2, the keyframes row
    // death): h3-timeline's keyframes leaves the walked set — the pin
    // lane is a document-plane lane (studio.writes + the schema
    // walk's assertKeyframeRowShape), no longer a carrier row.
    // 475 -> 476 (2026-10-27, the same day's wave, 2164b71a3): the
    // music card's tiled_decode joins the walked set (a boolean
    // music3-scoped decode knob, visible_when model=music3) — the
    // keyframes exit and the tiled_decode seat cancel; the census
    // holds at 476 with keyframes OUT and tiled_decode IN.
    // 476 -> 496 (2026-10-27, the openjutsu lane, feature 023): the
    // viggle-animate family + the openjutsu card join the walked set
    // — 9 card fields (length/width/height/steps/shift_video/
    // shift_audio/seed numeric; clip/ref_image typed) + 11 DECL
    // param rows on the animate action. Twenty new fields, argued
    // here.
    // 496 -> 502 (2026-10-28, the swap build, R0c + R0b): the
    // trim + frames cards join the walked set — 3 fields
    // each (clip typed + two knobs: start/end_seconds, every_nth/
    // frame_load_cap). Six new fields, argued here.
    // 513 -> 504 (2026-11-12): the openjutsu lane deleted by
    // operator order — its card's nine fields leave the walked set.
    // (Earlier: 502 -> 513, 2026-10-28 swap build R0a — the track
    // card's eleven fields joined.)
    assert.equal(walked, 504,
      `the census walked the estate's fields (${String(walked)} — a re-zoned or re-typed field set MOVES this number; growth is argued here, loss means the census emptied an arm)`);
    // judged 8 -> 6 (2026-11-08, the latent law): the image-edit
    // card's width/height leave the params zone (hidden compatibility
    // keys — the alias precedent) as the edit lanes retire the stated
    // size, so the numeric judge sees two fewer params-zone numbers.
    // 6 -> 12 (2026-10-27, the openjutsu lane, feature 023): the
    // openjutsu card's six numeric params knobs enter the judge
    // (length, width, height, steps, shift_video, shift_audio) —
    // every one default-owned by the viggle-animate DECL (the
    // dual-floor cure keeps the card schema off those keys), the
    // starving list above stays empty.
    // 12 -> 6 (2026-11-12): the openjutsu lane deleted by operator
    // order — its six numeric knobs (the DMD envelope) leave the
    // judged set; every survivor keeps its default owner.
    // 6 -> 8 (2026-11-12, the resize order): the image-edit card's
    // width/height pair LEAVES the hidden-compatibility zone and
    // returns as served params-zone numerics (the deliverable-size
    // seats — no schema defaults, unscoped). The starving array
    // above stays empty by the OPT-IN-TOGGLE gate (a numeric shown
    // only under a default-ON toggle never starves — unstated is
    // the deliverable), never the surface-successor law: the final
    // shape surfaces the pair on all three edit families.
    assert.equal(judged, 8,
      `the census JUDGED the estate's numeric params fields (${String(judged)} of ${String(walked)} walked — re-typing them out of the judge MOVES this number down; a new judged knob moves it up and is argued here)`);
    // exact: the skips were qwen-img-edit-2511's declared
    // resolution rows (width/height are not its params — it
    // declares its own), the surface-successor precedent.
    // 2 -> 0 (2026-11-08, the latent law): the card's width/height
    // left the params zone entirely (hidden compatibility keys —
    // the alias precedent), so the pair exits at the zone filter
    // upstream of the family loop and the skip class empties.
    // 0 -> 6 (2026-11-12, the resize order's first shape): the pair
    // RETURNED as served params-zone numerics, surface-excluded on
    // all three edit families (2 knobs × 3 families — the
    // deliverable tail is kit-owned, never a family param).
    // 6 -> 0 (2026-11-12, the final shape): the lanes surface the
    // pair as run params, so the skip class empties again — and the
    // starving question moves to the opt-in-toggle gate above (2
    // knobs × 3 surfaced families = 6 counted skips). GROWTH in
    // either counter means a surface emptied or a new opt-in knob
    // landed, and every skip is argued here.
    assert.equal(surfaceSkips, 0,
      `surface-successor skips are 0 today — the edit lanes surface the deliverable pair (saw ${String(surfaceSkips)}: growth means a family emptied its params surface, and every skip is a knob the starving law no longer judges)`);
    assert.equal(toggleSkips, 6,
      `opt-in-toggle skips are 6 today — the deliverable pair under the default-ON match toggle on all three edit families (saw ${String(toggleSkips)}: growth means a new opt-in numeric landed, and every skip is argued here)`);
    assert.deepEqual(handWritten, HAND_WRITTEN_CARRIERS,
      `the hand-written-carrier exemption is pinned (seen ${handWritten.join(", ") || "—"} vs the named ${HAND_WRITTEN_CARRIERS.join(", ") || "—"} — a card that rewrites itself out of the census must be argued in this list)`);
  });

  // ── SD-5: THE EXEMPTIONS WEARING COMMENTS (the purge audit's
  // meta-finding) ────────────────────────────────────────────────────
  // The census pin comments above (470→471 ref_mods, 472→473
  // ref_video_trims, 466→467 match_input_resolution) record the
  // numeric judge's type blindness as ARGUMENTS, not judgments. The
  // two arms below convert the class into law: (a) pins THE seat the
  // audit names to its live judged homes; (d) censuses the whole
  // skip class — every member named with its judged home, both
  // directions judged, homes verified live by title substring.

  it("THE WALKED-NEVER-JUDGED SEAT (ref_mods, SD-5a): the params walk visits the h3 array seat and the numeric judge judges nothing BY LAW — the seat's value law lives at named, live judges (the refmod value arms' arrival, the liveness round-trip's emission), pinned here by title, never by comment", async () => {
    const read = (rel: string): string => readFileSync([process.cwd(), ...rel.split("/")].join("/"), "utf8");
    // 1. THE SEAT EXISTS IN THE WALK — derived from the real card
    // defs (the same walk the starving judge runs), never a hand
    // name. The walk counts EVERY dict field (walked++), then the
    // numeric judge judges params-zone numbers only — so the
    // walked-never-judged seat class is: type "array", zone NOT
    // params (the census pins' own description of ref_mods, audit
    // 010/R1). The seat leaving the walk kills this pin with it
    // (the exemption dies when its seat dies).
    const defs = await loadCardDefs();
    const seats: string[] = [];
    for (const [cardId, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        (def as { schema?: unknown }).schema;
      const dict = (carrier as { dict?: Record<string, { type?: string; meta?: { extra?: { zone?: string } } }> | undefined })?.dict;
      if (dict === undefined) continue;
      for (const [name, field] of Object.entries(dict)) {
        const zone = field?.meta?.extra?.zone;
        if (field?.type === "array" && zone !== "params") seats.push(`${cardId}.${name}`);
      }
    }
    assert.deepEqual(seats, [
      // audit 013 cure 2 (2026-10-27, the keyframes row death): the
      // any-frame pin lane left the carrier (a document-plane lane —
      // studio.writes + the schema walk's assertKeyframeRowShape), so
      // its walked-never-judged entry dies with the row.
      "h3-timeline.ref_images", "h3-timeline.ref_videos", "h3-timeline.ref_video_trims",
      "h3-timeline.ref_audios", "h3-timeline.ref_mods",
      "image-edit.input_images", "image-edit.reference_images",
    ], `the walked ref_mods seat moved (seen [${seats.join(", ") || "—"}] vs the pinned seats) — the exemption's seat is judged here, never assumed; the walk's zone-less array class is enumerated IN FULL, and a new member is a deliberate edit to this list (the walked-pin law)`);
    // 2. THE ARRIVAL JUDGE IS LIVE: the refmod value wall's ARM 2
    // drives the run-level ref_mods seat through the real compose and
    // judges the value at the consumer — arrival, not emission.
    const refmodWall = read("tests/walls/ts/suites/refmod-value-arms.spec.ts");
    assert.ok(
      refmodWall.includes("ARM 2 — the run-level declared seat (ref_mods"),
      "the ref_mods arrival judge went dark: ARM 2's title left tests/walls/ts/suites/refmod-value-arms.spec.ts — the exemption's cited home is a comment again",
    );
    // 3. THE EMISSION JUDGE IS LIVE: the liveness wall's WRITES_EXEMPT
    // round-trip arm fires on the exempt seat (SD-5b) — the serialize
    // round-trip the ledger's why cites, made an actual arm.
    const livenessWall = read("tests/walls/ts/suites/card-compose-liveness.spec.ts");
    assert.ok(
      livenessWall.includes("THE WRITES_EXEMPT ROUND-TRIP ARMS (SD-5b)"),
      "the ref_mods emission judge went dark: the WRITES_EXEMPT round-trip arm's title left card-compose-liveness.spec.ts — the WRITES_EXEMPT why cites a judge that no longer exists",
    );
  });

  it("THE TYPE-BLIND CENSUS (SD-5d): every boolean/array params field the walk visits and the numeric judge skips is enumerated here with its live judged home — the skip class is a named census, never a construction", async () => {
    const read = (rel: string): string => readFileSync([process.cwd(), ...rel.split("/")].join("/"), "utf8");
    // THE DERIVATION: the starving judge's own walk, stopped at the
    // type filter (`field.type !== "number"`) for the two classes the
    // SD-5 finding names. Strings ride the walk's own stated law
    // (emptiness is honest); booleans and arrays are the blind class.
    const defs = await loadCardDefs();
    const census: string[] = [];
    for (const [cardId, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
        (def as { schema?: unknown }).schema;
      const dict = (carrier as { dict?: Record<string, { type?: string; meta?: { extra?: { zone?: string } } }> | undefined })?.dict;
      if (dict === undefined) continue; // the hand-written carriers are the starving arm's own pin
      for (const [name, field] of Object.entries(dict)) {
        if (field?.meta?.extra?.zone !== "params") continue;
        if (field.type !== "boolean" && field.type !== "array") continue;
        census.push(`${cardId}.${name} (${String(field.type)})`);
      }
    }
    assert.ok(census.length > 0, "the type-blind census went vacuous — the walk no longer sees any boolean/array params field (the derivation broke)");
    // THE LEDGER: the explicit judged invariant per member. A census
    // member with no ledger row is an UNARGUED skip (the SD-5 class —
    // a comment wearing a judgment's clothes); a ledger row with no
    // census member is a dead name; every row's home is verified LIVE
    // by title substring over the named wall file.
    const LEDGER: Record<string, { home: string; anchor: string }> = {
      "image-edit.match_input_resolution (boolean)": {
        home: "packages/image/image-edit/tests/value-roundtrip.spec.ts",
        anchor: "E8 (the resize pole): match_input_resolution ON/OFF compose structurally identical graphs with NO stated size",
      },
      "image-edit.use_stock_nodes (boolean)": {
        home: "packages/image/image-edit/tests/value-roundtrip.spec.ts",
        anchor: "E9 (single-plane law): use_stock_nodes takes no branch",
      },
      "image-edit.double_reference (boolean)": {
        home: "packages/image/image-edit/tests/value-roundtrip.spec.ts",
        anchor: "E10 (unbuildable, honest): a stated double_reference=true REFUSES loud naming the knob",
      },
      "image-gen.reference_images (array)": {
        home: "packages/image/image-gen/tests/card.spec.ts",
        anchor: "a stated reference_images key refuses LOUD on every family EXCEPT its owner qwen-img-21",
      },
    };
    const offenders: string[] = [];
    offenders.push(...census.filter((seat) => !(seat in LEDGER))
      .map((s) => `${s}: walked, never judged, and NO ledger row names its home — an unargued type-blind skip (the SD-5 class)`));
    offenders.push(...Object.keys(LEDGER).filter((k) => !census.includes(k))
      .map((k) => `ledger row '${k}' names no walked seat — a dead exemption, prune it`));
    for (const [seat, { home, anchor }] of Object.entries(LEDGER)) {
      if (!read(home).includes(anchor)) {
        offenders.push(`${seat}: the judged home's anchor left ${home} — the exemption's judge went dark`);
      }
    }
    assert.deepEqual(offenders, [], "THE TYPE-BLIND CLASS IS UNNAMED:\n  " + offenders.join("\n  "));
  });

  // THE VARIANT-STAMP LAW (operator 2026-09-23, "base doesn't even
  // have the audio input — where is the audit?"): the form's
  // visible_when guards key `variant=` against the RESOLVED
  // model_defaults value. The tts card's own spec pinned the guard
  // STRINGS while no wall anywhere pinned the STAMP CHAIN — the
  // 0.6B family stamped `variant` on no route, so every
  // variant-scoped row (reference audio, the voice picker, the
  // sampling rows) rendered on NO lane of that family, with every
  // existing wall green. This wall wires the two planes the
  // incident proved unwired:
  //   (a) every guard ARM names a declared Variant row of every
  //       boarded family (a dead arm hides its rows forever);
  //   (b) every ROUTE of every boarded family resolves a stamped,
  //       declared variant — an unstamped route serves variant:''
  //       and the lock holds with no key.
  it("a family declaring a per-variant surface gets a stamped, declared variant on every route", async (): Promise<void> => {
    // THE SUCCESSOR (li-r, 2026-10-10): the card-side `visible_when:
    // variant=…` guard table is GONE — a variant's declared param
    // surface IS its visibility. The law this wall carried is
    // unchanged, its speaker moved: a family that declares a
    // per-variant surface (ModelDecl variants[].params) needs every
    // ROUTE to resolve a stamped, declared Variant row, or the form
    // has no lane identity to filter by and the surface judge picks
    // nothing. (The card-side arm check — "every guard arm names a
    // declared variant" — died with the grammar; its successor is
    // the claim law, which checks the OTHER direction: every
    // declared surface field must be carriable by the card, both
    // ways, in estate-queue's cards-lane-law.spec.ts.)
    const defs = await loadCardDefs();
    let declaring = 0;
    let judgedSurfaces = 0;
    for (const atom of allDecls().map((d) => d.id)) {
      const fam = registryModel(atom);
      const withSurface = fam.variants.filter(
        (v) => Array.isArray((v as { params?: unknown }).params) && (v as { params?: unknown[] }).params!.length > 0,
      );
      if (withSurface.length === 0) continue;
      declaring += 1;
      judgedSurfaces += withSurface.length;
      const variantIds = new Set(fam.variants.filter((v) => v.group === "Variant").map((v) => v.id));
      for (const declared of withSurface) {
        assert.ok(
          variantIds.has(declared.id) || declared.group === "Recipe",
          `family ${atom} declares a parameter surface on variant '${declared.id}', which is no declared Variant row (${[...variantIds].join(", ")}) — the form has no lane to render it on`,
        );
      }
      for (const id of modelIds()) {
        const view = getModel(id);
        if (owningAtom(view.id) !== atom) continue;
        const stamped = (view.defaults as Record<string, unknown>).variant;
        assert.ok(
          typeof stamped === "string" && stamped !== "",
          `route ${id} (family ${atom}, which declares per-variant surfaces) resolves NO variant stamp — the form's lane surface cannot resolve on this route`,
        );
        assert.ok(
          variantIds.has(stamped),
          `route ${id} stamps variant '${stamped}' but family ${atom} declares no such Variant row`,
        );
      }
    }
    // D-M12 (the wall audit, 2026-09-28): `>= 1` let the speaker
    // set shrink to one family (or none, had the grammar died) while
    // the arm's title still claimed the law. The census is exact:
    // ONE family declares per-variant surfaces today (2 -> 1,
    // 2026-10-26, the operator's size-at-quant fold: the 0.6B atom
    // qwen3-tts and the 1.7B atom qwen3-tts-voicedesign merged into
    // THE ONE QWEN FAMILY — customvoice + voicedesign + base ride
    // here as flavor variants, size at the quant cells). And the
    // per-family judgment itself is counted — a loop that skipped
    // every family (a `params` shape change) is an empty pass no
    // more.
    assert.ok(judgedSurfaces >= 2,
      `the surface law JUDGED real variant surfaces (${String(judgedSurfaces)} — a params-shape change that empties the loop is an empty pass)`);
    assert.equal(declaring, 1, "the per-variant surface census (D-M12): families declaring variant surfaces — a deliberate edit, never drift");
  });

  it("every non-empty COMFYUI card ref names a REGISTERED card (the amnesty is over)", async (): Promise<void> => {
    const cards = await cardTable();
    // THE CARD SELECTS THE ATOMS: a boarded id naming no
    // registered atom refuses (caller-owned edge, the dead-ref
    // gate in its caller-side form)
    const known = new Set(modelIds());
    await loadCardDefs();
    const svc = theService();
    for (const cardId of svc.cardIds()) {
      for (const boarded of svc.getCardDef(cardId)?.boarded ?? []) {
        assert.ok(known.has(boarded), `card '${cardId}' boards '${boarded}' — no such atom`);
      }
    }
  });

  it("a default naming no card field refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1, max: 150 }]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("names no field on card"),
    );
  });

  it("an out-of-bounds numeric default refuses LOUD", async (): Promise<void> => {
    // poisoned bounds — the semantics probe, never real data drift
    const cards = await tableWith("image-gen", new Map([["steps", { min: 1000, max: 2000 }], ["width", { min: 1 }, ], ["height", { min: 1 }], ["cfg", { min: 0 }], ["sampler", {}], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("outside card image-gen field bounds"),
    );
  });

  it("an enum miss refuses LOUD", async (): Promise<void> => {
    const cards = await tableWith("image-gen", new Map([["steps", {}], ["width", {}], ["height", {}], ["cfg", {}], ["sampler", { options: ["euler_ancestral"] }], ["scheduler", {}], ["model", {}], ["seed", {}]]));
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, new Map([["image-gen", registryIds()]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("not in card image-gen options"),
    );
  });

  it("a dead card ref refuses LOUD (never a skip)", (): void => {
    const cards: CardDomains = new Map([["some-other-card", new Map()]]);
    // caller-owned form: a caller naming a nonexistent atom refuses
    assert.throws(
      () => validateRegistryAgainstCards(allDecls(), cards, [], new Map([["ghost-caller", ["no-such-atom"]]])),
      (err: unknown): boolean =>
        err instanceof ModelError &&
        String(err.message).includes("no such model registered"),
    );
  });

  it("engine-truth keys skip the card-domain gate (qwen3-tts 'mode')", async (): Promise<void> => {
    // REAL card table: qwen3-tts carries default mode='tts' — no tts
    // card field, but the compose consumes it as run truth (the py
    // ENGINE_TRUTH_KEYS declaration). Without the truth keys the
    // refusal fires; with them the full estate validates CLEAN.
    const cards = await cardTable();
    const boarded = await allBoardings();
    const served = new Set(modelIds());
    // admits rides here TOO — computed first (assert.throws is sync);
    // the arm isolates the ENGINE-TRUTH variable (wd14's admitted
    // checkpoint must not mask the qwen3-tts refusal this test names)
    const admits = await allAdmits()
    assert.throws(
      // ISOLATION ARM, BOTH GATES OPEN-PROOF (2026-10-10): empty
      // truth AND empty admits — wd14's admitted 'checkpoint' (the
      // tagger lane key) is the first thrower, proving ADMITS is
      // what lets lane-consumed keys through the card-domain gate
      // (the same law tts 'mode' now rides). Axis params skip the
      // gate INSIDE the validator (the axisKey law — pinned estate-
      // wide by the contract-law suite's LAW 5).
      () => validateRegistryAgainstCards(allDecls(), cards, [], boarded, served, new Map(), new Map()),
      (err: unknown): boolean =>
        err instanceof ModelError && String(err.message).includes("wd14: default 'checkpoint'"),
    );
    const checked = validateRegistryAgainstCards(allDecls(), cards, ENGINE_TRUTH, boarded, served, allRouteViews(), await allAdmits());
    // the same derived census as the arm above (the flake audit):
    assert.deepEqual(
      checked.map(([mid, cardId]) => `${cardId}<-${mid}`).sort(),
      expectedPairs(boarded, allRouteViews()).sort(),
    );
  });

  it("every served owner is claimed (the catalog offers only runnable atoms)", async (): Promise<void> => {
    // paper §3.2.2 at the catalog plane: a served address no caller
    // boards is an unsatisfiable offer (the 13 hollow models,
    // 2026-09-08 — served, callerless, unrunnable). The unit is the
    // OWNER: variants inherit callers through the model boarding.
    // Unoffered/foreign-engine atoms never serve — this wall and
    // the SERVE LAW read one rule.
    const { buildCatalog } = await import("../../../../packages/engines/comfyui-cordis/src/models/catalogEmission.ts");
    const boarded = await allBoardings();
    const claimed = new Set<string>();
    for (const list of boarded.values()) for (const b of list) claimed.add(b);
    const cat = buildCatalog(modelIds().map((id) => getModel(id)));
    const servedAddr = new Set(Object.keys(cat.models));
    // THE SERVED FLOOR (the walls audit's H8, 2026-10-10): a
    // buildCatalog that returned `{models:{}}` made both loops judge
    // ZERO addresses and pass under a title that claims the catalog
    // offers only runnable atoms. The census states its size.
    // D-M11: the floor became an exact pin — the catalog's address
    // census is a deliberate number, never drift
    assert.equal(servedAddr.size, SERVED_ADDR_CENSUS,
      `the catalog serves its roster (${String(servedAddr.size)} addresses — an emptied catalog passes nothing)`);
    const owners = new Map<string, string[]>();
    for (const addr of servedAddr) {
      const o = [...registryIds()].find((rid) => {
        // THE FAMILY ROW (catalogEmission buildCatalog serves
        // models[decl.id]): a served address equal to a registry id
        // is owned by that family outright — the family owns its
        // own address even when no row routes it (the head claim
        // serves the family id at the table; fold law + plane
        // canon L1, 2026-11-02).
        if (rid === addr) return true;
        const d = registryModel(rid);
        return d.variants.some((v) => v.route === addr || v.cells.some((c) => c.route === addr));
      });
      assert.ok(o !== undefined, `served address '${addr}' has no owning atom`);
      owners.set(o, [...(owners.get(o) ?? []), addr]);
    }
    assert.equal(owners.size, OWNER_ATOM_CENSUS, "the owner walk claimed real atoms (exact census)");
    for (const [o, addrs] of owners) {
      const covered = [o, ...addrs].some((a) => claimed.has(a));
      assert.ok(covered, `served owner '${o}' is claimed by no card (board it or unoffer it — the catalog offers only runnable atoms)`);
    }
  });

  it("the UNSERVED rows are named (gap c, models-against-cards audit 2026-09-28): dead DECL ids cannot appear silently", async (): Promise<void> => {
    // The served-owner arm above is structurally blind to rows the
    // catalog never serves: an id can die (card retired, tool enum
    // moved on) and linger in the registry forever, unwatched. The
    // audit counted 21; the stroke-4 verb families made 23; the F1
    // mask mint makes 24 (the tool lane's family — unoffered, its
    // card binds the action without boarding). 24 -> 7 (2026-10-12,
    // the operator's five-family kill: ace-step, moss, skintokens,
    // ltx-2-3, ltx-director-distilled died fossil-style — the
    // foreign-engine set is now EMPTY, every unboarded row is
    // honestly `unoffered: true`). An 8th silent row refuses; an
    // unoffered flag disappearing from one of the 7 refuses.
    await loadCardDefs();
    const svc = theService();
    const boardedSet = new Set<string>();
    for (const cid of svc.cardIds()) for (const f of svc.getCardDef(cid)?.boarded ?? []) boardedSet.add(f);
    const dead: string[] = [];
    const unoffered: string[] = [];
    const foreign: string[] = [];
    for (const id of registryIds()) {
      if (boardedSet.has(id)) continue;
      dead.push(id);
      const decl = registryModel(id) as { unoffered?: boolean };
      if (decl?.unoffered === true) unoffered.push(id); else foreign.push(id);
    }
    assert.deepEqual(dead, [
      "anycreature", "concat",
      "fit", "gem-soma",
      "mask-select", "skin",
      "somax",
    ], `the unboarded registry rows are the named 7 (saw ${String(dead.length)}: ${dead.join(", ")}) — a death or resurrection is a deliberate edit`);
    // DERIVED (the flake audit): the unoffered rows are the dead rows
    // MINUS the foreign-engine ones — both sets are named right here,
    // so the count is their difference, not a hand-maintained number.
    assert.deepEqual(unoffered, dead.filter((id) => !foreign.includes(id)),
      "every unboarded row is either unoffered or foreign-engine — the split is derived");
    assert.deepEqual(foreign, [],
      `the foreign-engine rows are NONE (saw ${foreign.join(", ")}) — 3 -> 0 (2026-10-12, the operator's five-family kill: ace-step, moss, skintokens died with the sweep); a non-unoffered unboarded row is a silent death`);
  });

  it("provisions are SHAPED rows and the declaring split is named (gap a, the audit 2026-09-28)", async (): Promise<void> => {
    // the old arm checked `name !== ""` only: url/folder could be
    // empty strings, sha256 could be a non-digest, size_bytes
    // negative — every shape lie passed. The grammar pins the row
    // (ProvisionRow); this wall pins the DATA: every declared row
    // carries a non-empty name, an http(s) url, a NON-ABSOLUTE
    // folder under the models root, a 64-hex sha256 when present,
    // and a REQUIRED non-negative size_bytes (audit fix 10).
    // Every real DECL provision row declares its size.
    // A row omitting size_bytes refuses here.
    // The declaring split is
    // EXACT both ways: 19 families declare provisions (2026-11-07: moss-image
    // joins), and the served
    // side of the split is this arm's own census below (declarers∩
    // served, every declarer serves) — the provisioner-catalog carve
    // is enumerated here, not deferred.
    // 2026-10-16, the ghost-tree judgment: 16 -> 17 (transfer_rig's
    // mirrored skin npz row — its lane loads the file kimodo's
    // receipt minted) and 60 -> 61 rows.
    // 2026-11-08, the third edit lane: 19 -> 20 declarers, 72 -> 74
    // rows (fibo2-edit provisions the BF16 Qwen3-VL encoder + the
    // flux2-family VAE; the int8 encoder is deliberately absent —
    // the open upstream bug's seat).
    // 20 -> 21 (burn d, 2026-10-26 — "HOW DOES MODELS WITHOUT
    // FUCKING LINKS GO ALL GREEN?"): wd14 joins — 22 single-file
    // rows (one onnx+csv pair per selectable tagger, off the node's
    // OWN upstream map); florence2 rides the snapshot channel, not
    // provisions.
    const PROVISION_DECLARERS = ["anima", "anny", "fibo2-edit", "flux-klein", "h3", "joytag", "kimodo",
      "krea-2", "mask-select", "moss-image", "music3", "pixal3d", "qwen-img-21", "qwen-img-edit-21",
      "qwen-img-edit-2511", "seedvr2-ema", "transfer-rig",
      "trellis2-native", "wd14", "yue2", "z-image"]; // 2026-11-12: viggle-animate removed (the openjutsu lane deleted, operator order)
    // the rows those families declare, exactly (D-M12: a floor let a
    // family's whole table go unjudged) — 2026-10-12, the ghost-debt
    // landing: 42 -> 59 (17 new rows across 8 families; the dino
    // swap is net-zero); the §4c closing: 59 -> 60 (joytag's
    // model.safetensors, the pack weights the audit ghosted); the
    // ghost-tree judgment: 60 -> 61 (transfer_rig's mirrored npz);
    // the bytes audit: 61 -> 62 (seedvr2_ema's fp8 3B — the pack's
    // DEFAULT_DIT, declarable or the door cannot provision the
    // engine's own default pick)
    // 62 -> 63 (2026-10-18, audit 009/W2: h3's DMAD 4-step distill
    // lora joins the catalog — the paper row, sha pinned)
    // 63 -> 65 (2026-10-22, audit 006/U1: flux-klein provisions the
    // shared split files — the qwen_3_4b tokenizer + the flux2 vae)
    // 65 -> 71 (2026-10-12, the family-owns-downloads order: the
    // mask-select family declares the six weights its lanes load —
    // SAM3/RT-DETR/SAM2 + the three Impact detectors — the operator:
    // "THEY ARE MODELS — THEY SHOULD DOWNLOAD LIKE ALL OTHER MODELS")
    // 71 -> 70 (2026-10-12, the family-kill sweep: rtx-vsr's single
    // 4xNomos2 row dies with its family — the store bytes die too)
    // 70 -> 68 (2026-10-31, the template-fidelity cure): birefnet left
    // pixal3d + trellis2-native — the mask bridge is not in the
    // official template lane, so its provision row is gone per family.
    // 68 -> 69 (2026-10-17, the Singularity checkpoint row): the h3
    // timeline lane's second checkpoint adds its pinned provision.
    // 69 -> 71 (2026-11-07, the operator's drop): moss-image
    // provisions the shared split files — the qwen3.5_9b tokenizer +
    // the flux2 vae (byte-identical to flux-klein's row: same digest,
    // one download serves both lanes).
    // 71 -> 72 (2026-11-08, the drift lock): qwen-img-edit-21's
    // consistency LoRA joins (the AusBoss row, sha256 + size pinned
    // in the DECL) — the Δ4 drift-lock recipe's own download.
    // 74 -> 72 (2026-10-26 machine, the quant cure): h3's unservable
// provisions died — the ref2va pruned dit (its single-shot route is
// retired; no lane can load it) and the b25-49 hybrid alternate
// (nothing references it). Dead disk is not a provision.
// 72 -> 94 (burn d, 2026-10-26): wd14's 22 tagger pairs (the
// engine-side seat the linkability wall refused to bless green).
// 94 -> 95 (2026-10-27, the wave's music3 quant work, 2164b71a3):
// music3 provisions its fp16 dit (minimax_music3_dit_fp16) — the
// int8_convrot cell's family-owns-downloads companion row.
// 95 -> 102 (2026-10-27, the openjutsu lane, feature 023):
// viggle-animate joins as declarer 22 with 7 rows — the INT8 unet,
// the DMD r64 + swap loras, the Fun ControlNet Union 2.0 +
// VDA-Small secondary-path files, the video VAE (h3's digest,
// re-declared: the family owns every weight its lane loads) and the
// frozen text embed (the pack repo's text_cond row).
const PROVISION_ROW_COUNT = 95; // 102→95 2026-11-12: the openjutsu lane deleted (operator order) — viggle-animate's 7 provision rows die
    const declarers: string[] = [];
    let judged = 0;
    for (const id of registryIds()) {
      const rows = (registryModel(id) as { provisions?: Array<Record<string, unknown>> }).provisions ?? [];
      if (rows.length === 0) continue;
      declarers.push(id);
      for (const row of rows) {
        judged++;
        assert.ok(typeof row["name"] === "string" && row["name"] !== "", `${id}: a provision row carries an empty name`);
        assert.match(String(row["url"]), /^https?:\/\//, `${id}/${String(row["name"])}: url is not http(s)`);
        assert.ok(typeof row["folder"] === "string" && row["folder"] !== "" && !String(row["folder"]).startsWith("/"),
          `${id}/${String(row["name"])}: folder must be a non-empty relative path under the models root`);
        if (row["sha256"] !== undefined) {
          assert.match(String(row["sha256"]), /^[0-9a-f]{64}$/, `${id}/${String(row["name"])}: sha256 is not a 64-hex digest`);
        }
        assert.ok(typeof row["size_bytes"] === "number" && row["size_bytes"] >= 0,
          `${id}/${String(row["name"])}: size_bytes is REQUIRED (audit fix 10) — a row omitting it refuses`);
      }
    }
    assert.deepEqual(declarers, PROVISION_DECLARERS,
      `the provision declarers are the named ${String(PROVISION_DECLARERS.length)} (saw ${declarers.join(", ")}) — a family starting or stopping its own provisioning is a deliberate edit`);
    // D-M12 (the wall audit, 2026-09-28): a floor let a whole
    // family's rows go unjudged. The judged row count is EXACT.
    assert.equal(judged, PROVISION_ROW_COUNT,
      `the shape arm judged exactly ${String(PROVISION_ROW_COUNT)} provision rows (saw ${String(judged)}) — ` +
      "a row appearing or leaving a family is a deliberate edit");
    // gap (a)'s OTHER half (the audit, 2026-09-28: "the served families
    // declare none and no wall enumerates the split"): the split is now
    // enumerated exactly — and the 2026-09-28 shape INVERTED: every
    // declarer serves. The served roster is the same modelsService walk
    // the served-owner arm reads; a declarer going dark (or a served
    // family the declarer census missed) MOVES the intersection and is
    // argued here — the provisioner-catalog carve is no longer deferred.
    const servedRoster = new Set(modelsService().modelIds());
    const servingDeclarers = PROVISION_DECLARERS.filter((fam) => servedRoster.has(fam));
    assert.deepEqual(servingDeclarers, PROVISION_DECLARERS,
      `every provision declarer also SERVES (saw ${servingDeclarers.join(", ")}) — a declarer going dark, or the declaring/serving split reopening, is a deliberate edit`);
  });

  // THE MASK DECLARERS CENSUS (superseded MASK-C's seat): MASK-C
  // boarded the region contract on the 2.1 checkpoint + the two edit
  // lanes only, arguing the pure-t2i families' upstream lanes take no
  // region input. THE MASK ORDER (operator 2026-11-07) overruled
  // that: the MASK mod serves on EVERY img-gen model — the generic
  // bareFlavor primitive boards all seven families, and the gen
  // planes stay honest by refusing a stated input_mask loud (the
  // interlock's own arm). The census below is the order's standing
  // wall: a family starting or stopping a mask boarding MOVES it
  // deliberately; deleting a family's mods/mask.ts is the toggle
  // that proves the arm (watch it red).
  it("mask declarers are the named set (THE MASK ORDER: every img-gen family + the edit lanes board the region contract)", () => {
    // THE MASK ORDER (operator 2026-11-07): the MASK mod serves on
    // EVERY img-gen model — the 2.1-only MASK-C roster is history.
    const MASK_DECLARERS = [
      "anima", "fibo2-edit", "flux-klein", "krea-2", "moss-image", "qwen-img-21",
      "qwen-img-edit-21", "qwen-img-edit-2511", "z-image",
    ];
    const declarers: string[] = [];
    for (const id of registryIds()) {
      const mods = ((registryModel(id) as { mods?: Array<string | { pack: string }> }).mods ?? [])
        .map((m) => (typeof m === "string" ? m : m.pack));
      if (mods.includes("mask")) declarers.push(id);
    }
    assert.deepEqual(declarers, MASK_DECLARERS,
      `the mask declarers are the named ${String(MASK_DECLARERS.length)} (saw ${declarers.join(", ")}) — a family starting or stopping its mask boarding is a deliberate edit`);
  });

  // THE UNION WALK'S OTHER HALF (wiring re-audit S1 + the bytes
  // provisions audit, both 2026-10-13): the family arm above walks
  // `registryModel(id).provisions` and pins 62 rows — but the
  // provision DOOR serves provisionsByFamily, whose union adds
  // card-owned rows (IMPACT_DETECTOR_PROVISIONS spread by mask and
  // image-edit, sam3.1/rt_detr inline) and every variant-cell
  // artifact (digest-pinned downloads the 62-row pin never
  // inspects). Those rows were shaped by nobody: a malformed url,
  // a non-hex sha, or a whole card dropping its provisions moved
  // no needle. This arm judges the door's own surface — same shape
  // contract, same exact-census law, one seam (never a second
  // copy of any row).
  it("card-owned rows and variant-cell artifacts are SHAPED and censused (the door's union walk, not just the DECL plane)", async () => {
    const { loadCardDefs, provisionsByFamily } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const byFamily = await provisionsByFamily(await loadCardDefs());
    const families = new Set(modelIds());

    // (1) CARD-PLANE ROWS — an entry whose key is not a model id is
    // a card (CARD_PLANE_ENGINE is "comfyui", so ownership — not
    // the engine string — is the discriminator). The declarer
    // roster is EXACT; every row carries the family arm's shape
    // contract.
    // Audit fix 6 names this registry CARD_PROVISION_DECLARERS.
    const CARD_PROVISION_DECLARERS: string[] = [];
    // 9 -> 15 (2026-10-28, the swap build; video-mask -> person-mask
    // -> track 2026-10-28, the flat-id rename: the suffix law
    // (disclose matches tails by hyphen-suffix) refuses person-mask —
    // it ends in -mask): track declares the
    // mask-select family's 6 rows for the SAM3 video track — the
    // shared-row pattern (the 3 Impact rows already count under both
    // image-edit and mask; shared rows count per declarer).
    const CARD_PROVISION_ROW_COUNT = 15;
    let cardRows = 0;
    for (const [id, view] of Object.entries(byFamily)) {
      if (families.has(id)) continue;
      CARD_PROVISION_DECLARERS.push(id);
      for (const row of view.provisions) {
        cardRows++;
        assert.ok(typeof row.name === "string" && row.name !== "", `${id}: a card provision row carries an empty name`);
        assert.match(String(row.url), /^https?:\/\//, `${id}/${String(row.name)}: url is not http(s)`);
        assert.ok(typeof row.folder === "string" && row.folder !== "" && !String(row.folder).startsWith("/"),
          `${id}/${String(row.name)}: folder must be a non-empty relative path under the models root`);
        if (row.sha256 !== undefined) {
          assert.match(String(row.sha256), /^[0-9a-f]{64}$/, `${id}/${String(row.name)}: sha256 is not a 64-hex digest`);
        }
        assert.ok(typeof row.size_bytes === "number" && row.size_bytes >= 0,
          `${id}/${String(row.name)}: size_bytes is REQUIRED (audit fix 10) — a card row omitting it refuses`);
      }
    }
    assert.deepEqual(CARD_PROVISION_DECLARERS, ["image-edit", "mask", "track"],
      `the card-plane provision declarers are the named 3 (saw ${CARD_PROVISION_DECLARERS.join(", ")}) — a card starting or stopping its own provisioning is a deliberate edit (track serves the mask-select family's rows for the SAM3 video track, 2026-10-28 swap build)`);
    assert.equal(cardRows, CARD_PROVISION_ROW_COUNT,
      `the card plane declares exactly ${String(CARD_PROVISION_ROW_COUNT)} rows (saw ${String(cardRows)}) — a row appearing or leaving a card is a deliberate edit (mask's 3 inline + the 3 Impact detectors it spreads; image-edit's same 3 Impact rows — 6 distinct files, 9 declared rows; + track's 6 mask-select rows, 2026-10-28 swap build)`);

    // (2) VARIANT-CELL ARTIFACTS — the digest-pinned channel the
    // 62-row family pin never inspects (the bytes audit: "the wall
    // pins 62 but the manage plane owns 68"). Every artifact row
    // is shaped; the declarer roster and the counts are EXACT.
    // Audit fix 6 names this registry ARTIFACT_DECLARERS.
    const ARTIFACT_DECLARERS: string[] = [];
    // 21 -> 14, 17 -> 10 (2026-10-12, the operator's five-family
    // kill): ace-step's 4 and moss's 3 per-cell gguf artifacts and
    // their 7 distinct upstream urls die with the families.
    // +1 (2026-10-26 machine, the quant cure): h3's 34 GB non-pruned
    // ConvRot tier boards as a per-cell artifact (the three-member offer).
    const ARTIFACT_ROW_COUNT = 21 - 7 + 5 + 5 + 4 + 1; // +2 (2026-10-23, the operator's turbo call): the qwen 2.1 turbo cells // +2 (2026-10-24, THE 2.1 MATRIX RESHAPE): the edit lane's turbo cells join with the fold // +5 (2026-10-16, the anima three checkpoints): three Bedovyy convrot + two official bf16 // +5 (2026-11-07, the operator's drop): kroma's two turbo quants + kroma-base's dtype-mapped cell, and moss-image's int8 + bf16 pair // +4 (2026-11-08, the third edit lane): fibo2-edit's dev + edit-turbo, each int8_convrot + bf16
    const artifacts: Array<{ id: string; url: string }> = [];
    for (const id of registryIds()) {
      const decl = registryModel(id) as { variants?: Array<{ cells?: Array<{ artifact?: unknown }> }> };
      let familyArtifacts = 0;
      for (const variant of decl.variants ?? []) {
        for (const cell of variant.cells ?? []) {
          const artifact = cell.artifact as Record<string, unknown>;
          if (artifact === undefined || artifact === null) continue;
          if (familyArtifacts === 0) ARTIFACT_DECLARERS.push(id);
          familyArtifacts++;
          assert.match(String(artifact.source_url), /^https?:\/\//,
            `${id}: a variant-cell artifact url is not http(s)`);
          assert.ok(typeof artifact.dest_sub === "string" && artifact.dest_sub !== "" && !String(artifact.dest_sub).startsWith("/"),
            `${id}: artifact dest_sub must be a non-empty relative path`);
          if (artifact.sha256 !== undefined) {
            assert.match(String(artifact.sha256), /^[0-9a-f]{64}$/, `${id}: artifact sha256 is not a 64-hex digest`);
          }
          assert.ok(typeof artifact.size_bytes === "number" && artifact.size_bytes >= 0,
            `${id}: artifact size_bytes is REQUIRED (audit fix 10) — a cell omitting it refuses`);
          artifacts.push({ id, url: String(artifact.source_url) });
        }
      }
    }
    // 2026-10-22, audit 006/U1: flux-klein joins (its two 4B unet
    // cells carry downloadable artifacts — 4 -> 5 declarers)
    // 2026-10-13, the four audio families' URL cures: ace-step and
    // moss join (5 -> 7) — every gguf the two audio lanes load is
    // now a CLI-verified per-cell download
    // 7 -> 5 (2026-10-12, the operator's five-family kill): ace-step
    // and moss died with the sweep.
    // 5 -> 6 (2026-10-16, the anima three checkpoints):
    // base/turbo/aesthetic ride five per-cell downloads (three
    // Bedovyy convrot + two official bf16; base bf16 stays a
    // provisions row).
    // 6 -> 7 (2026-11-08, the third edit lane): fibo2-edit's four
    // cells ride its own repo's four checkpoint urls (no sharing —
    // the Fibo files are its own).
    // 7 -> 8 (2026-10-26 machine, the quant cure): h3's timeline
    // gains the 34 GB non-pruned ConvRot tier as a per-cell
    // artifact (the three-member offer — digest from the HF tree).
    // 8 -> 9: the named roster carries h3.
    assert.deepEqual(ARTIFACT_DECLARERS, ["anima", "fibo2-edit", "flux-klein", "h3", "krea-2", "moss-image", "qwen-img-21", "qwen-img-edit-21", "qwen-img-edit-2511"],
      `the artifact declarers are the named 9 (saw ${ARTIFACT_DECLARERS.join(", ")}) — a family starting or stopping its cell-artifact channel is a deliberate edit`);
    assert.equal(artifacts.length, ARTIFACT_ROW_COUNT,
      `the variant-cell artifact rows are exactly ${String(ARTIFACT_ROW_COUNT)} (saw ${String(artifacts.length)}) — a cell appearing or leaving is a deliberate edit`);
    // deduped by url the same way the union walk dedupes —
    // variants sharing one artifact are ONE download. THE NAMED
    // ROSTER (walls-meta wave-2 pin 1: the 17-7+5 arithmetic and its
    // stacked era comments died — each family's distinct-url count
    // stands as its own named fact, so a change reds with the
    // FAMILY's name, never a sum to re-derive). Distinct-by-url
    // stays honest across the 2026-10-24 reshape: the edit lane's
    // turbo cells ride the SAME two unet urls the t2i family
    // downloads.
    const perFamily: Record<string, Set<string>> = {};
    for (const a of artifacts) (perFamily[a.id] ??= new Set()).add(a.url);
    const roster: Record<string, number> = Object.fromEntries(
      Object.entries(perFamily).map(([id, urls]) => [id, urls.size]),
    );
    assert.deepEqual(roster, {
      "anima": 5,
      // 2026-11-08, the third edit lane: four distinct checkpoint
      // urls — dev + edit-turbo, each int8_convrot + bf16, all its
      // own repo's files.
      "fibo2-edit": 4,
      "flux-klein": 2,
      // 2026-10-26 machine, the quant cure: h3's 34 GB non-pruned
      // ConvRot tier — one per-cell artifact (the three-member offer).
      "h3": 1,
      // 2026-11-07, the operator's drop: krea-2's five cells (turbo +
      // raw int8s + kroma's two turbo quants + the base tier),
      // moss-image's two quants.
      "krea-2": 5,
      "moss-image": 2,
      "qwen-img-21": 4,
      "qwen-img-edit-21": 4,
      "qwen-img-edit-2511": 2,
    } as Record<string, number>,
      `the per-family distinct artifact urls drifted from the named roster (saw ${JSON.stringify(roster)}) — a cell appearing, leaving, or sharing differently is a deliberate edit to THIS roster`);
    // THE CROSS-FAMILY SHARING ROSTER (the fact the old 17-7+5 sum
    // could only gesture at): a url downloaded by MORE THAN ONE
    // family is a deliberate dedup fact, named here by url tail →
    // families. The 2026-10-24 reshape's law lives here: the edit
    // lane's turbo cells ride the SAME two unet urls the t2i family
    // downloads.
    const urlFamilies: Record<string, Set<string>> = {};
    for (const a of artifacts) (urlFamilies[a.url] ??= new Set()).add(a.id);
    const shared: Record<string, string[]> = {};
    for (const [url, fams] of Object.entries(urlFamilies)) {
      if (fams.size > 1) shared[url.split("/").pop() ?? url] = [...fams].sort();
    }
    assert.deepEqual(shared, {
      "qwen_image_2.1_int8_convrot.safetensors": ["qwen-img-21", "qwen-img-edit-21"],
      "qwen_image_2.1_bf16.safetensors": ["qwen-img-21", "qwen-img-edit-21"],
      "qwen_image_2.1_turbo_int8_convrot.safetensors": ["qwen-img-21", "qwen-img-edit-21"],
      "qwen_image_2.1_turbo_bf16.safetensors": ["qwen-img-21", "qwen-img-edit-21"],
    } as Record<string, string[]>,
      `cross-family artifact sharing drifted (saw ${JSON.stringify(shared)}) — a url gaining or losing a second family is a deliberate edit to THIS roster`);
  });

  // THE CLASS WALL (the hunt's F4 cure, 2026-10-12): the census above
  // judges shape and counts — it can never judge OWNERSHIP. This arm
  // walks EVERY provisions-bearing card def (derived roster, never a
  // hand list) and demands the family-owns shape: the owner names a
  // registered family, and every served row is — BY REFERENCE — a row
  // of that family's DECL provisions. A card-authored row (a spread
  // copy of a kit constant, an inline literal) reds here the day it
  // lands, whatever the census counts say.
  it("THE FAMILY OWNS THE DOWNLOADS — every provisions-bearing card serves its owner family's rows by reference", async () => {
    const { loadCardDefs } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const defs = await loadCardDefs();
    const offenders: string[] = [];
    let judged = 0;
    for (const [id, def] of defs) {
      if (!def.provisions || def.provisions.length === 0) continue;
      judged++;
      const owner = def.provisionOwner;
      if (typeof owner !== "string" || owner === "") {
        offenders.push(`${id}: no owner family stamped — the rescue would name the CARD id through the door the operator's order killed`);
        continue;
      }
      if (!modelIds().includes(owner)) {
        offenders.push(`${id}: owner '${owner}' is not a registered family`);
        continue;
      }
      const familyRows = (registryModel(owner) as { provisions?: Array<{ name: string }> }).provisions ?? [];
      for (const row of def.provisions) {
        if (!familyRows.includes(row as { name: string })) {
          offenders.push(`${id}: row '${String(row.name)}' is not a row of its owner family '${owner}' — a card-authored copy (the PROOF-14 class crime)`);
        }
      }
    }
    assert.ok(judged >= 2, `the walk judged the provisions-bearing cards (judged ${String(judged)})`);
    assert.deepEqual(offenders, [],
      "every provisions-bearing card serves its OWNER FAMILY's rows by reference — card-authored rows die here");
  });

  it("mods flavor source_urls are operator-supplied and never provisioned (audit fix 7, option b)", async () => {
    // THE MODS FATE (2026-10-17, model-families audit fix 7).
    // The 20 krea-2 + z-image flavor rows look provisioned and are not.
    // H3 folds its loras into DECL.provisions (the in-tree precedent).
    // Krea-2 and z-image take the audit's option b instead.
    // Their rows are operator-supplied picker vocabulary.
    // Their source_url is provenance documentation.
    // The estate never fetches them.
    // This arm proves the split both ways.
    // No mods source_url rides the provision union.
    // Both krea-2 cell artifacts do ride it.
    const { KREA_ROWS } = await import(
      "../../../../packages/models/krea-2/mods/loras.ts"
    );
    const { ZIMAGE_ROWS } = await import(
      "../../../../packages/models/z-image/mods/loras.ts"
    );
    const { ZIMAGE_CONTROLNET_ROWS } = await import(
      "../../../../packages/models/z-image/mods/controlnet.ts"
    );
    const modsUrls = new Set<string>([
      ...(KREA_ROWS as Array<{ source_url: string }>).map((r) => r.source_url),
      ...(ZIMAGE_ROWS as Array<{ source_url: string }>).map((r) => r.source_url),
      ...(ZIMAGE_CONTROLNET_ROWS as Array<{ source_url: string }>).map((r) => r.source_url),
    ]);
    assert.equal(modsUrls.size, 20,
      `the mods flavor rows name exactly 20 distinct source_urls (saw ${String(modsUrls.size)}) — a flavor row appearing or leaving is a deliberate edit`);
    const { loadCardDefs: loadDefs, provisionsByFamily: byFamily } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const union = await byFamily(await loadDefs());
    const unionUrls = new Set<string>();
    for (const view of Object.values(union)) {
      for (const row of view.provisions) unionUrls.add(row.url);
    }
    const leaked = [...modsUrls].filter((u) => unionUrls.has(u));
    assert.deepEqual(leaked, [],
      `mods flavor source_urls are operator-supplied, never provisioned (leaked into the union: ${leaked.join(", ")})`);
    for (const id of ["krea-2"] as const) {
      for (const row of union[id]?.provisions ?? []) {
        assert.ok(!modsUrls.has(row.url),
          `${id}: union row ${row.name} is a mods URL — the channels crossed`);
      }
    }
    const kreaUnion = new Set((union["krea-2"]?.provisions ?? []).map((r) => r.url));
    assert.ok(kreaUnion.has("https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors"),
      "krea-2 turbo artifact rides the union (it IS a provision row)");
    assert.ok(kreaUnion.has("https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_raw_int8_convrot.safetensors"),
      "krea-2 raw artifact rides the union (it IS a provision row)");
  });

  it("THE POSITIVE JOIN (contract-gap audit A6, 2026-11-07): every h3 catalog row the studio serves resolves to a provision artifact of its own family — the picker never offers an undownloadable distill", async () => {
    // A6's shape: the negative walls above judge what IS declared
    // (shape, counts, ghost weights, the family-owns reference law);
    // nothing judged the POSITIVE direction — every mods-catalog row
    // a studio serves must be resolvable to its family's provision
    // artifact, or the operator picks a distill the estate can never
    // obtain (the dead-pick class: all-green walls, dead door). The
    // arm rides the real DECL + the real catalog (never a roster):
    // h3 is the estate's catalog-folded family (mods/loras.ts rows
    // ARE provision rows by filename); krea-2/z-image are the
    // operator-supplied carve (their source_urls are provenance, the
    // arm above pins they leak into NO union).
    const { H3_LORA_ROWS } = await import(
      "../../../../packages/models/h3/mods/loras.ts"
    );
    const familyRows = (registryModel("h3") as { provisions?: Array<{ name: string }> }).provisions ?? [];
    assert.ok(
      H3_LORA_ROWS.length > 0 && familyRows.length > 0,
      "the h3 catalog or its provisions table is empty — the positive join would pass vacuously",
    );
    const offenders: string[] = [];
    for (const row of H3_LORA_ROWS as ReadonlyArray<{ id: string; filename: string }>) {
      const base = row.filename.split("/").pop() ?? row.filename;
      if (!familyRows.some((p) => p.name === base)) {
        offenders.push(`${row.id}: catalog row '${base}' is declared by NO h3 provision row — the studio serves an undownloadable distill`);
      }
    }
    assert.deepEqual(offenders, [],
      "every catalog row resolves to a provision artifact (the positive catalog→provisions join, audit A6):\n" + offenders.join("\n"));
  });

  it("fieldDomains extracts schemastery min/max/options", (): void => {
    // schemastery truth (probed 2026-09-08): the union's
    // alternatives live at .list (NODE level), each const carries
    // .value — .meta.list/.meta.const was the pre-probe fiction
    const domains = fieldDomains({
      steps: { type: "number", meta: { min: 1, max: 150, default: 30 } },
      pick: {
        type: "union",
        list: [{ value: "a" }, { value: "b" }, null],
      },
      plain: { type: "string" },
    } as never);
    assert.deepEqual(domains.get("steps"), { min: 1, max: 150 });
    assert.deepEqual(domains.get("pick"), { options: ["a", "b"] });
    assert.deepEqual(domains.get("plain"), {});
  });
});

// ── THE SCHEMA/INTERFACE AGREEMENT (2026-10-10, the census's C3) ──
// Every DECL row was written twice — a hand-written interface (what
// an author may write) and a schemastery schema (what registration
// accepts) — and the two disagreed in both directions. The failure
// mode is specific and expensive: a hand-written DECL that compiles
// is REFUSED at boot, and the schema fills `{}`/`[]`/""` where the
// interface forbids those values. The wall below is the law's
// runtime half: every optional key omitted must still resolve.
describe("the schema/interface agreement", () => {
  it("every row's MINIMAL form resolves (an optional key is optional in the schema too)", () => {
    assertSchemaAcceptsMinimalRows();
  });

  it("a real, hand-written DECL registers (the census's breaking input)", () => {
    // the exact shape the census named: a source with no note, a
    // cell with no source/vram/artifact, a variant with no order,
    // envelope, wire defaults, params or relations, a provision with
    // no digest or size, a model row with none of the has_* flags.
    // THE REGISTRY GATE ITSELF: register a hand-written DECL through
    // registerFamily (the same path every real family takes) and
    // require it to be ACCEPTED.
    const svc = modelsService();
    const decl = {
      id: "agreement-probe",
      label: "Agreement probe",
      genre: "image",
      form: "image",
      engine: "comfyui",
      source: { repo_id: "Comfy-Org/Probe", filename: "probe.safetensors" },
      variants: [
        {
          id: "v",
          label: "V",
          group: "Variant",
          route: "agreement-probe",
          cells: [{ quant: "bf16", label: "BF16" }],
        },
      ],
      // the axis the row rides is declared (plane canon L2,
      // 2026-11-02) — the arm judges the registration lifecycle,
      // never the canon.
      variant_groups: [{ id: "Variant", label: "Variant" }],
    };
    // D-C6 (the wall audit, 2026-09-28): the probe used to register,
    // assert NOTHING, and never withdraw (the disposer was discarded
    // into an empty finally) — a registerFamily that threw silently
    // or swallowed the row passed the arm. The full lifecycle is
    // pinned now: absent -> register -> PRESENT -> dispose -> absent,
    // and the duplicate-id refusal is its own arm.
    assert.ok(!svc.registryIds().includes("agreement-probe"),
      "the probe's id is not in the registry before the test (a stale probe from an earlier un-withdrawn run is its own failure)");
    const dispose = svc.registerFamily(decl as never);
    assert.ok(svc.registryIds().includes("agreement-probe"),
      "registerFamily ACCEPTED the hand-written minimal DECL (it is in the registry now)");
    assert.equal(svc.registryModel("agreement-probe").id, "agreement-probe",
      "the registered row reads back by id");
    dispose();
    assert.ok(!svc.registryIds().includes("agreement-probe"),
      "the disposer withdrew the probe (the registry is not a test fixture's ashtray)");
  });

  it("registerFamily refuses a duplicate id LOUD (the one-owner interlock)", () => {
    const svc = modelsService();
    const decl = {
      id: "agreement-probe-dup",
      label: "Dup probe",
      genre: "image",
      form: "image",
      engine: "comfyui",
      source: { repo_id: "Comfy-Org/ProbeDup", filename: "probe-dup.safetensors" },
      variants: [
        { id: "v", label: "V", group: "Variant", route: "agreement-probe-dup", cells: [{ quant: "bf16", label: "BF16" }] },
      ],
      // the axis the row rides is declared (plane canon L2,
      // 2026-11-02) — the arm judges the interlock's voice, never
      // the canon.
      variant_groups: [{ id: "Variant", label: "Variant" }],
    };
    const dispose = svc.registerFamily(decl as never);
    try {
      assert.throws(
        () => svc.registerFamily(decl as never),
        /registered twice|one owner per model id/,
        "the duplicate id refuses with the interlock's voice",
      );
    } finally {
      dispose();
    }
    assert.ok(!svc.registryIds().includes("agreement-probe-dup"), "the dup probe withdrew");
  });
});

// ── requires ≡ union(requiresByFamily) (the card-plane audit's H4) ──
// Two cards maintained BOTH a flat `requires` list and a per-family
// map, documented as "the flat list carries the UNION" — by hand,
// with nothing pinning them equal. A family pack added to one and not
// the other either starves a flat consumer or over-claims a pack the
// family never declared. The law is now a wall.
describe("requires is the union of requiresByFamily", () => {
  it("every real card's flat requires IS the union of its family map", async () => {
    await loadCardDefs();
    const svc = theService();
    let compared = 0;
    for (const cardId of svc.cardIds()) {
      const def = svc.getCardDef(cardId) as {
        requires?: readonly string[]
        requiresByFamily?: Record<string, readonly string[]>
      };
      if (def.requiresByFamily === undefined) continue;
      compared++;
      const union = [...new Set(Object.values(def.requiresByFamily).flat())].sort();
      const flat = [...(def.requires ?? [])].sort();
      assert.deepEqual(flat, union,
        `card ${cardId}: the flat 'requires' must BE the union of its requiresByFamily ` +
        `(flat: ${flat.join(', ') || '—'}; union: ${union.join(', ') || '—'}) — ` +
        `they are maintained by hand and a mismatch either starves a flat consumer ` +
        `or over-claims a pack the family never declared`);
    }
    // THE COMPARED FLOOR (the walls audit's row 8, 2026-10-10): the
    // arm skipped every card without a requiresByFamily table — a
    // rename that emptied the column made it a silent pass. The
    // exact count is pinned (THREE cards carry the table today —
    // the h3 lineage's two plus image-gen's qwen-img-21 Impact slice
    // (MASK-C, the image-gen region gap): a third card is a
    // deliberate edit, and a rename that empties the column is a
    // red wall.
    assert.equal(compared, 3,
      `the H4 union arm compared real cards (got ${String(compared)} — a further requiresByFamily table is a deliberate edit, an emptied column is a rename)`);
  });
});

// ── THE CURATION-SUBSET LAW (the census's H2) ──
// A card may CURATE a subset of the engine's vocabulary (the film
// card recommends eleven samplers) — but it must READ the members
// from the single SSOT, never retype them, or a regen of the engine
// list (regen-vocab.ts owns that file) leaves the card stale.
describe("curated vocabulary subsets derive from the engine SSOT", () => {
  it("the film card's recommended samplers all exist in the kit's vocabulary", async () => {
    const { SAMPLER_OPTIONS } = await import(
      "../../../../packages/engines/comfyui-card-kit/src/vocab.ts"
    );
    const src = readFileSync(
      "packages/models/h3/src/schema.ts",
      "utf8",
    );
    const named = src.match(/const H3_RECOMMENDED_SAMPLERS = \[([\s\S]*?)\] as const/);
    assert.ok(named !== null, "the film's recommended list is named (curation is visible)");
    // CODE lines only — a comment may NAME a sampler in prose
    const code = named![1]!.split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    const members = [...code.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    // D-M10 (the wall audit, 2026-09-28): `> 0` was the floor that
    // let dead code pass (the card could stop READING the list and
    // the wall stayed green on the comment's prose). THE NAMED
    // ROSTER (walls-meta wave-2 pin 5: the magic 11 died — the
    // curation's identity IS these names, so a gutting, a growth,
    // or a rename reds with the NAME, and the membership arm below
    // keeps every name inside the engine's SSOT).
    assert.deepEqual(members, [
      "euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun",
      "res_multistep", "res_multistep_cfg_pp", "er_sde", "seeds_2", "seeds_3",
    ],
      `the film's curated sampler roster drifted (saw ${members.join(", ")}) — the curation is deliberate: edit THIS roster, never silently`);
    for (const name of members) {
      assert.ok(
        (SAMPLER_OPTIONS as readonly string[]).includes(name),
        `the film card recommends sampler '${name}', which the engine vocabulary does not carry — ` +
        `the subset must be filtered FROM the SSOT (the card's own vocabulary() call does that; ` +
        `this wall fails when a name is curated that the engine has dropped)`,
      );
    }
    // and the card really does derive rather than retype
    assert.ok(
      src.includes("SAMPLER_OPTIONS.filter"),
      "the card's sampler vocabulary DERIVES from the SSOT (a retyped list is a second SSOT)",
    );
  });
});

// ── THE DECLARATION MEMBERS THAT CLAIM SOMETHING (2026-10-10, the
// design audit's Q5: `accepts` is declared and read only by the
// catalog; `base_body` has one declarer and no reader; `canvas_default`
// is read with `find`, so two declarers means first-match-wins with no
// wall) ────────────────────────────────────────────────────────────
describe("the DECLARATION claims are declared AND consumed", () => {
  it("canvas_default has at most ONE declarer (the reader is a find)", async () => {
    await loadCardDefs();
    const declarers: string[] = [];
    for (const fam of registryIds()) {
      const decl = registryModel(fam) as { canvas_default?: boolean };
      if (decl?.canvas_default === true) declarers.push(fam);
    }
    // finding 9 (2026-09-28): `<= 1` allowed ZERO — krea-2 dying
    // silently left the canvas with no default family. The sole
    // declarer is EXACT: krea-2.
    assert.deepEqual(declarers, ["krea-2"],
      "canvas_default is READ by a find (first match wins) and its sole declarer is krea-2 — two declarers are an undeclared preference, zero is a canvas with no default (saw: " +
      declarers.join(", ") + ")");
  });

  it("base_body stays DEAD (a declarer nobody reads is a claim nothing keeps)", () => {
    // D-C7 (the wall audit, 2026-09-28): the arm counted the
    // DECLARER as its own reader (anny's index.ts hit the grep) —
    // it could never fail while the lie lived. The kill is real
    // now: the member left both the grammar and anny's DECL (the
    // parametric neutral bake superseded the GLB staging). The pin
    // is reintroduction-shaped: if ANY family declares base_body
    // again, a READ-shaped consumer (a `.base_body` access outside
    // the grammar, the specs, and the declaring file) must exist,
    // or this wall fails.
    // the scans are SHAPE-based, comment-immune: a declaration is
    // the key with a colon (code, never prose), a reader is the
    // member access `.base_body`. Both run over code with line
    // comments stripped so the kill's own epitaph cannot trip it.
    const codeOf = (path: string): string =>
      readFileSync(path, "utf8").split("\n")
        .filter((l: string) => !l.trim().startsWith("//"))
        .join("\n");
    const all = execGrep("base_body", ["packages/"], [
      "comfyui-card-kit/src/model-contract.ts", // the grammar
      ".spec.ts",
      "schema.d.ts",
    ]);
    const declarers = all.filter((f: string) => /^\s*"base_body"\s*:/m.test(codeOf(f)));
    const readers = all.filter((f: string) => /\.base_body\b/.test(codeOf(f)));
    assert.ok(readers.length === 0,
      "base_body has read-shaped consumers (" + readers.join(", ") + ") — un-kill this member deliberately: restore the grammar row, the declaring family, and this wall");
    assert.ok(declarers.length === 0,
      "base_body is declared again (" + declarers.join(", ") + ") with no read-shaped consumer — " +
      "a claim nothing keeps (the design audit's Q5; the D-C7 kill)");
  });

  it("the fetch hint is a NAME MATCH, proven on a real miss (D-C9)", async () => {
    // the audit: lanePresenceMiss builds its download hint by
    // matching p.name === miss.name — the wall only asserted
    // non-empty names, so a provisions row whose name DIFFERED from
    // the lane file dropped the hint silently and the arm stayed
    // green. The join is proven behaviourally now: a probe family
    // whose lane file is ABSENT (empty models root) misses, and the
    // hint appears ONLY when a provisions row carries the exact
    // name — a same-family row naming a different file never feeds
    // the hint.
    await loadCardDefs();
    const { lanePresenceMiss } = await import(
      "../../../../packages/harness/estate-queue/src/cardsLanes.ts"
    );
    const svc = modelsService();
    const base = {
      label: "Hint probe",
      genre: "image",
      form: "image",
      engine: "comfyui",
      source: { repo_id: "Comfy-Org/HintProbe", filename: "hint-probe.safetensors" },
    };
    const declWith = (provisions: Array<{ name: string; url: string }>) => ({
      ...base,
      id: "lane-hint-probe",
      lane_inputs: { unet: "probe-weights.safetensors" },
      // every provision row is a LAW row now: folder + sha256 are
      // required at registration (T-S3) — the probe states both so
      // the arm exercises the hint join, not the schema refusal.
      provisions: provisions.map((p) => ({
        ...p,
        folder: "models",
        sha256: "a".repeat(64),
      })),
      variants: [
        { id: "v", label: "V", group: "", route: "lane-hint-probe", cells: [{ quant: "bf16", label: "BF16" }] },
      ],
    });
    // an empty models root: every lane file misses
    const emptyRoot = mkdtempSync(join(tmpdir(), "hint-probe-root-"));
    const prevRoot = process.env["MELITE_REPO_ROOT"];
    process.env["MELITE_REPO_ROOT"] = emptyRoot;
    try {
      // 1. the EXACT match feeds the hint
      const disposeExact = svc.registerFamily(declWith([
        { name: "unrelated-extra.txt", url: "https://example.test/extra.txt" },
        { name: "probe-weights.safetensors", url: "https://example.test/probe.safetensors" },
      ]) as never);
      try {
        const miss = lanePresenceMiss("lane-hint-probe");
        assert.ok(miss !== null, "the absent lane file misses (the probe family's unet is not on disk)");
        assert.match(String((miss as { message?: string }).message), /lane presence/,
          "the miss names the law (lane presence)");
        assert.match(String((miss as { message?: string }).message), /fetch it: https:\/\/example\.test\/probe\.safetensors/,
          "the hint rides the EXACTLY-matching provisions row");
        assert.doesNotMatch(String((miss as { message?: string }).message), /extra\.txt/,
          "a provisions row naming a DIFFERENT file never feeds the hint");
      } finally {
        disposeExact();
      }
      // 2. no matching row: the miss stands WITHOUT a hint (and that
      //    absence is named — never a silent fallback to some other row)
      const disposeNoMatch = svc.registerFamily(declWith([
        { name: "a-different-file.safetensors", url: "https://example.test/other.safetensors" },
      ]) as never);
      try {
        const miss = lanePresenceMiss("lane-hint-probe");
        assert.ok(miss !== null, "the miss still fires without a matching provision");
        assert.doesNotMatch(String((miss as { message?: string }).message), /fetch it/,
          "no exact name match means NO hint — the join is a name match, not a family-level guess");
      } finally {
        disposeNoMatch();
      }
    } finally {
      if (prevRoot === undefined) delete process.env["MELITE_REPO_ROOT"];
      else process.env["MELITE_REPO_ROOT"] = prevRoot;
    }
    assert.ok(!svc.registryIds().includes("lane-hint-probe"), "the probe withdrew");
  });
});

// ── THE BOUNDS-SANITY WALL (li-aq.3, the rules audit's M-5): the
// z tier cannot self-police a bound row (schemastery 3.18 carries
// no refine), so the family-law wall judges what the schema cannot:
// an EMPTY row ({}) is a typo that would silently REPLACE a live
// family floor with dead air; a bound for a field the declaration
// never surfaced is dead air nobody judges; an inverted row (min >
// max) refuses everything. Every DECL, both layers, every row.
describe("THE BOUNDS-SANITY WALL (every declared numeric row is real, surfaced, and ordered)", () => {
  it("no empty row, no off-surface key, no inverted span — family and variants alike", () => {
    const offenders: string[] = [];
    // D-C8 (the wall audit, 2026-09-28): every arm inside the loop
    // was a continue/return — a bounds tree that never reached a
    // judge (all families losing their bounds at once) passed with
    // zero judgments. The judged count is pinned now.
    let judged = 0;
    let judgedFamilies = 0;
    for (const id of modelIds()) {
      let decl: unknown;
      try { decl = getModel(id); } catch { continue; }
      if (decl === null || typeof decl !== "object") continue;
      const d = decl as {
        params?: string[];
        bounds?: Record<string, { min?: number; max?: number }>;
        variants?: { id: string; params?: string[]; bounds?: Record<string, { min?: number; max?: number }> }[];
      };
      const familySurface = new Set(d.params ?? []);
      const judge = (layer: string, surface: ReadonlySet<string>, bounds: Record<string, { min?: number; max?: number }> | undefined): void => {
        if (bounds === undefined) return;
        judgedFamilies++;
        for (const [field, row] of Object.entries(bounds)) {
          judged++;
          if (!surface.has(field)) {
            offenders.push(`${id}/${layer}: bounds name '${field}', which ${layer === "family" ? "the family surface" : `variant ${layer}'s surface`} does not declare — dead air no seat judges (drop the row or surface the field)`);
          }
          const stated = Object.values(row ?? {}).filter((v) => v !== undefined).length;
          if (row === null || typeof row !== "object" || stated === 0) {
            offenders.push(`${id}/${layer}: bounds['${field}'] is an EMPTY row — neither endpoint is a typo, not a law (state min, max, or both; an empty row silently replaces a live family floor)`);
          }
          if (typeof row?.min === "number" && typeof row?.max === "number" && row.min > row.max) {
            offenders.push(`${id}/${layer}: bounds['${field}'] inverts its span (min ${row.min} > max ${row.max}) — the row refuses everything`);
          }
        }
      };
      judge("family", familySurface, d.bounds);
      for (const v of d.variants ?? []) {
        const variantSurface = new Set([...familySurface, ...(v.params ?? [])]);
        judge(v.id, variantSurface, v.bounds);
      }
    }
    assert.deepEqual(offenders, [], offenders.join("\n"));
    // gap b (the audit, 2026-09-28): floors became the EXACT
    // census. 2026-11-08, THE LATENT LAW: the resolution bounds
    // retired — no edit lane takes a stated size, so the size rows
    // left both DECLs. The SOLVER span returned the same day
    // (steps [1,50] on both edit lanes — KSampler steps beyond the
    // edit narrowing is the washed-out-edit burn), so the census
    // judged 9 ids: qwen-img-edit-21 (family + 2 flat routes) and
    // qwen-img-edit-2511 (family + 5 variants), one row each. A
    // row appearing or leaving moves the numbers and argues here.
    // 9 -> 16 (2026-11-08, the third edit lane): fibo2-edit's
    // family row + its 6 lane routes all carry the same solver
    // span (the routes ride the family bounds row).
    assert.equal(judgedFamilies, 16,
      `the bounds census is EXACT: the edit lanes' solver span over their 16 route ids (saw ${String(judgedFamilies)})`);
    assert.equal(judged, 16,
      `the bounds row census is exact (saw ${String(judged)} — a schema change that empties a bounds table is a deliberate edit, never silent)`);
  });

  it("the bounds ROWS reach their consumers (gap b): judgeLaneBounds refuses out-of-span with the DECL's own spans", async (): Promise<void> => {
    // the census above pins the DATA; this arm pins the WIRING —
    // the consumers (laneBoundsOf + judgeLaneBounds, the registry's
    // judge at cardsRegistry.ts) were referenced by no wall. The
    // edit lanes' live solver rows are driven through the REAL
    // judge: an in-span value passes, each endpoint's violation
    // refuses IN THE FIELD'S VOICE; the MERGE consumer composes a
    // variant layer over the family row per-endpoint (the nearer
    // layer wins — no estate variant carries bounds today, so the
    // merge drives over a synthetic layer shaped like a DECL
    // variant).
    const { judgeLaneBounds, laneBoundsOf } = await import(
      "../../../../packages/web-kit/contracts/src/laneRelations.ts"
    );
    const decl = registryModel("qwen-img-edit-21") as {
      bounds?: Record<string, { min?: number; max?: number }>;
    };
    assert.ok(decl.bounds !== undefined, "qwen-img-edit-21 lost its solver span — the write door's domain judge starves (see the census above)");
    const field = Object.keys(decl.bounds)[0]!;
    const row = decl.bounds[field]!;
    // the full judge contract on the family row
    if (row.min !== undefined) {
      assert.equal(judgeLaneBounds(decl.bounds ?? {}, { [field]: row.min - 1 }).length > 0, true,
        `an under-span ${field} refuses through the real judge`);
    }
    if (row.max !== undefined) {
      assert.equal(judgeLaneBounds(decl.bounds ?? {}, { [field]: row.max + 1 }).length > 0, true,
        `an over-span ${field} refuses through the real judge`);
    }
    const inSpan = row.min !== undefined ? row.min : row.max;
    assert.deepEqual(judgeLaneBounds(decl.bounds ?? {}, { [field]: inSpan }), [],
      `an in-span ${field} passes clean through the real judge`);
    // the MERGE consumer: a variant with bounds composes over the
    // family row per-endpoint (a variant ceiling tightens without
    // dropping the family floor)
    // the MERGE consumer: a variant layer composes over the family
    // row per-endpoint (a variant ceiling tightens without dropping
    // the family floor). No estate variant carries bounds today, so
    // the merge drives over a synthetic DECL-shaped layer — the
    // consumer is a pure function of its two rows.
    const variantLayer = { id: "tightened", bounds: { [field]: { min: 4, max: 20 } } };
    const merged = laneBoundsOf(decl.bounds ?? {}, variantLayer.bounds);
    assert.ok(merged !== null, "the merge consumer returned null over two live rows");
    const m = merged![field]!;
    assert.equal(m.min, 4, `variant ${variantLayer.id}/${field}: the merged floor is the variant's (the nearer layer wins)`);
    assert.equal(m.max, 20, `variant ${variantLayer.id}/${field}: the merged ceiling is the variant's (the nearer layer wins)`);
    const untouched = laneBoundsOf(decl.bounds ?? {}, {});
    assert.deepEqual(untouched, decl.bounds ?? {}, "a bounds-less variant leaves the family row untouched");
  });
});

describe("THE TWO-HOMES BOUNDS-SYNC WALL (card schema == action ParamSpec, every shared name)", () => {
  // F3 (the atom-vocabulary audit): every knob's bounds live in BOTH
  // the card z.object and the family's action ParamSpec rows, hand-
  // kept in sync — a card-only change had zero walls. The join is
  // the card's `boarded` list (the card selects families; admits is
  // the model-admission list, a different thing) over every action
  // param row whose name is a field of the boarding card. A side a
  // plane does not declare reads as unbounded: undefined card min
  // and a missing bounds[0] both normalize to -MAX, undefined max
  // to +MAX (the grammar's bounds is a closed tuple, so "no
  // ceiling" is expressed as MAX_SAFE_INTEGER — the value the card
  // schema serves for any finite input above its floor).
  const MAX = Number.MAX_SAFE_INTEGER;
  const norm = (min: number | undefined, max: number | undefined): readonly [number, number] =>
    [min ?? -MAX, max ?? MAX];

  it("every shared name's numeric bounds and enum options agree on both planes", async () => {
    await loadCardDefs();
    const defs = await loadCardDefs();
    const domains = new Map<string, ReturnType<typeof fieldDomains>>();
    for (const [id, def] of defs) {
      const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? (def as { schema?: unknown }).schema;
      const dict = (carrier as { dict?: Record<string, never> } | undefined)?.dict;
      if (dict === undefined) continue;
      domains.set(id, fieldDomains(dict));
    }
    let pairs = 0;
    let cards = 0;
    const offenders: string[] = [];
    for (const [cardId, def] of defs) {
      const dom = domains.get(cardId);
      const boarded = (def as { boarded?: readonly string[] }).boarded;
      if (dom === undefined || boarded === undefined || boarded.length === 0) continue;
      cards++;
      for (const fam of boarded) {
        let decl;
        try { decl = getModel(fam); } catch { continue; } // pattern boardings (ctx_*) are not family DECLs
        for (const action of decl.actions ?? []) {
          for (const row of action.params) {
            const d = dom.get(row.name);
            if (d === undefined) continue; // not a shared name (lane-typed inputs stay family-owned)
            pairs++;
            if (row.type === "number") {
              const want = norm(d.min, d.max);
              const got = norm(row.bounds?.[0], row.bounds?.[1]);
              if (want[0] !== got[0] || want[1] !== got[1]) {
                offenders.push(`${cardId}/${fam}/${action.id} ${row.name}: card [${want[0]}, ${want[1]}] vs action [${got[0]}, ${got[1]}]`);
              }
            }
            if (row.type === "enum" && row.options !== undefined) {
              const want = [...(d.options ?? [])].sort().join("\u0000");
              const got = [...row.options].sort().join("\u0000");
              if (want !== got) {
                offenders.push(`${cardId}/${fam}/${action.id} ${row.name}: enum options differ (card ${d.options?.length ?? 0} vs action ${row.options.length})`);
              }
            }
          }
        }
      }
    }
    // The census pin: an accidental join-break (boarded renamed,
    // domains hollowed) must fail LOUD, not pass vacuous. Update
    // these numbers deliberately when a card boards a new family or
    // a family joins a card's surface.
    // 2026-10-12: 617 -> 625, the img-to-mesh sign-mode separation
    // knobs (four booleans across two boarded families — pixal3d and
    // trellis2-native each carry the quartet on their ParamSpec)
    // 2026-10-18: 625 -> 626, the h3 ref_mods seat (audit 010/R1's
    // S2 cure) joins the film ParamSpec beside its card-schema twin
    // (an image_list pair — no bounds/enums to sync, offenders empty)
    // 2026-10-21: 626 -> 627, the quad-remesh preset budget class
    // (the af-move cure) joins the autoremesher action's ParamSpec
    // beside its card-schema twin (a string-enum pair — offenders
    // empty)
    // 2026-10-22: 627 -> 628, audit 004/C4: image-gen's
    // reference_images seat joins the qwen-img-21 t2i action's
    // ParamSpec beside its card-schema twin (an image_list pair —
    // no bounds/enums to sync, offenders empty)
    // 2026-10-22: 628 -> 638, audit 006/U1: the flux-klein t2i
    // action's full ParamSpec joins (the nine diffusion rows + the
    // reference_images seat — every shared name syncs its bounds and
    // enums against the card schema, offenders empty)
    // 13 -> 12 (2026-10-13, the autoremesher excision — the pack the owner removed from the system): the quad-remesh card left the boarded set.
    // 12 -> 13 (2026-10-27, the openjutsu lane, feature 023): the
    // openjutsu card joins — the animate action's ParamSpec rows sync
    // against the card schema (seed minted via the seed-sentinel rule,
    // euler fixed, offenders empty).
    // 13 -> 12 (2026-11-12): the openjutsu card deleted by operator
    // order — it boarded viggle-animate; the family died with it.
    assert.equal(cards, 12, "the boarded-cards census changed — update this pin deliberately");
    // RE-PINNED DOWN (same closeout order): the emptied field took
    // two shared-name pairs with it.
    // 636 -> 629 (2026-10-13, the autoremesher excision): the
    // quad-remesh card/autoremesher action's five shared-name pairs
    // (preset, target_quads, sharp_edge, input and the rest of the
    // remesh surface) leave with the pack the owner removed.
    // 629 -> 631 (2026-10-22, audit 004/C4): reference_images pairs
    // on both t2i adopters the wall pins with the tail row
    // (qwen-img-21 and flux-klein).
    // 631 -> 655 (2026-10-26, the operator's size-at-quant fold):
    // the tts card boards 5 addresses, not 4 (THE ONE QWEN FAMILY +
    // its four surviving routes: customvoice, voicedesign-design,
    // voicedesign-base, and the base-0_6b cell — old board was two
    // families + two routes). Each boarded address contributes its
    // family's two actions × twelve shared names (every speak/export
    // row but voice_name, which is action-only) = 24 pairs; one more
    // surviving address is +24 with offenders empty.
    // 655 -> 657 (2026-10-13, the match toggle): the image-edit
    // card's match_input_resolution joins both edit actions'
    // ParamSpecs beside its card-schema twin (a boolean pair each —
    // no bounds/enums to sync, offenders empty).
    // 657 -> 655 (2026-10-31, the template-fidelity cure): bg_removal
    // left pixal3d + trellis2-native (the mask bridge is not in the
    // official template lane) — one shared name per family departs.
    // 655 -> 654 (2026-11-06, the film-prompt completion): h3's
    // film-level prompt pair departs with the operator-ordered
    // removal (storm wave 6 took the schema side; the DECL surface
    // drops it here) — offenders empty, argued here.
    // 654 -> 655 (2026-10-16 late, this session's archaeology):
    // scale_model's pair arrives with 8ccd5d7fe (card dict seat +
    // models/input action spec row `name: "scale_model", type:
    // "enum", options: [...SCALE_MODEL_OPTIONS]` — the one-truth
    // roster on both planes); offenders stay empty, only this pin
    // lagged.
    // 655 -> 664 (2026-11-07, the operator's drop): the image-gen
    // card boards moss-image — its t2i surface's nine shared names
    // (prompt, negative_prompt, width, height, seed, steps, cfg,
    // sampler, scheduler) join on the one new address; offenders
    // stay empty.
    // 664 -> 660 (2026-11-08, the latent law): the size pair leaves
    // BOTH edit actions' ParamSpecs (neither lane takes a stated
    // size) — four pairs depart the image-edit card's join; the card
    // keeps the keys as hidden legacy-draft compatibility, so the
    // pairs die with the action side. Offenders stay empty.
    // 660 -> 661 (2026-11-08, (l) 1905dedc0): the anny card's
    // body_image joins the shared names (schema row == compose
    // ParamSpec row, both string — one new agreeing pair).
    // 661 -> 665 (2026-10-19, the stated bake): the h3 family's
    // refmod group joins the shared names — mode (enum), pool and
    // identity (number, bounds), save (boolean): four agreeing pairs.
    // 665 -> 773 (2026-11-09, the h3-timeline board==offer cure): the
    // card boards its two offered lane addresses, and the wall judges
    // the h3 schema's shared names once per carried address (+108 —
    // the offenders list below stays empty, every pair agrees).
    // 773 -> 776 (2026-10-20, the SOTA refine window): refine_denoise
    // joins the shared names — one agreeing pair per carried h3
    // address (schema min 0.05 / max 1 == the action row's bounds
    // [0.05, 1], number on both planes); offenders stay empty.
    // 776 -> 789 (2026-11-08, the third edit lane): fibo2-edit's 7
    // carried addresses join — 13 agreeing pairs (seed, steps, cfg
    // + the envelope/bounds pair rides per bounded address);
    // offenders stay empty.
    // 789 -> 795 (2026-10-21, SOTA P2 LIMB 3): h3's upscale_route +
    // upscale_model join the shared names — the route enum (off |
    // latent_2x, identical options both planes) + the model vocab
    // (the LBH bf16 file, identical list both planes), one agreeing
    // pair per carried h3 address; offenders stay empty.
    // 795 -> 805 (2026-10-21, the studio-unbrick cure, row
    // cards-tts-export-pair-renders): tts voice_name joins the
    // shared names — the export action's ParamSpec declared it all
    // along (the save needs the name); the card schema half was the
    // missing home, so ten carried qwen3-tts addresses now match
    // (the family's served route coordinates), one agreeing pair
    // per address; offenders stay empty.
    // 805 -> 795 (2026-10-22, THE MOD-PRESENCE LAW, row
    // cards-tts-mod-presence): voice_name + the five sampling knobs
    // leave BOTH homes with the pack cut (the build mints the export
    // name; the card's lane surface owns the sampling) — one pair
    // per carried address each; save_qvoice matches on both planes;
    // offenders stay empty.
    // 795 -> 796 (2026-10-27, the wave's music3 work, 2164b71a3):
    // music.tiled_decode joins the shared names — the card schema
    // half (the music3-scoped decode knob) and the action ParamSpec
    // half (music3's actions.ts row) landed in the same wave; one
    // agreeing pair; offenders stay empty.
    // 796 -> 838 (2026-10-27, the openjutsu lane, feature 023): the
    // openjutsu card joins the boarded set — the animate action's
    // ParamSpec rows sync against the card schema per carried
    // address (length/width/height/steps/shift_video/shift_audio
    // bounds + the seed sentinel; offenders empty).
    assert.equal(pairs, 829, "the shared-name pair census changed — update this pin deliberately"); // 838→829 2026-11-12: the openjutsu card's nine shared-name pairs leave
    assert.deepEqual(offenders, [], `two-homes drift (card schema vs action ParamSpec):\n${offenders.join("\n")}`);
  });
});

// ── THE GHOST WALL (2026-10-12 model audit, fix 3: the mask card's
// PROVISIONS↔WEIGHTS AGREEMENT promoted to every family) ──────────
// Every weight a family's lane declares loading must be downloaded
// by SOME declaration channel (family provisions, a variant cell
// artifact, or the boarded card's provisions). A lane that names a
// file nothing downloads is a ghost — it runs on this machine only
// because the operator hand-placed bytes, and refuses on every
// fresh provision. The audit found 13 such files; this wall keeps
// the count at zero.
describe("THE PROVISIONS↔WEIGHTS AGREEMENT (no ghost weights)", () => {
  const WEIGHT_RE = /\.(safetensors|pt|pth|ckpt|gguf|onnx|sft|bin)$/;

  /** String leaves of a lane_inputs dict that name weight files. */
  function weightNames(value: unknown, into: string[] = []): string[] {
    if (typeof value === "string") {
      if (WEIGHT_RE.test(value)) into.push(value);
    } else if (Array.isArray(value)) {
      for (const v of value) weightNames(v, into);
    } else if (value !== null && typeof value === "object") {
      for (const v of Object.values(value as Record<string, unknown>)) weightNames(v, into);
    }
    return into;
  }

  it("every lane weight is declared by some download channel", async () => {
    const { loadCardDefs, provisionsByFamily } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const byFamily = await provisionsByFamily(await loadCardDefs());
    const offenders: string[] = [];
    for (const id of modelIds()) {
      const view = getModel(id);
      // THE ATOM-KEY FOLD (the kroma duplication cure, 2026-11-12):
      // the download surface keys by the OWNING ATOM (provisions are
      // the atom's, never per route address) — a route id folds
      // through the service's own owning-atom read before the
      // channel lookup. The old route-keyed map lookup judged a
      // copy: it passed while every route re-listed the family's
      // rows, and reds here the day the map stopped lying.
      const declared = new Set((byFamily[owningAtom(id)]?.provisions ?? []).map((r) => r.name));
      // variant-cell artifacts count as declarations (basename with
      // the C5 query/fragment strip — mirrors cardDefs' union walk)
      for (const variant of view.variants ?? []) {
        for (const cell of variant.cells) {
          const artifact = cell.artifact;
          if (artifact === undefined || artifact === null) continue;
          let name = artifact.source_url.split("/").pop() ?? "";
          const cut = Math.max(name.indexOf("?"), name.indexOf("#"));
          if (cut >= 0) name = name.slice(0, cut);
          declared.add(name);
        }
      }
      const lanes: Array<string> = [
        ...weightNames(view.lane_inputs ?? {}),
        ...(view.variants ?? []).flatMap((v) => weightNames(v.lane_inputs ?? {})),
        // THE CELL CASCADE (burn d companion, 2026-10-26): the run
        // gate folds cell lane_inputs last (the qwen cell-fold
        // cure) — a weights tier declared only at a cell is a lane
        // demand here too, never a ghost the gate probes but this
        // wall blesses.
        ...(view.variants ?? []).flatMap((v) => v.cells.flatMap((c) => weightNames(c.lane_inputs ?? {}))),
      ];
      // The loaded identity is the FILENAME (the registration law's
      // 2026-10-13 judge): a ComfyUI-native lane spells the bare
      // name, an audiocpp-style tree lane spells a root-relative
      // path — both must find their download row.
      const declaredBase = new Set(
        [...declared].flatMap((n) => [n, n.split("/").pop() ?? n]),
      );
      for (const weight of lanes) {
        if (!declaredBase.has(weight) && !declaredBase.has(weight.split("/").pop() ?? weight)) {
          offenders.push(`${id}: lane loads ${weight} — no provisions/artifact/card row downloads it`);
        }
      }
    }
    assert.deepEqual(offenders, [], `ghost weights (the audit's fix 3; hand-placed bytes are not a provision):\n${offenders.join("\n")}`);
  });

  // THE DIRECTORY-FORM HOLE (the TTS chain audit T3, 2026-10-15):
  // the judgment above keys on weight-file extensions, so a lane
  // pointing at a weights TREE (a directory model_path) never got
  // judged at all — the TTS lanes' five trees and the MOSS-SoundEffect
  // source tree were silent ghosts. A tree no row fetches and no
  // declaration names is the same disease; the cure channels are
  // provisions names, variant artifacts, source repo ids, or the
  // hand_placed_weights declaration (option 3: the placement stated,
  // never silently implied fetchable).
  it("every lane model_path tree is declared by some channel (or hand_placed_weights)", async () => {
    const { loadCardDefs, provisionsByFamily } = await import(
      "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
    );
    const byFamily = await provisionsByFamily(await loadCardDefs());
    /** String values under a "model_path" key at any dict depth. */
    const modelPaths = (value: unknown, into: string[] = []): string[] => {
      if (Array.isArray(value)) {
        for (const v of value) modelPaths(v, into);
      } else if (value !== null && typeof value === "object") {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (k === "model_path" && typeof v === "string") into.push(v);
          else modelPaths(v, into);
        }
      }
      return into;
    };
    const base = (s: string): string => s.split("/").pop() ?? s;
    const offenders: string[] = [];
    for (const id of modelIds()) {
      const view = getModel(id);
      const declared = new Set<string>();
      const add = (s: string): void => { declared.add(s); declared.add(base(s)); };
      for (const row of byFamily[id]?.provisions ?? []) add(row.name);
      // THE SNAPSHOT CHANNEL (the model-families audit fix 8): whole
      // HF dirs ride snapshot_provisions, never single-file rows.
      // A snapshot row names its tree by basename, like every other
      // channel here.
      for (const row of view.snapshot_provisions ?? []) add(row.name);
      // (burn d): flags are reasoned rows — the ghost walk names the
      // tree, the reason rides the linkability wall's register arm
      for (const w of view.hand_placed_weights ?? []) add(w.name);
      // THE REPO-ID LOOPHOLE (operator order 2026-10-13, "we need a
      // serious solution if it is not baked in"): source.repo_id NO
      // LONGER satisfies a lane demand by itself — "the repo exists
      // upstream" composes no download for a normal user (the
      // ace-step/moss/music3/yue2 class slipped every gate through
      // this channel). A demand is satisfied by a row that FETCHES
      // (provisions, snapshot, artifact) or by a stated placement
      // (hand_placed_weights). The repo id is judged where it
      // belongs: the declared-resources wall's half-shape arm.
      for (const variant of view.variants ?? []) {
        for (const cell of variant.cells) {
          const artifact = cell.artifact;
          if (artifact === undefined || artifact === null) continue;
          let name = artifact.source_url.split("/").pop() ?? "";
          const cut = Math.max(name.indexOf("?"), name.indexOf("#"));
          if (cut >= 0) name = name.slice(0, cut);
          add(name);
        }
      }
      const paths: Array<string> = [
        ...modelPaths(view.lane_inputs ?? {}),
        ...(view.variants ?? []).flatMap((v) => modelPaths(v.lane_inputs ?? {})),
        // THE CELL CASCADE (burn d companion): same fold as the
        // file arm — a tree a cell declares is a lane demand.
        ...(view.variants ?? []).flatMap((v) => v.cells.flatMap((c) => modelPaths(c.lane_inputs ?? {}))),
      ];
      for (const p of paths) {
        if (!declared.has(p) && !declared.has(base(p))) {
          offenders.push(
            `${id}: lane model_path ${p} — no provisions row, snapshot row, artifact, source repo, or hand_placed_weights entry names it`,
          );
        }
      }
    }
    assert.deepEqual(
      offenders, [],
      `ghost weight trees (directory-form model_path; hand-placed bytes are not a provision):\n${offenders.join("\n")}`,
    );
  });
});

// THE SNAPSHOT↔MERGE SPLIT (the model-families audit fix 8).
// Five TTS trees load as whole HF dirs across two families.
// Two are fetchable upstream (pinned snapshot rows land them).
// Three are operator merges (no repo exists, so no snapshot row may
// name them — stating one would be a lie).
// The fetchable two stay dual-declared (hand_placed_weights names
// the placement, the snapshot row names the fetch).
describe("THE SNAPSHOT↔MERGE SPLIT (no lying snapshot rows)", () => {
  const REVISION_RE = /^[0-9a-f]{40}$/;

  /** The snapshot rows of one family, keyed by tree name. */
  function snapshotsOf(id: string) {
    return new Map(getModel(id).snapshot_provisions.map((r) => [r.name, r]));
  }

  it("exactly four snapshot rows exist: the two TTS trees, the kimodo rig, and the joycaption tree", () => {
    // Registry ids, never route views: a route view (qwen3-tts-base)
    // re-carries its family's rows, so a modelIds walk counts one
    // declaration three times.
    // 2026-10-26, the operator's size-at-quant fold: THE ONE QWEN
    // FAMILY carries BOTH fetchable trees (the 1.7B-VoiceDesign row
    // moves from the dead qwen3-tts-voicedesign atom to qwen3-tts —
    // the union of the two dead atoms' rows). Still exactly three:
    // a fourth row is an unreviewed fetch.
    // JOY-CAPTION GRADUATION: the fourth row is REVIEWED — the
    // beta-one tree (fancyfeast/llama-joycaption-beta-one-hf-llava
    // at a pinned 40-hex revision, 13 load-covering literals). Four
    // shards plus the index ride the whole-dir channel (never
    // single-file rows); a fifth row is an unreviewed fetch.
    // 4 -> 18 (burn d, 2026-10-26 — "HOW DOES MODELS WITHOUT FUCKING
    // LINKS GO ALL GREEN?"): florence2's fourteen whole-repo trees
    // join, one pinned row per selectable checkpoint (the node's own
    // snapshot_download target into models/LLM — the joycaption
    // precedent, and every literal is liveness-probed at its pinned
    // revision by the url-liveness wall).
    const rows: Array<{ family: string; name: string }> = [];
    for (const id of registryIds()) {
      for (const r of registryModel(id).snapshot_provisions ?? []) rows.push({ family: id, name: r.name });
    }
    assert.deepEqual(
      rows.sort((a, b) => a.name < b.name ? -1 : 1),
      [
        { family: "florence2", name: "CogFlorence-2.1-Large" },
        { family: "florence2", name: "CogFlorence-2.2-Large" },
        { family: "florence2", name: "Florence-2-DocVQA" },
        { family: "florence2", name: "Florence-2-Flux-Large" },
        { family: "florence2", name: "Florence-2-SD3-Captioner" },
        { family: "florence2", name: "Florence-2-base" },
        { family: "florence2", name: "Florence-2-base-Castollux-v0.5" },
        { family: "florence2", name: "Florence-2-base-PromptGen-v1.5" },
        { family: "florence2", name: "Florence-2-base-PromptGen-v2.0" },
        { family: "florence2", name: "Florence-2-base-ft" },
        { family: "florence2", name: "Florence-2-large" },
        { family: "florence2", name: "Florence-2-large-PromptGen-v1.5" },
        { family: "florence2", name: "Florence-2-large-PromptGen-v2.0" },
        { family: "florence2", name: "Florence-2-large-ft" },
        { family: "kimodo", name: "Kimodo-SOMA-RP-v1.1" },
        { family: "qwen3-tts", name: "Qwen3-TTS-12Hz-0.6B-Base" },
        { family: "qwen3-tts", name: "Qwen3-TTS-12Hz-1.7B-VoiceDesign" },
        { family: "joycaption", name: "llama-joycaption-beta-one-hf-llava" },
      ],
      "the snapshot channel carries exactly the four fetchable trees " +
        "(kimodo pinned 2026-10-13: a lane demand satisfied by a repo " +
        "id alone composes no download for a normal user; joycaption " +
        "graduated with the weightless cure) — a fifth " +
        "row is an unreviewed fetch",
    );
  });

  it("the fetchable rows pin repo + revision + load-covering patterns", () => {
    const tts = snapshotsOf("qwen3-tts").get("Qwen3-TTS-12Hz-0.6B-Base");
    assert.equal(tts?.repo_id, "Qwen/Qwen3-TTS-12Hz-0.6B-Base");
    // F2 (audit 2026-10-12-audit-display-fold): this probe used the
    // dead atom id 'qwen3-tts-voicedesign' — a ROUTE ADDRESS the
    // claimed-address cure resolves to its owner, so the arm stayed
    // green while violating its own "registry ids, never route
    // views" law two arms up. Both fetchable trees live on THE ONE
    // QWEN FAMILY now — probe the atom for both.
    const vd = snapshotsOf("qwen3-tts").get("Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.equal(vd?.repo_id, "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    for (const [label, row] of [["0.6B-Base", tts], ["1.7B-VoiceDesign", vd]] as const) {
      assert.ok(row, `${label} carries a snapshot row`);
      assert.match(row!.revision, REVISION_RE, `${label}: revision is a pinned 40-hex commit, never a branch`);
      assert.equal(row!.folder, "audio/qwen3-tts/hf", `${label}: the dest parent under the models root`);
      assert.ok(row!.allow_patterns.includes("config.json"), `${label}: patterns cover the config`);
      assert.ok(row!.allow_patterns.includes("model.safetensors"), `${label}: patterns cover the weights`);
      assert.ok(
        row!.allow_patterns.some((p) => p.startsWith("speech_tokenizer/")),
        `${label}: patterns cover the speech tokenizer subtree`,
      );
    }
    // JOY-CAPTION GRADUATION (the weightless cure): the beta-one
    // tree pins the JJC loader's whole-dir fetch — repo + revision
    // + the 13 load-covering literals (config, generation config,
    // the weights index, the FOUR shards, the processor/tokenizer
    // set, the chat template). Sharded weights ride exact paths,
    // never a single-file row.
    const joy = snapshotsOf("joycaption").get("llama-joycaption-beta-one-hf-llava");
    assert.ok(joy, "joycaption carries its beta-one snapshot row");
    assert.equal(joy!.repo_id, "fancyfeast/llama-joycaption-beta-one-hf-llava");
    assert.match(joy!.revision, REVISION_RE, "joycaption: revision is a pinned 40-hex commit, never a branch");
    assert.equal(joy!.folder, "LLavacheckpoints", "joycaption: the dest parent under the models root (the JJC loader's dir)");
    for (const file of [
      "config.json",
      "model.safetensors.index.json",
      "model-00001-of-00004.safetensors",
      "model-00002-of-00004.safetensors",
      "model-00003-of-00004.safetensors",
      "model-00004-of-00004.safetensors",
      "preprocessor_config.json",
      "processor_config.json",
      "tokenizer.json",
      "tokenizer_config.json",
    ]) {
      assert.ok(joy!.allow_patterns.includes(file), `joycaption: patterns cover the load file ${file}`);
    }
  });

  it("the fetchable trees stay dual-declared; the merges stay hand-only", () => {
    // (burn d, 2026-10-26): flags are REASONED ROWS now ({name,
    // reason}) — the dual declarations say "placement stated"
    // (judged by the linkability wall's register arm); this arm
    // keeps the split itself: fetchable trees dual-declared, merges
    // hand-only.
    const names = (id: string): string[] => getModel(id).hand_placed_weights.map((w) => w.name);
    const ttsPlaced = names("qwen3-tts");
    assert.ok(
      ttsPlaced.some((w) => w.endsWith("Qwen3-TTS-12Hz-0.6B-Base")),
      "the fetchable 0.6B-Base tree stays in hand_placed_weights (the placement is stated even where a fetch exists)",
    );
    assert.ok(
      ttsPlaced.some((w) => w.endsWith("Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")),
      "the merged CustomVoice tree stays declared",
    );
    const vdPlaced = names("qwen3-tts-voicedesign");
    assert.ok(
      vdPlaced.some((w) => w.endsWith("Qwen3-TTS-12Hz-1.7B-VoiceDesign")),
      "the fetchable VoiceDesign tree stays in hand_placed_weights",
    );
    const vdSnaps = snapshotsOf("qwen3-tts-voicedesign");
    for (const merged of ["Qwen3-TTS-12Hz-1.7B-CustomVoice-merged", "Qwen3-TTS-12Hz-1.7B-Base-merged"]) {
      assert.ok(vdPlaced.some((w) => w.endsWith(merged)), `${merged} stays declared as hand-placed`);
      assert.ok(!vdSnaps.has(merged), `${merged} carries no snapshot row (no upstream repo exists for an operator merge)`);
    }
    assert.ok(
      !snapshotsOf("qwen3-tts").has("Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"),
      "the 0.6B merged tree carries no snapshot row",
    );
  });
});
