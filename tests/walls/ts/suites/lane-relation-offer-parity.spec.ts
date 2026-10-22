// lane-relation-offer-parity.spec.ts — THE OFFERED-STATE PARITY WALL
// (operator 2026-10-22, the persona burn: the CustomVoice face still
// offered Preset Speaker=None while the lane's persona fields rode
// together — "a gate prevents the error from happening ... the only
// gates I give a shit about are the GLOBAL ones, the ones in the CI").
//
// THE GAP IT KILLS: the relation WORDS have a judge
// (@melite/contracts/laneRelations — one spelling, every seat) and
// the bench-write door rides it (admitStageRelations), but the only
// walls over that door were HAND-BUILT single-card states
// (cards-lane-law.spec.ts pins exactly the tts INCIDENT_A half-pair).
// A family that declares a relation row the write door fails to
// enforce — or enforces with a substituted voice that lost the DECL's
// own cure — landed green everywhere: the face builds the state, the
// run refuses (or nothing does), and the CI never heard of it. This
// wall is the census the hand-built walls can never be:
//
//   for every offered cell (the liveness wall's derived roster —
//   every card's def.boarded set × every visible variant × every
//   cell) × every relation row the facts row declares (the SAME rows
//   laneVerdictCore judges — family-wide + the variant's own):
//     CROSS WORDS (requires / together / conflicts / either_or /
//       at_most_one): the violating state (the half-pair, the
//       conflict pair, the half-stated either_or group, the two-slot
//       at_most_one) REFUSES through the real write door, and the
//       refusal carries the DECL's own cure; the satisfied state
//       ADMITS (no false refusal — the door must refuse the breach,
//       never the state).
//     required: the BLANK state ADMITS at the write seat (the
//       authoring-in-progress tolerance, li-j: the write door never
//       grew the run door's incomplete-draft refusal) and the
//       satisfied state admits.
//
// THE WITNESS: the burn's exact lane — qwen3-tts CustomVoice with a
// design_prompt and no voice_name — is pinned by name through the
// derived roster cell, refusal naming both pair words, the lane, and
// the DECL's cure ("name the voice ... drop both").
//
// JOURNEY MAP (THE_JOURNEY_LAW §2): the burn crossed UI seat → saved
// doc → run params → compose door; the felt hop was the estate's own
// run refusal after the face happily built the state. The wall rides
// the write door (admitStageRelations) — the a-priori judge at/after
// the face hop on the same params path — over the live booted
// roster, never a fixture world. The face-render hop (the offered
// Preset Speaker list) is the form-spec wall's seat
// (cards-relation-fields-render.spec.ts — every DECL-uttered word
// stateable); this wall owns the door behind the face.
//
// Run: npx vitest run tests/walls/ts/suites/lane-relation-offer-parity.spec.ts
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { loadCardDefs, owningAtom } from "@melite/comfyui-cordis";
import {
  laneSurfaceOf,
  laneTogetherClosure,
} from "@melite/contracts/laneRelations";
import type { LaneRelations } from "@melite/contracts/laneRelations";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

/** The probe value: stated per the blank law (a non-empty string),
 *  typed-blind on purpose — the write door judges surface + words,
 *  never bounds (the run door's seat). */
const PROBE = "offer-parity-probe";

/** One offered cell, with the relation rows its own lane declares
 *  (read from the same facts rows the door judges). */
interface CellRow {
  card: string;
  atom: string;
  variantId: string;
  quant: string;
  route: string | null;
  /** family-wide + variant's own relation rows (the door's inputs). */
  relations: LaneRelations[];
  /** family base params (null = union-authored; the surface judge
   *  binds nothing on such a family). */
  familyParams: readonly string[] | null;
  variantParams: readonly string[] | null;
  cellParams: readonly string[] | null;
}

/** The DECL's own cure slice — the refusal must carry the DECL's
 *  authored sentence, not a substituted generic (the voice law). */
function cureSlice(cure: string | undefined): string | null {
  if (cure === undefined || cure === "") return null;
  const words = cure.trim().split(/\s+/);
  return words.slice(-4).join(" ");
}

let svc: CardRegistryService;
let bootCtx: Context;

beforeAll(async () => {
  bootCtx = new Context();
  new FlowsSeatService(bootCtx);
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "relation-parity-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

describe("THE OFFERED-STATE PARITY — every declared relation refuses its breach through the real write door (operator 2026-10-22)", () => {
  /** THE DERIVED ROSTER with each cell's declared relation rows
   *  (family-wide + the variant's own — the door's exact inputs). */
  const roster: CellRow[] = [];
  const rosterDead: string[] = [];
  beforeAll(async () => {
    const defs = await loadCardDefs();
    const facts = svc.modelFacts();
    for (const [cardId, def] of defs) {
      for (const family of def.boarded ?? []) {
        const atom = owningAtom(family);
        const famRow = facts[atom];
        if (famRow === undefined) {
          rosterDead.push(`${cardId}: offered family '${family}' (atom '${atom}') has no facts row`);
          continue;
        }
        for (const variant of famRow.variants ?? []) {
          if (variant.hide_from_dropdown === true) continue;
          if (variant.group === "Recipe") continue;
          const cells = variant.cells ?? [];
          const laneRelations: LaneRelations[] = [];
          if (famRow.relations !== undefined) laneRelations.push(famRow.relations);
          if (variant.relations !== undefined) laneRelations.push(variant.relations);
          if (cells.length === 0) {
            roster.push({
              card: cardId, atom, variantId: variant.id, quant: "", route: null,
              relations: laneRelations,
              familyParams: famRow.params ?? null,
              variantParams: variant.params ?? null,
              cellParams: null,
            });
            continue;
          }
          for (const cell of cells) {
            if (cell.hide_from_dropdown === true) continue;
            roster.push({
              card: cardId, atom, variantId: variant.id, quant: cell.quant,
              route: typeof cell.route === "string" && cell.route !== "" ? cell.route : null,
              relations: laneRelations,
              familyParams: famRow.params ?? null,
              variantParams: variant.params ?? null,
              cellParams: cell.params ?? null,
            });
          }
        }
      }
    }
  });

  /** The cell's selection spelling (the liveness ADMIT leg's own). */
  function selectionOf(cell: CellRow): Record<string, unknown> {
    return cell.route !== null
      ? { model: cell.route }
      : { model: cell.atom, variant: cell.variantId, ...(cell.quant !== "" ? { quant: cell.quant } : {}) };
  }

  /** THE SURFACE PROBE: is the field statable on THIS cell's lane?
   *  The declared surface (laneSurfaceOf — the door's own spelling)
   *  owns the first word: a family-wide relation row naming a field
   *  the lane never declared is INERT here — any state carrying it
   *  refuses on surface grounds (the signature-canon recut: the
   *  persona pair is the voicedesign lane's own input, never
   *  customvoice's). The census judges a row only where its fields
   *  live. Probed through the door itself (never a re-derived
   *  surface): a schema leaf or mod param key the declared params
   *  list omits still states — the probe hears the surface voice,
   *  not a guess. */
  const statableCache = new Map<string, boolean>();
  function statableOnLane(cell: CellRow, field: string): boolean {
    const key = `${cell.card}\u0000${cell.atom}\u0000${cell.variantId}\u0000${cell.quant}\u0000${field}`;
    const hit = statableCache.get(key);
    if (hit !== undefined) return hit;
    const verdict = svc.admitStageRelations(cell.card, { ...selectionOf(cell), [field]: PROBE });
    const statable = !(verdict.ok === false && verdict.error.includes(`field '${field}' fires nothing on this lane`));
    statableCache.set(key, statable);
    return statable;
  }

  /** The satisfied state for a row's stated fields: the fields, PLUS
   *  the together closure (a field that rides a together group cannot
   *  be stated alone — stating it alone is itself the half-pair
   *  breach, not the row's satisfied state). The closure pulls only
   *  members already stated non-blank in `values`, so every together
   *  candidate is pre-stated before it runs. */
  function satisfiedState(cell: CellRow, seed: readonly string[]): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const rel of cell.relations) {
      for (const group of rel?.together ?? []) {
        for (const m of Array.isArray(group.fields) ? group.fields : []) values[m] = PROBE;
      }
    }
    const closed = laneTogetherClosure(cell.relations, new Set<string>(seed), values);
    const out: Record<string, unknown> = {};
    for (const f of closed) out[f] = PROBE;
    return out;
  }

  /** The census rows: one arm per (cell × relation row whose fields
   *  are statable on that cell's lane), the state that breaches it
   *  and the state that satisfies it. */
  interface CensusArm {
    cell: CellRow;
    word: string;
    label: string;
    breach: Record<string, unknown>;
    satisfied: Record<string, unknown>;
    /** fields the breach's refusal must name; the DECL cure tail it
     *  must carry (null when the row authors no cure). */
    expectFields: string[];
    cure: string | null;
  }
  const census: CensusArm[] = [];
  const skippedInert: string[] = [];
  beforeAll(() => {
    for (const cell of roster) {
      for (const rel of cell.relations) {
        for (const row of rel.requires ?? []) {
          if (typeof row.field !== "string" || (row.needs ?? []).length === 0) continue;
          const needs = row.needs as readonly string[];
          const names = [row.field, ...needs];
          if (!names.every((n) => statableOnLane(cell, n))) {
            skippedInert.push(`${cell.card}/${cell.variantId}/${cell.quant}: requires(${names.join(", ")}) — the surface owns a named field on this lane`);
            continue;
          }
          census.push({
            cell, word: "requires",
            label: `${row.field} without ${needs[0]}`,
            breach: { [row.field]: PROBE },
            satisfied: satisfiedState(cell, names),
            expectFields: [row.field, needs[0]!],
            cure: cureSlice(row.cure),
          });
        }
        for (const row of rel.together ?? []) {
          const members = Array.isArray(row.fields) ? row.fields : [];
          if (members.length < 2) continue;
          if (!members.every((n) => statableOnLane(cell, n))) {
            skippedInert.push(`${cell.card}/${cell.variantId}/${cell.quant}: together(${members.join(", ")}) — the surface owns a named field on this lane`);
            continue;
          }
          census.push({
            cell, word: "together",
            label: `${members[0]} without ${members[1]}`,
            breach: { [members[0]!]: PROBE },
            satisfied: satisfiedState(cell, members),
            expectFields: [members[0]!, members[1]!],
            cure: cureSlice(row.cure),
          });
        }
        for (const row of rel.conflicts ?? []) {
          if (typeof row.a !== "string" || typeof row.b !== "string") continue;
          const names = [row.a, row.b];
          if (!names.every((n) => statableOnLane(cell, n))) {
            skippedInert.push(`${cell.card}/${cell.variantId}/${cell.quant}: conflicts(${names.join(", ")}) — the surface owns a named field on this lane`);
            continue;
          }
          census.push({
            cell, word: "conflicts",
            label: `${row.a} + ${row.b}`,
            breach: { [row.a]: PROBE, [row.b]: PROBE },
            satisfied: satisfiedState(cell, [row.a]),
            expectFields: [row.a, row.b],
            cure: cureSlice(row.cure),
          });
        }
        for (const row of rel.either_or ?? []) {
          const groups = Array.isArray(row.groups) ? row.groups.filter((g): g is readonly string[] => Array.isArray(g)) : [];
          if (groups.length === 0 || groups[0]!.length === 0) continue;
          const first = groups[0]!;
          if (!first.every((n) => statableOnLane(cell, n))) {
            skippedInert.push(`${cell.card}/${cell.variantId}/${cell.quant}: either_or(${groups.map((g) => g.join("+")).join(" / ")}) — the surface owns a named field on this lane`);
            continue;
          }
          census.push({
            cell, word: "either_or",
            label: `half-stated (${first[0]})`,
            breach: { [first[0]!]: PROBE },
            satisfied: satisfiedState(cell, first),
            expectFields: [first[0]!],
            cure: cureSlice(row.cure),
          });
        }
        for (const row of rel.at_most_one ?? []) {
          const fields = Array.isArray(row.fields) ? row.fields.filter((f): f is string => typeof f === "string") : [];
          if (fields.length < 2) continue;
          if (!fields.every((n) => statableOnLane(cell, n))) {
            skippedInert.push(`${cell.card}/${cell.variantId}/${cell.quant}: at_most_one(${fields.join(", ")}) — the surface owns a named field on this lane`);
            continue;
          }
          census.push({
            cell, word: "at_most_one",
            label: `${fields[0]} + ${fields[1]}`,
            breach: { [fields[0]!]: PROBE, [fields[1]!]: PROBE },
            satisfied: satisfiedState(cell, [fields[0]!]),
            expectFields: [fields[1]!],
            cure: cureSlice(row.cure),
          });
        }
      }
    }
  });

  it("the census is not silent (a sweep with no declared relations judges nothing)", () => {
    expect(rosterDead, "offered families with no facts row").toEqual([]);
    expect(roster.length, "offered cells across the fleet").toBeGreaterThan(20);
    expect(census.length, "breach arms derived from the DECLs' own relation rows").toBeGreaterThan(0);
    // the inert roster is the surface-canon's record, not dead weight:
    // a family-wide row whose fields another lane never declares is
    // skipped BY NAME so the census can never silently shrink.
    expect(skippedInert.length).toBeGreaterThan(0);
  });

  it("THE CENSUS: every breach refuses through the real write door, in the DECL's own voice; every satisfied state admits", () => {
    const bad: string[] = [];
    for (const arm of census) {
      const breach = svc.admitStageRelations(arm.cell.card, { ...selectionOf(arm.cell), ...arm.breach });
      if (breach.ok) {
        bad.push(`${arm.cell.card} / ${arm.cell.atom} / ${arm.cell.variantId} / ${arm.cell.quant}: the write door ADMITS the ${arm.word} breach (${arm.label}) — the face can build a state the lane refuses`);
        continue;
      }
      for (const field of arm.expectFields) {
        if (!breach.error.includes(`'${field}'`)) {
          bad.push(`${arm.cell.card} / ${arm.cell.variantId} / ${arm.cell.quant}: the ${arm.word} refusal lost the field voice ('${field}') — ${breach.error}`);
        }
      }
      if (arm.cure !== null && !breach.error.includes(arm.cure)) {
        bad.push(`${arm.cell.card} / ${arm.cell.variantId} / ${arm.cell.quant}: the ${arm.word} refusal lost the DECL's own cure ("…${arm.cure}") — ${breach.error}`);
      }
      const satisfied = svc.admitStageRelations(arm.cell.card, {
        ...selectionOf(arm.cell),
        ...arm.satisfied,
      });
      if (!satisfied.ok) {
        bad.push(`${arm.cell.card} / ${arm.cell.variantId} / ${arm.cell.quant}: the write door refuses the ${arm.word} SATISFIED state (${arm.label}) — ${satisfied.error}`);
      }
    }
    expect(bad, "relation breaches the write door fails to refuse (or lawful states it refuses)").toEqual([]);
  });

  it("THE TOLERANCE LAW: a blank required row admits at the write seat (the write door never grew the run door's incomplete-draft refusal)", () => {
    const bad: string[] = [];
    for (const cell of roster) {
      for (const rel of cell.relations) {
        for (const row of rel.required ?? []) {
          const fields = Array.isArray(row.fields) ? row.fields.filter((f): f is string => typeof f === "string") : [];
          if (fields.length === 0) continue;
          const verdict = svc.admitStageRelations(cell.card, selectionOf(cell));
          if (!verdict.ok && verdict.error.includes("this lane requires")) {
            bad.push(`${cell.card} / ${cell.atom} / ${cell.variantId} / ${cell.quant}: the write seat refuses the blank required row (${fields.join(", ")}) — ${verdict.error}`);
          }
        }
      }
    }
    expect(bad, "the write door judging the run door's incomplete-draft class").toEqual([]);
  });

  it("THE WITNESS (the operator's burn, by name): qwen3-tts CustomVoice builds a half persona and the write door refuses it in the DECL's voice", () => {
    const lane = roster.find((c) => c.atom === "qwen3-tts" && c.variantId === "customvoice");
    expect(lane, "the qwen3-tts CustomVoice cell must be offered (the roster derives it, never a hand list)").toBeDefined();
    if (lane === undefined) return;
    const declared = lane.relations.some((rel) => (rel.together ?? []).some(
      (row) => Array.isArray(row.fields) && row.fields.includes("voice_name") && row.fields.includes("design_prompt"),
    ));
    expect(declared, "the qwen3-tts DECL must still declare the persona pair as together").toBe(true);
    const verdict = svc.admitStageRelations(lane.card, {
      ...selectionOf(lane),
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
    });
    expect(verdict.ok, "the half persona must refuse at the write door").toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("voice_name");
      expect(verdict.error).toContain("design_prompt");
      expect(verdict.error).toContain("qwen3-tts/customvoice");
      expect(verdict.error).toContain("name the voice");
      expect(verdict.error).toContain("drop both");
    }
  });

  it("THE RECUT CANON (signature lanes, 2026-10-12): the persona pair rides the VoiceDesign lane's own surface — the COMPLETE pair admits there, and customvoice refuses the fields outright", () => {
    const design = roster.find((c) => c.atom === "qwen3-tts" && c.variantId === "voicedesign");
    expect(design, "the qwen3-tts VoiceDesign cell must be offered").toBeDefined();
    if (design === undefined) return;
    const complete = svc.admitStageRelations(design.card, {
      ...selectionOf(design),
      voice_name: "harbour-narrator",
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
    });
    expect(complete.ok, `the complete persona must admit on its own lane — ${complete.ok ? "" : complete.error}`).toBe(true);
    // the surface canon: customvoice never declared the pair's fields
    // (the signature recut) — a state carrying voice_name refuses on
    // SURFACE grounds there, named, whether or not the family-wide
    // relation row also fires.
    const custom = roster.find((c) => c.atom === "qwen3-tts" && c.variantId === "customvoice");
    expect(custom).toBeDefined();
    if (custom === undefined) return;
    const surfaceVerdict = svc.admitStageRelations(custom.card, {
      ...selectionOf(custom),
      voice_name: "harbour-narrator",
      design_prompt: "a warm, unhurried narrator with gravel in the low end",
    });
    expect(surfaceVerdict.ok, "customvoice must refuse the persona fields it never declared").toBe(false);
    if (!surfaceVerdict.ok) {
      expect(surfaceVerdict.error).toContain("fires nothing on this lane");
    }
  });

  it("THE TOGGLE PROOF SEAT: the census rides judgeLaneRelations through admitStageRelations (see the receipt for the gated red)", () => {
    // The enforcement ride sits at cardsRegistry.ts laneVerdictCore —
    // judgeLaneRelations([...relations], ...) folded into `judged`.
    // Gate that ride out (filter the relations array to empty) and
    // THE CENSUS reds fleet-wide: every breach arm ADMITS. The
    // receipt carries the verbatim red; this arm pins the ride's
    // home so the toggle instruction never drifts.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..",
        "packages", "harness", "estate-queue", "src", "cardsRegistry.ts"),
      "utf8",
    );
    expect(src, "the write door must ride the shared relation judge (the one spelling)").toContain("judgeLaneRelations([relations], lift)");
  });

  it("hermetic rode (the boot stayed off the live lane)", () => {
    assertHermeticRode();
  });
});
