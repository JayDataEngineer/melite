/**
 * h3-injectkeys-prevalidation-matrix.spec.ts — THE PRE-VALIDATION
 * SEAT (ERROR g, audit §3 SD-3; journey law §2 hop [3]→[4] with the
 * gestures at hop [1]→[2]). The operator's burn: "a week of
 * pre-validation, and it still fired LIVE" — the compose gate refused
 * a write that never left the studio with the operator's own spine:
 * THE COMPOSE GATE REFUSED — card 'h3-timeline' refused params:
 * h3_window(t4r): unsanctioned inject keys: interpolate_enabled,
 * second_pass_enabled, sharpen_enabled, sr_switch.
 *
 * WHY THE WEEK STAYED GREEN: every single-write judge was walked —
 * the pick gate (omitT4RecipeRow), the bench write door's family arm
 * (admitFamily, card.ts:220), the compose gate's variant/envelope
 * judge (composeValidate), the run door's walk (schema.ts:573-601) —
 * each judged ITS OWN write legal. The burn lives in the
 * TRANSACTION: a Final-Cut pick sanctioned on the open lane, THEN a
 * keyframe pin (agent patch / tool write / any non-studio arrival —
 * useShownDoc.ts:226-231's honest edge) that flips the derived family
 * under the carried stamps. No seat owns the pair; the product
 * refuses at the next compose.
 *
 * THE WALL: the suite-level DECL matrix — every served variant row ×
 * every served recipe row × every derived lane (t4_open / t4r /
 * t4_chain, assembled through deriveWindowFamily's OWN derivation:
 * 1 text call / +keyframes / 2 tiled calls) × the doc carrying the
 * burn's four booleans or carrying none. 36 cells, judged by the REAL
 * seats — the walk (h3schemaFn), the write door (def.admitFamily),
 * the row gate (omitT4RecipeRow), the run door (svc.phase1Card) for
 * the era and the product. NO FROZEN FIXTURES: rows come from
 * formSpecArm over the booted estate, the key set from the contract
 * module the walk itself reads.
 *
 * THE LAWS:
 *   A. NO SANCTIONED CELL REFUSES — a cell whose doc carries no
 *      family-dead key on its derived lane passes the walk AND the
 *      write door clean.
 *   B. NO UNSANCTIONED CELL PASSES SILENTLY — a t4r cell carrying any
 *      T4_ONLY key is refused by BOTH the walk (the operator's spine)
 *      and the write door.
 *   C. THE TRANSACTION CELL (PRE-REGISTERED RED) — the era (t4_open +
 *      Final Cut + the four booleans) is green at every single-write
 *      judge; the keyframe flip lands with NO seat refusing the
 *      gesture; the product refuses at the walk and the run door. The
 *      law the week owed: the flip gesture refuses AT THE GESTURE or
 *      reseats the stamps — never a stored doc refusing later.
 */
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import "../../../helpers/boot-models.ts";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import type {} from "../../../../packages/harness/estate-queue/src/service.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schema as h3schemaFn } from "@melite/models-h3/schema";
import { deriveWindowFamily, T4_ONLY_KEYS } from "@melite/models-h3/timelineContract";
import { axisPickPatch } from "@melite/card-base/client";
import type { FormSpecDoc, FormVariantRow } from "@melite/card-base/client";
import { omitT4RecipeRow } from "../../../../packages/video/h3-timeline/src/ui/studio/omitT4Recipe.ts";

/** THE OPERATOR'S OWN SPINE — the receipt, never silenced. */
const REFUSAL_SPINE = /h3_window\(t4r\): unsanctioned inject keys: /;
const FOUR_SPINE = /unsanctioned inject keys: interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch/;

/** THE BURN'S FOUR, in the operator's sorted spelling. */
const FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const;

/** THE BENCH MERGE-PATCH LAW (drafts door, bench.ts:969-985 — per
 *  key, null deletes): the settlement every write lands through. */
function settle(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const settled: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) delete settled[k];
    else settled[k] = v;
  }
  return settled;
}

/** THE LANES, assembled through deriveWindowFamily's own derivation
 *  (timelineContract.ts:80): calls.length>1 → t4_chain; a guide
 *  (keyframes / refs / last_frame) → t4r; else t4_open. */
const LANES: Array<{ lane: string, assemble: () => Record<string, unknown> }> = [
  {
    lane: "t4_open",
    assemble: () => ({
      seed: 7, width: 768, height: 448, steps: 12,
      calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
    }),
  },
  {
    lane: "t4r",
    assemble: () => ({
      seed: 7, width: 768, height: 448, steps: 12,
      calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "anchor.png", frame: 0 }],
    }),
  },
  {
    lane: "t4_chain",
    assemble: () => ({
      seed: 7, width: 768, height: 448, steps: 12,
      // the tiled cut rides the walk's own window grid (a first or
      // cut window is 22+17k, a carried window's span 17f): 0→39 is
      // the 22+17 first window, 39→56 the carried 17f span.
      calls: [
        { text: "the harbour holds its breath", start_frame: 0, end_frame: 39 },
        { text: "then the tide turns", start_frame: 39, end_frame: 56 },
      ],
    }),
  },
];

/** THE BOOLEAN AXIS: the doc carrying the burn's four (the Final-Cut
 *  era's honest state — sharpen/interpolate stated FALSE is still a
 *  STATED key to the walk) versus carrying none. */
const BOOLEAN_AXES: Array<{ axis: string, state: Record<string, unknown> }> = [
  {
    axis: "four-stated",
    state: { second_pass_enabled: true, sr_switch: true, sharpen_enabled: false, interpolate_enabled: false },
  },
  { axis: "unstated", state: {} },
];

/** The DECL's own cell law: a cell is UNSANCTIONED iff its assembled
 *  doc derives t4r while carrying any T4_ONLY key — the exact
 *  judgment the walk (schema.ts:573-577) and the write door
 *  (card.ts:220) speak. No copy: T4_ONLY_KEYS rides the contract
 *  module, the family rides the contract's own derivation. */
function unsanctioned(doc: Record<string, unknown>): boolean {
  if (deriveWindowFamily(doc) !== "t4r") return false;
  const explicit = new Set(Object.keys(doc));
  return (T4_ONLY_KEYS as readonly string[]).some((k) => explicit.has(k));
}

describe("THE PRE-VALIDATION SEAT (the DECL matrix wall — no sanctioned cell refuses; no unsanctioned cell passes silently; the transaction reds)", () => {
  let svc: CardRegistryService;
  let spec: NonNullable<Awaited<ReturnType<typeof formSpecArm>>>;
  let def: NonNullable<Awaited<ReturnType<typeof loadCardDefs>>["get"]>;

  beforeAll(async () => {
    const ctx = new Context();
    ;(ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "prevalidation-matrix-")),
      stateRoots: [] as string[],
    };
    svc = new CardRegistryService(ctx);
    await svc.prime();
    assertHermeticRode();
    installLaneStoreOverlay();
    const served = await formSpecArm("h3");
    if (served === null) throw new Error("the served h3 form-spec did not answer — the matrix walks the REAL DECL rows, not fixtures");
    spec = served;
    def = (await loadCardDefs()).get("h3-timeline")!;
    if (def === undefined) throw new Error("the composition root serves no h3-timeline card def");
  }, 120_000);
  afterAll(() => { restoreLaneStoreOverlay() });

  /** The matrix's row axes, derived from the served DECL: the Variant
   *  group and the Recipe group, verbatim rows. */
  function rowsOf(group: string): FormVariantRow[] {
    const rows = (spec as unknown as { variants?: Array<Record<string, unknown>> }).variants ?? [];
    return rows.filter((r) => r.group === group).map((r) => r as unknown as FormVariantRow);
  }

  /** Assemble one cell: lane base ← variant pick stamp ← recipe pick
   *  stamp ← boolean axis. The stamps ride axisPickPatch — the SAME
   *  shape the ModelAxes' pick and the recipe pills land (spec.ts:
   *  1105) — never a hand transcription of wire_defaults. */
  function cell(laneAssemble: () => Record<string, unknown>, variantRow: FormVariantRow | null, recipeRow: FormVariantRow | null, booleanState: Record<string, unknown>): Record<string, unknown> {
    let doc = laneAssemble();
    if (variantRow !== null) doc = { ...doc, ...axisPickPatch(spec, variantRow, {}) };
    if (recipeRow !== null) doc = { ...doc, ...axisPickPatch(spec, recipeRow, {}) };
    return { ...doc, ...booleanState };
  }

  /** The walk's verdict (the run door's own clause). */
  function walk(doc: Record<string, unknown>): string | null {
    try {
      h3schemaFn(doc);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  it("LAWS A+B (the matrix): every cell of the served DECL — no sanctioned cell refuses, no unsanctioned cell passes silently", () => {
    const variantRows = rowsOf("Variant");
    const recipeRows = rowsOf("Recipe");
    expect(variantRows.length, "the served DECL carries the Variant rows").toBeGreaterThan(0);
    expect(recipeRows.length, "the served DECL carries the Recipe rows").toBeGreaterThan(0);
    const violations: string[] = [];
    let cells = 0;
    for (const { lane, assemble } of LANES) {
      for (const v of variantRows) {
        for (const r of recipeRows) {
          for (const { axis, state } of BOOLEAN_AXES) {
            cells += 1;
            const doc = cell(assemble, v, r, state);
            const derived = deriveWindowFamily(doc);
            expect(derived, `the cell's lane derives through the contract (${lane} assembled → ${derived})`).toBe(lane);
            const bad = unsanctioned(doc);
            const walkMsg = walk(doc);
            const admit = def.admitFamily(doc);
            if (!bad) {
              // LAW A: sanctioned cells pass BOTH real seats clean.
              if (walkMsg !== null) violations.push(`LAW A refused a sanctioned cell (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}): walk — ${walkMsg}`);
              if (admit.ok !== true) violations.push(`LAW A refused a sanctioned cell (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}): write door — ${String(admit.error)}`);
            } else {
              // LAW B: unsanctioned cells are refused by BOTH seats,
              // in the operator's own voice.
              if (walkMsg === null) violations.push(`LAW B: an unsanctioned cell passed the walk silently (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis})`);
              else if (!REFUSAL_SPINE.test(walkMsg)) violations.push(`LAW B: the walk's refusal lost the spine (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}): ${walkMsg}`);
              if (admit.ok !== false) violations.push(`LAW B: the write door admitted an unsanctioned cell silently (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis})`);
            }
          }
        }
      }
    }
    expect(violations, `the matrix's own laws held:\n${violations.join("\n")}`).toEqual([]);
    // THE CENSUS, derived never frozen: 3 lanes × the served Variant
    // rows × the served Recipe rows × the 2 boolean axes.
    expect(cells, "the full matrix walked (3 lanes × variant rows × recipe rows × 2 boolean axes)")
      .toBe(LANES.length * variantRows.length * recipeRows.length * BOOLEAN_AXES.length);
    // THE ROW GATE, the DECL matrix's offer-side control (the J4
    // negative control omitT4Recipe.ts names): a recipe whose stamp
    // intersects the family-dead keys is not offered on t4r — the
    // Final Cut row must be judged off the t4r lane and offered on
    // the open lane.
    const finalRow = recipeRows.find((r) => r.id === "final");
    expect(finalRow, "the served DECL carries the Final Cut row").toBeDefined();
    if (finalRow !== undefined) {
      expect(omitT4RecipeRow(spec, finalRow), "the row gate judges Final Cut's stamp family-dead (sr_switch ∈ T4_ONLY) — the row-level J4 control").toBe(true);
    }
  });

  it("LAW C — THE TRANSACTION CELL (ERROR g, red): every single-write judge green at its gesture, the flip green, the product refused LIVE", async () => {
    const recipeRows = rowsOf("Recipe");
    const finalRow = recipeRows.find((r) => r.id === "final");
    expect(finalRow, "the served DECL carries the Final Cut row").toBeDefined();
    const open = LANES[0]!;
    // THE ERA: the open lane carries the Final Cut stamps and the four
    // booleans — the Final-Cut era of the doc, every stamp sanctioned
    // HERE. Every single-write judge of the era is green, at the REAL
    // seats, in order:
    const era = cell(open.assemble, null, finalRow ?? null, BOOLEAN_AXES[0]!.state);
    expect(deriveWindowFamily(era), "the era's own derived lane is t4_open").toBe("t4_open");
    expect(omitT4RecipeRow(spec, finalRow ?? {}), "the pick's own judge offered the row (the row gate's lane condition lives at the caller — the open lane consults nothing)").toBe(true);
    expect(walk(era), "the era doc passes the walk clean").toBeNull();
    expect(def.admitFamily(era).ok, "the era doc passes the write door clean").toBe(true);
    await expect(svc.phase1Card({ ...era, card: "h3-timeline", model: "h3" }, "h3"),
      "the era composes at the REAL run door (the pick's pre-validation, green)").resolves.toBeDefined();
    // THE FLIP: the keyframe pin rides a params patch (the agent
    // patch / tool write shape — the exact keys such a write carries)
    // through the bench merge-patch settlement. No studio writer
    // re-runs the emit law (useShownDoc.ts:20-28 is commit-bound).
    const pin = { keyframes: [{ image: "anchor.png", frame: 0 }] };
    const product = settle(era, pin);
    expect(deriveWindowFamily(product), "the flip flipped the derived family").toBe("t4r");
    // THE LAW THE WEEK OWED: the flip GESTURE must refuse AT THE
    // GESTURE or some seat must reseat the carried stamps. The
    // arrival's own judge — the write door's family arm on the patch
    // BODY (the shape a keyframe pin rides: the merged-view judge at
    // card.ts:220 never sees this arrival — the studio's caller-wins
    // merge, stage-drill.tsx:507-517, and body-judging doors land it
    // unstopped) — must catch the landing, for the product the next
    // compose refuses is the gesture's own output.
    const flipGate = def.admitFamily(pin);
    const doorMsg = await svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3")
      .then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
    const walkMsg = walk(product);
    const gestureClean = flipGate.ok === true;
    expect(gestureClean && (walkMsg === null && doorMsg === null),
      `ERROR g (the transaction): the flip gesture landed GREEN (write door: ${flipGate.ok === true ? "ok" : String(flipGate.error)}) and the PRODUCT refuses live — walk: ${String(walkMsg)} — run door: ${String(doorMsg)} — ` +
      `every single-write pre-validation of the era was green (row gate, walk, write door, run door above) and NO seat owns the pair (the pick at t4_open + the keyframe pin) — the stored doc refuses LATER, the exact live-fire (SD-3: the emit/judge dialect split, docHydrate.ts:437-439 commit-bound + schema.ts:573-577 presence at the door). The cure: the flip gesture refuses AT THE GESTURE or reseats the stamps — never a stored doc refusing later.`,
    ).toBe(true);
    // THE HONEST RECEIPT (never silenced): the product's refusal is
    // the operator's verbatim spine — the four keys, sorted.
    expect(walkMsg ?? doorMsg ?? "", "the product's refusal carries the operator's spine").toMatch(REFUSAL_SPINE);
    expect(walkMsg ?? doorMsg ?? "", "the product's refusal names exactly the burn's four").toMatch(FOUR_SPINE);
  });
});
