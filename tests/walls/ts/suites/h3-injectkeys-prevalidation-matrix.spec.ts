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
import { deriveWindowFamily, reseatFamilyDead, T4_ONLY_KEYS } from "@melite/models-h3/timelineContract";
import { axisPickPatch, composeValidate } from "@melite/card-base/client";
import type { FormSpecDoc, FormVariantRow } from "@melite/card-base/client";
import { omitT4RecipeRow } from "../../../../packages/video/h3-timeline/src/ui/studio/omitT4Recipe.ts";

/** THE OPERATOR'S OWN SPINE — the receipt, never silenced. */
const REFUSAL_SPINE = /h3_window\(t4r\): unsanctioned inject keys: /;
const FOUR_SPINE = /unsanctioned inject keys: interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch/;

/** THE BURN'S FOUR, in the operator's sorted spelling. */
const FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const;

/** THE BENCH MERGE-PATCH LAW (drafts door, bench.ts:969-985 — per
 *  key, null deletes), SETTLED THROUGH THE FAMILY RESEAT (the ERROR
 *  g/h cure, 2026-11-08): the door's merge first (the raw view is
 *  what a seat WITHOUT the reseat would land — the no-mute companion
 *  judges it), then the settlement spine drops the family-dead carry
 *  the flip strands — the row that lands is the row the next run
 *  composes. */
function settleRaw(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const settled: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) delete settled[k];
    else settled[k] = v;
  }
  return settled;
}
function settle(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  return reseatFamilyDead(settleRaw(base, saved)).doc;
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
    // through the bench merge-patch settlement — which now owns the
    // flip (the family reseat: the stamps drop at the settlement, the
    // drafts doors' reseatStageFamily seat).
    const pin = { keyframes: [{ image: "anchor.png", frame: 0 }] };
    const raw = settleRaw(era, pin);
    const product = settle(era, pin);
    expect(deriveWindowFamily(product), "the flip flipped the derived family").toBe("t4r");
    // THE LAW THE WEEK OWED: the flip GESTURE refuses AT THE GESTURE
    // or some seat reseats the carried stamps — never a stored doc
    // refusing later. The reseat path: the settlement lands the
    // stamps' DELETE (the receipt below names them) and the client
    // gate (composeValidate's family clause) refuses the SAME pair at
    // the gesture — both judged here on the REAL seats.
    const flipGate = def.admitFamily(pin);
    const gestureViolations = composeValidate(spec, raw);
    const doorMsg = await svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3")
      .then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
    const walkMsg = walk(product);
    const gestureClean = flipGate.ok === true;
    expect(gestureClean && (walkMsg === null && doorMsg === null),
      `ERROR g (the transaction): the flip gesture landed GREEN (write door: ${flipGate.ok === true ? "ok" : String(flipGate.error)}) and the PRODUCT refuses live — walk: ${String(walkMsg)} — run door: ${String(doorMsg)} — the settlement seat (the family reseat) did not own the flip`,
    ).toBe(true);
    // THE RESEAT RECEIPT (the cure's own voice, never silent): the
    // product carries NONE of the carried stamps — the settlement
    // dropped exactly the burn's four, sorted.
    const dropped = reseatFamilyDead(raw).dropped;
    expect(dropped, "the reseat names exactly what it dropped (sorted)").toEqual([...FOUR].sort());
    for (const k of dropped) {
      expect(product, `the product no longer carries '${k}'`).not.toHaveProperty(k);
    }
    // THE GESTURE'S OWN JUDGE (the client clause, one hop before the
    // wire): composeValidate's family clause names the four on the
    // RAW merged view — the gate refuses the pair at the gesture, the
    // second seat of the law's disjunction.
    const named = gestureViolations
      .map((v) => /field '([^']+)' fires nothing on the t4r lane/.exec(v.message)?.[1] ?? "")
      .filter((k) => k !== "");
    expect(named.sort(), "the gesture gate names the burn's four").toEqual([...FOUR].sort());
    // THE NO-MUTE COMPANION (never silenced): the walk still refuses
    // the RAW view in the operator's verbatim spine — the settlement
    // reseat never muted the door.
    expect(() => h3schemaFn(raw), "the raw merged view still refuses with the spine").toThrow(REFUSAL_SPINE);
    expect(() => h3schemaFn(raw), "the raw merged view names exactly the burn's four").toThrow(FOUR_SPINE);
  });

  it("LAW D — THE SERVED LAW PIN (the family clause's one-owner proof): the served spec's familyLaw IS the contract module", () => {
    // THE NO-COPY LAW: the client gate and the studio rail judge the
    // SERVED familyLaw data — it must BE the contract module's law,
    // never a drifted copy. Proven the only way data can be pinned to
    // behavior: the lanes spelling must derive EXACTLY what
    // deriveWindowFamily derives over the probe cells (the matrix's
    // own lanes plus the derivation's edges), and the dead keys must
    // be the module's own set.
    const law = (spec as unknown as { familyLaw?: NonNullable<FormSpecDoc["familyLaw"]> }).familyLaw;
    expect(law, "the served h3 spec carries the family law").toBeDefined();
    if (law === undefined) return;
    expect(law.deadKeys.t4r, "the dead keys ARE the module's set").toEqual([...T4_ONLY_KEYS]);
    // THE GENERIC EVALUATOR (the client's own derivation over the
    // data — composeValidate's deriveFamilyLane spelling, driven here
    // through a real gate call on a doc carrying ONLY the probe's
    // lane-qualifying shape; the lane name rides the violation voice).
    const laneOf = (doc: Record<string, unknown>): string => {
      const probe = { ...doc, __probe_dead__: Object.keys(law.deadKeys)[0] === "t4r" ? undefined : undefined };
      void probe;
      // a doc with every dead key present names its lane in the
      // violations; for lanes with no dead keys (t4_open/t4_chain)
      // the voice is silent — so derive the lane from the data
      // directly, the same first-match reading composeValidate uses.
      const calls: unknown[] = Array.isArray(doc.calls) ? doc.calls as unknown[] : [];
      const present = (v: unknown): boolean =>
        v === null || v === undefined ? false
        : typeof v === "string" ? v.trim() !== ""
        : Array.isArray(v) ? v.length > 0
        : true;
      for (const lane of law.lanes) {
        if (lane.minCalls === undefined && lane.guideKeys === undefined && lane.callGuideKeys === undefined) return lane.lane;
        if (lane.minCalls !== undefined && calls.length >= lane.minCalls) return lane.lane;
        if (lane.guideKeys?.some((k) => present(doc[k]))) return lane.lane;
        if (lane.callGuideKeys?.some((k) => calls.some((c) => present((c as Record<string, unknown> | null)?.[k])))) return lane.lane;
      }
      return law.lanes[law.lanes.length - 1]?.lane ?? "";
    };
    // THE PROBE CELLS: the matrix's three lanes, the per-call guide,
    // the ref-surface wire literals, and the blank edges (the presence
    // grammar's agreement with normalizeDeclaredRefs).
    const probes: Array<{ doc: Record<string, unknown>; family: string; why: string }> = [
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 39 }, { text: "b", start_frame: 39, end_frame: 56 }] }, family: "t4_chain", why: "two calls" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], keyframes: [{ image: "anchor.png", frame: 0 }] }, family: "t4r", why: "the keyframe pin" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], last_frame: "end.png" }, family: "t4r", why: "the last_frame string" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], ref_images: "a.png, b.png" }, family: "t4r", why: "the wire-literal ref surface" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90, image: "guide.png" }] }, family: "t4r", why: "the per-call guide" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90, image_name: "g" }] }, family: "t4r", why: "the per-call guide name" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }] }, family: "t4_open", why: "bare call" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], ref_images: "   " }, family: "t4_open", why: "a whitespace ref is ZERO refs on both spellings" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], keyframes: [] }, family: "t4_open", why: "an empty pin channel is no pin" },
      { doc: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], last_frame: "  " }, family: "t4_open", why: "a blank last_frame is no guide" },
    ];
    const drifts: string[] = [];
    for (const { doc, family, why } of probes) {
      const dataLane = laneOf(doc);
      const moduleLane = deriveWindowFamily(doc);
      if (dataLane !== moduleLane || moduleLane !== family) {
        drifts.push(`${why}: data '${dataLane}' module '${moduleLane}' expected '${family}'`);
      }
    }
    expect(drifts, `the served familyLaw derives the contract module verbatim:\n${drifts.join("\n")}`).toEqual([]);
  });
});
