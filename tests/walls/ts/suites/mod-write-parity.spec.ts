// mod-write-parity.spec.ts — THE MOD-WRITE PARITY WALL (operator
// 2026-10-22, the qvoice_save burn: "THE QVOICE OF QWEN TTS MOD IS
// FULLY BORKEN, PARAMETER INPUTS ARE FUCKED — THE WRITE DID NOT
// LAND: compose-door: unknown param(s) on the tts card: qvoice_save
// ... GREEN! GREEN! YOUR FAVOURITE LIE!").
//
// THE CLASS (Journey Law §3.12 — the SECOND same-class burn today;
// burn #2 owes the class wall): the face builds what the door
// refuses. The persona-relation burn (lane-relation-offer-parity)
// was the relation words; THIS burn is the mod plane: the studio's
// mod leaf commits params[param_key] = [entry] (mods.tsx commit —
// "THE WIRE IS THE STORAGE"), the served spec derives param_key as
// `meta.param_key ?? pack` (discovery.ts), and for the qvoice_save
// pack that key names NO declared surface — the tts card's own law
// is "the Design entry is FLAT — voice_name + design_prompt +
// sampling" (card.ts). The operator typed into the Design mod's
// parameter inputs; the write carried the bag key; the bench-write
// door refused it; the studio toasted THE WRITE DID NOT LAND. Every
// suite stood green: the admission matrix T2 PINS that pack ids
// refuse (the door was "right"), and no wall anywhere drives the
// CLIENT'S COMMIT SHAPE through the REAL write door. The face could
// build a state no door lands — the same lie, the mod seam.
//
// THE LAW THIS WALL HOLDS: for every booted family × every modifier
// kind the REAL spec door serves, the studio leaf's commit write —
// built by the ONE shared spelling (modCommitWrite,
// @melite/contracts — the leaf itself calls it; a wall that
// hand-retypes the client's write shape certifies its own fiction
// while the client burns, §3.2) — ADMITS through the real
// bench-write door (admitStageRelations, the burn's own seat). A
// kind whose commit shape refuses is a dead mod: the operator's
// edit can never land.
//
// JOURNEY MAP (§2): the burn crossed [1] UI seat (the Design mod's
// inputs) → [2] saved doc (the studio patch) → [3]/[4] the write
// door's admission (the felt hop — the toast names this refusal)
// → [5] the serialized graph. The wall rides [4] (the census, all
// kinds) AND [5] (the witness composes the save intent through the
// run path's own prepareCardParams + the real card compose — the
// persona name must ride the wire). The client hop [1] is judged
// at the leaf's own dom suite (card-base), which drives the
// rendered Design leaf's save gesture.
//
// Run: npx vitest run tests/walls/ts/suites/mod-write-parity.spec.ts
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { loadCardDefs, owningAtom } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { modelIds, getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
// THE ONE SPELLING (the twin-kill): the same source the client
// leaf imports — never a wall-local re-type of the commit shape.
import { modCommitWrite } from "../../../../packages/web-kit/contracts/src/formSpec.ts";
// The param rows the leaf RENDERS, the client's own walker (the
// envelope projection for pack kinds — "the param fields are the
// envelope's", discovery.ts; the served rows for card-declared
// kinds). Same function, same truth.
import { fieldsOfEnvelope } from "../../../../packages/web/card-base/src/spec.ts";
// The together-closure pre-state — WALL 2's own spelling (the
// lane-relation wall): the door's declared relation rows close a
// stated field's partners before the write is judged.
import { laneTogetherClosure } from "@melite/contracts/laneRelations";
import type { LaneRelations } from "@melite/contracts/laneRelations";

// The wall judges the REAL checkout's declarations — never a fixture
// root a sibling spec may have left in the env (the ghost wall's law).
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

/** A stated value for one served field — the leaf's own coercion
 *  class (a number knob takes a number, everything else a string;
 *  a served default wins verbatim). */
function probeValue(field: { default?: unknown; wtype?: string; type?: string }): unknown {
  if (field.default !== undefined && field.default !== null) return field.default;
  if (field.wtype === "boolean" || field.type === "boolean") return true;
  if (field.wtype === "slider" || field.wtype === "number" || field.type === "number") return 1;
  return "mod-write-parity probe";
}

let svc: CardRegistryService;
let bootCtx: Context;

beforeAll(async () => {
  bootCtx = new Context();
  new FlowsSeatService(bootCtx);
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "mod-write-parity-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

describe("THE MOD-WRITE PARITY — every served modifier kind's studio commit write lands through the real write door (operator 2026-10-22)", () => {
  /** THE DERIVED ROSTER: every booted family with a boarded card ×
   *  every modifier kind the real spec door serves for it, each with
   *  the commit write the studio leaf produces for a fresh entry. */
  interface KindArm {
    family: string;
    card: string;
    kind: string;
    paramKey: string;
    flat: boolean;
    write: Record<string, unknown>;
    entry: Record<string, unknown>;
  }
  const arms: KindArm[] = [];
  const deadSpecs: string[] = [];

  beforeAll(async () => {
    const boarded = new Map<string, string>();
    for (const [cardId, def] of await loadCardDefs()) {
      for (const family of def.boarded ?? []) boarded.set(family, cardId);
    }
    for (const fam of modelIds()) {
      const card = boarded.get(fam);
      if (card === undefined) continue;
      // the family's own DECL must exist for the write door to judge
      getModel(fam);
      const doc = await formSpecArm(fam, undefined, []);
      if (doc === null) {
        deadSpecs.push(`${fam} (${card}): form-spec resolves null — the studio cannot open this family`);
        continue;
      }
      for (const kind of doc.features?.modifiers ?? []) {
        // THE LEAF'S PARAM ROWS — the client's own spelling (the
        // envelope walk for pack kinds, the served fields for
        // card-declared kinds): the entry the operator's inputs
        // fill derives from the SAME rows the leaf renders.
        const fields = (kind.fields ?? []).length > 0
          ? kind.fields ?? []
          : fieldsOfEnvelope(doc.mod_schemas?.[kind.schema_key] ?? null, fam);
        // THE LEAF'S COMMIT SHAPE — the ONE shared spelling the
        // client's own commit calls (flat fields at the root for a
        // flat kind, the param_key bag otherwise; entry seeded from
        // the kind's OWN param rows).
        const entry: Record<string, unknown> = {};
        for (const f of fields) entry[f.name] = probeValue(f);
        arms.push({
          family: fam,
          card,
          kind: kind.kind,
          paramKey: kind.param_key,
          flat: kind.flat === true,
          write: modCommitWrite(kind, entry),
          entry,
        });
      }
    }
  });

  it("the roster is not silent (a census with no mods judges the class never)", () => {
    expect(deadSpecs, "families whose spec door refuses to serve").toEqual([]);
    expect(arms.length, "served modifier kinds across the fleet").toBeGreaterThan(0);
    // the burned kind must be IN the derived roster — the census
    // reaches it by derivation, never by hand-listing it
    expect(arms.some((a) => a.family === "qwen3-tts" && a.paramKey === "qvoice_save"),
      "the qwen3-tts Design kind must be served (the burn's seat)").toBe(true);
  });

  /** THE OPERATOR-REACHABLE LANE, derived by the door's own verdict:
   *  the first offered cell (visible, non-Recipe, the liveness
   *  roster's derivations) whose write door ADMITS the Design
   *  gesture. Never a hand-picked variant id — the door decides
   *  which lane can land the persona save, and a state no offered
   *  cell admits is the burn, alive (null, and the witness fires).
   */
  function witnessCell(arm: KindArm): { mid: string; variantId: string; quant: string } | null {
    const facts = svc.modelFacts();
    const atom = owningAtom(arm.family);
    const famRow = facts[atom];
    if (famRow === undefined) return null;
    for (const variant of famRow.variants ?? []) {
      if (variant.hide_from_dropdown === true || variant.group === "Recipe") continue;
      const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
      const seats = cells.length > 0 ? cells.map((c) => ({
        quant: typeof c.quant === "string" ? c.quant : "",
        route: typeof c.route === "string" && c.route !== "" ? c.route : null,
      })) : [{ quant: "", route: null }];
      for (const seat of seats) {
        const mid = seat.route ?? atom;
        const verdict = svc.admitStageRelations(arm.card, {
          model: mid,
          variant: variant.id,
          ...(seat.quant !== "" ? { quant: seat.quant } : {}),
          text: "The harbour lights at dusk.",
          design_prompt: "a warm, unhurried narrator with gravel in the low end",
          ...arm.write,
        });
        if (verdict.ok) return { mid, variantId: variant.id, quant: seat.quant };
      }
    }
    return null;
  }

  it("THE CENSUS: every served kind's commit write ADMITS through the real write door — on a lane the family offers, with its together partners pre-stated (the door's own closure)", () => {
    const facts = svc.modelFacts();
    const bad: string[] = [];
    const unknown: string[] = [];
    for (const arm of arms) {
      // THE ATOM FOLD (the door's own): routes fold to their owning
      // atom; an id with its OWN facts row keeps it (the atom's row
      // is the lane's truth, never a hand-picked variant).
      const atom = owningAtom(arm.family);
      const famRow = facts[atom] ?? facts[arm.family];
      if (famRow === undefined) { bad.push(`${arm.card} / ${arm.family}: no facts row (atom '${atom}') — the door cannot judge the write`); continue }
      // THE OFFERED CELLS (the liveness roster's derivations) × the
      // door's own together closure: a stated mod field rides with
      // its partners (the persona's name + its description are ONE
      // save intent — the card's law, stated by the door itself).
      let landed = false;
      let lastErr = "(no cells offered)";
      // THE DEFAULT SEAT (the hidden-variant law): a family whose
      // every variant is hide_from_dropdown is reached by stating
      // the model alone — the door resolves the default cell. The
      // write must land there too (the operator's only seat).
      {
        const relations: LaneRelations[] = [];
        if (famRow.relations !== undefined) relations.push(famRow.relations);
        const state: Record<string, unknown> = { model: arm.family, ...arm.write };
        const stated = new Set(Object.keys(arm.write));
        const partnerValues: Record<string, unknown> = { ...arm.write };
        for (const rel of relations) {
          for (const group of rel?.together ?? []) {
            const members = Array.isArray(group.fields) ? group.fields : [];
            if (members.some((m) => stated.has(m))) for (const m of members) partnerValues[m] = partnerValues[m] ?? "mod-write-parity partner";
          }
        }
        const closed = laneTogetherClosure(relations, stated, partnerValues);
        for (const f of closed) if (!(f in state)) state[f] = "mod-write-parity partner";
        const verdict = svc.admitStageRelations(arm.card, state);
        if (verdict.ok) landed = true;
        else {
          const err = verdict.ok ? "" : verdict.error;
          lastErr = `${err} [default seat]`;
          if (/unknown param\(s\)/.test(err) && new RegExp(`'${arm.paramKey}'`).test(err)) {
            unknown.push(`${arm.card} / ${arm.family} / kind '${arm.kind}': ${err}`);
          }
        }
      }
      for (const variant of famRow.variants ?? []) {
        if (variant.hide_from_dropdown === true || variant.group === "Recipe") continue;
        const relations: LaneRelations[] = [];
        if (famRow.relations !== undefined) relations.push(famRow.relations);
        if (variant.relations !== undefined) relations.push(variant.relations);
        const seats: Array<{ quant: string; route: string | null }> = [];
        const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
        if (cells.length === 0) seats.push({ quant: "", route: null });
        for (const c of cells) seats.push({ quant: typeof c.quant === "string" ? c.quant : "", route: typeof c.route === "string" && c.route !== "" ? c.route : null });
        for (const seat of seats) {
          const mid = seat.route ?? atom;
          const state: Record<string, unknown> = {
            model: mid,
            variant: variant.id,
            ...(seat.quant !== "" ? { quant: seat.quant } : {}),
            ...arm.write,
          };
          // TOGETHER PRE-STATE (WALL 2's own spelling): partners of
          // the write's stated fields ride with them — a half-stated
          // save is a breach the door refuses, not the mod's death.
          const stated = new Set(Object.keys(arm.write));
          const partnerValues: Record<string, unknown> = { ...arm.write };
          for (const rel of relations) {
            for (const group of rel?.together ?? []) {
              const members = Array.isArray(group.fields) ? group.fields : [];
              if (members.some((m) => stated.has(m))) for (const m of members) partnerValues[m] = partnerValues[m] ?? "mod-write-parity partner";
            }
          }
          const closed = laneTogetherClosure(relations, stated, partnerValues);
          for (const f of closed) if (!(f in state)) state[f] = "mod-write-parity partner";
          const verdict = svc.admitStageRelations(arm.card, state);
          if (verdict.ok) { landed = true; continue }
          const err = verdict.ok ? "" : verdict.error;
          lastErr = err;
          // THE CLASS (the burn's verbatim refusal shape): a write
          // whose KEYS the door does not know can never land on ANY
          // lane — unknown param(s) is the death, named wherever it
          // appears.
          if (/unknown param\(s\)/.test(err) && new RegExp(`'${arm.paramKey}'`).test(err)) {
            unknown.push(`${arm.card} / ${arm.family} / kind '${arm.kind}': ${err}`);
          }
        }
      }
      if (!landed) bad.push(`${arm.card} / ${arm.family} / kind '${arm.kind}' (param_key '${arm.paramKey}'): the studio's commit write DOES NOT LAND on any offered lane — last refusal: ${lastErr} | write: ${JSON.stringify(arm.write)}`);
    }
    expect(unknown, "writes whose keys the door does not know (the burn's verbatim refusal class)").toEqual([]);
    expect(bad, "dead mods — kinds whose parameter inputs can never land").toEqual([]);
  });

  it("THE WITNESS (the operator's burn, by name): the qwen3-tts Design entry's commit write is FLAT and lands through the real write door", () => {
    const arm = arms.find((a) => a.family === "qwen3-tts" && a.paramKey === "qvoice_save");
    expect(arm, "the burned kind is served (derived, never hand-listed)").toBeDefined();
    if (arm === undefined) return;
    // THE BURN'S OWN SHAPE, refused verbatim by the door: the bag
    // write the leaf produced before the cure. Pinned here so the
    // flat law can never silently regress to the refused shape.
    expect("qvoice_save" in arm.write, "the Design kind takes no key of its own — its fields ride flat top-level (the door's own refusal voice)").toBe(false);
    for (const f of Object.keys(arm.entry)) {
      expect(f in arm.write, `Design field '${f}' must ride the write's root (flat law)`).toBe(true);
    }
    // The operator's exact gesture: the Design mod's fields filled
    // (voice_name + sampling seeded from the served defaults) + the
    // persona's required words (design_prompt), committed. THE LANE
    // IS DERIVED BY THE DOOR'S OWN VERDICT (never a hand-picked
    // variant): the first offered cell whose write door admits the
    // gesture is the operator-reachable seat.
    const cell = witnessCell(arm);
    expect(cell, "some offered qwen3-tts cell must admit the Design gesture (a persona save no lane can land is the burn, alive)").not.toBeNull();
    if (cell === null) return;
    const verdict = svc.admitStageRelations(arm.card, {
      model: cell.mid,
      variant: cell.variantId,
      ...(cell.quant !== "" ? { quant: cell.quant } : {}),
      text: "The harbour lights at dusk.",
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
      ...arm.write,
    });
    expect(verdict.ok, `the Design mod's parameter inputs must LAND on ${cell.mid}/${cell.variantId} — ${verdict.ok ? "" : verdict.error}`).toBe(true);
  });

  /** THE COMPOSE-SEATED WITNESS (the presence law, 2026-10-22): the
   *  persona gesture is the SAVE STAMP + the lane's own design_prompt —
   *  no name, no knobs (the chip IS the signal). The seat must land
   *  through BOTH doors: the write door's admission AND the card's own
   *  compose (design_prompt fires only on the VoiceDesign lane — a
   *  cell that admits but cannot compose is the three-door split,
   *  alive and named). Never a hand-picked variant id: the first
   *  offered cell the full journey accepts is the operator's seat. */
  const witnessRefusals: string[] = [];
  async function witnessComposeCell(arm: KindArm, defs: Map<string, CardDefinition>): Promise<{ mid: string; variantId: string; quant: string } | null> {
    const facts = svc.modelFacts();
    const atom = owningAtom(arm.family);
    const def = defs.get(arm.card)!;
    if (facts[atom] === undefined) return null;
    witnessRefusals.length = 0;
    for (const variant of facts[atom].variants ?? []) {
      if (variant.hide_from_dropdown === true || variant.group === "Recipe") continue;
      const cells = (variant.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
      const seats = cells.length > 0 ? cells.map((c) => ({
        quant: typeof c.quant === "string" ? c.quant : "",
        route: typeof c.route === "string" && c.route !== "" ? c.route : null,
      })) : [{ quant: "", route: null }];
      for (const seat of seats) {
        const mid = seat.route ?? atom;
        // THE RESOLVED ROW (the run path's own): a route id with its
        // own facts row keeps it — the card's lane derivation keys on
        // the resolved row's defaults.variant, never the atom's.
        const row = facts[mid] ?? facts[atom];
        const verdict = svc.admitStageRelations(arm.card, {
          model: mid,
          variant: variant.id,
          ...(seat.quant !== "" ? { quant: seat.quant } : {}),
          text: "The harbour lights at dusk.",
          design_prompt: "a warm, unhurried narrator with gravel in the low end",
          ...arm.write,
        });
        if (!verdict.ok) { witnessRefusals.push(`${mid}/${variant.id}: admit — ${verdict.ok ? "" : verdict.error}`); continue }
        try {
          // THE PROBE RIDES THE RUN PATH (the press's own prepare,
          // never a hand-built doc): prepareCardParams is the door
          // that already merged/axis-resolved the cell's quant —
          // feeding compose the raw seat keys would state params the
          // run path itself never sends.
          const preparedProbe = prepareCardParams(svc, {
            model: mid,
            variant: variant.id,
            ...(seat.quant !== "" ? { quant: seat.quant } : {}),
            text: "The harbour lights at dusk.",
            design_prompt: "a warm, unhurried narrator with gravel in the low end",
            ...arm.write,
          }, mid, "mod-write-parity:probe").params;
          const g = new GraphBuilder();
          def.compose(def.schema({ ...preparedProbe }), row, g, "mod-write-parity:probe");
          if (Object.keys(g.toJSON() as Record<string, unknown>).length === 0) { witnessRefusals.push(`${mid}/${variant.id}: compose — empty graph`); continue }
        } catch (e) {
          witnessRefusals.push(`${mid}/${variant.id}: compose — ${e instanceof Error ? e.message : String(e)}`);
          continue; // this lane admits but cannot compose the persona — the split, skipped only when another cell truly lands
        }
        return { mid, variantId: variant.id, quant: seat.quant };
      }
    }
    return null;
  }

  it("THE WIRE HOP (§2 [5]): the Design entry's admitted write composes — the save stamp + the persona description ride the serialized graph, no bag residue", async () => {
    const arm = arms.find((a) => a.family === "qwen3-tts" && a.paramKey === "qvoice_save");
    expect(arm, "the burned kind is served").toBeDefined();
    if (arm === undefined) return;
    const defs = await loadCardDefs();
    const def = defs.get(arm.card)!;
    const facts = svc.modelFacts();
    const atom = owningAtom(arm.family);
    const cell = await witnessComposeCell(arm, defs);
    expect(cell, `some offered qwen3-tts cell must land the persona gesture through BOTH doors (admission + compose — a save no lane can compose is the burn, alive); per-cell refusals: ${witnessRefusals.join(" | ") || "(none offered)"}`).not.toBeNull();
    if (cell === null) return;
    // THE RESOLVED ROW (the run path's own): the lane derives from the
    // resolved cell row, never the atom's defaults.
    const row = facts[cell.mid] ?? facts[atom]!;
    // THE RUN PATH'S OWN MERGED VIEW (the run press's prepare, not a
    // hand-built doc): the operator's admitted write rides it whole.
    const prepared = prepareCardParams(svc, {
      model: cell.mid,
      variant: cell.variantId,
      ...(cell.quant !== "" ? { quant: cell.quant } : {}),
      text: "The harbour lights at dusk.",
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
      ...arm.write,
    }, cell.mid, "mod-write-parity").params;
    // hop [3] residue: the merged run params carry the presence stamp
    // at the ROOT and never the refused bag key.
    expect("qvoice_save" in prepared, "no bag key may survive the run params (the burn's exact refusal)").toBe(false);
    expect(prepared["save_qvoice"], "the presence stamp rides the run params flat (the chip IS the signal)").toBe(true);
    // hop [5]: the real card compose serializes the export — the
    // persona description (the lane's own design_prompt) rides the
    // wire the engine reads.
    const g = new GraphBuilder();
    def.compose(def.schema({ ...prepared }), row, g, "mod-write-parity:witness");
    const graph = g.toJSON() as Record<string, unknown>;
    expect(Object.keys(graph).length, "the Design save composes a non-empty graph").toBeGreaterThan(0);
    expect(JSON.stringify(graph), "the persona description rides the serialized graph (the engine's instruct input)").toContain("a warm, unhurried narrator with gravel in the low end");
    // THE NAME LAW (the named-presence refinement, operator
    // 2026-10-22: the Design mod "has a popup, it can just be
    // 'name'"): the STATED voice_name names the export; unstated
    // ('' or absent) falls to the mint `voice-<runId>`. Either way
    // the PAIR law holds — the studio's write and the copy's
    // search key ride ONE string, read structurally (never a
    // substring fiction).
    const studioIn = (graph["AudiocoreVoiceStudio.0"] as { inputs: Record<string, unknown> }).inputs;
    const copyIn = (graph["MeliteQVoiceCopy.0"] as { inputs: Record<string, unknown> }).inputs;
    const statedWrite = typeof prepared["voice_name"] === "string" ? (prepared["voice_name"] as string).trim() : "";
    const expectedName = statedWrite !== "" ? statedWrite : "voice-mod-write-parity:witness";
    expect(studioIn["name"], `the studio's export name is the stated name when given (got ${JSON.stringify(studioIn["name"])}, stated ${JSON.stringify(statedWrite)})`).toBe(expectedName);
    expect(copyIn["voice_name"], "the copy's search key rides the SAME string (the pair law — one name, both nodes)").toBe(expectedName);
    // THE MINT FALLBACK ARM: the unstated write ('' — the popup's
    // lawful empty) composes the mint on both nodes.
    const preparedMint = prepareCardParams(svc, {
      model: cell.mid,
      variant: cell.variantId,
      ...(cell.quant !== "" ? { quant: cell.quant } : {}),
      text: "The harbour lights at dusk.",
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
      ...arm.write,
      voice_name: "",
    }, cell.mid, "mod-write-parity").params;
    const gMint = new GraphBuilder();
    def.compose(def.schema({ ...preparedMint }), row, gMint, "mod-write-parity:witness");
    const graphMint = gMint.toJSON() as Record<string, unknown>;
    const studioMint = (graphMint["AudiocoreVoiceStudio.0"] as { inputs: Record<string, unknown> }).inputs;
    const copyMint = (graphMint["MeliteQVoiceCopy.0"] as { inputs: Record<string, unknown> }).inputs;
    expect(studioMint["name"], "an unstated name falls to the build's mint (voice-<runId>)").toBe("voice-mod-write-parity:witness");
    expect(copyMint["voice_name"], "the mint rides the copy's search key too (the pair law holds under the mint)").toBe("voice-mod-write-parity:witness");
  });

  it("hermetic rode (the boot stayed off the live lane)", () => {
    assertHermeticRode();
  });
});
