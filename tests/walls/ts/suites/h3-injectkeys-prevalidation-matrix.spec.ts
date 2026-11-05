/**
 * h3-injectkeys-prevalidation-matrix.spec.ts — THE PRE-VALIDATION
 * SEAT, RE-AIMED AT THE FIRED STATE (the lane-law retirement,
 * 2026-11-15). The historical burn: "a week of pre-validation, and it
 * still fired LIVE" — the compose gate refused a write that never
 * left the studio with the operator's own spine:
 * THE COMPOSE GATE REFUSED — card 'h3-timeline' refused params:
 * h3_window(t4r): unsanctioned inject keys: interpolate_enabled,
 * second_pass_enabled, sharpen_enabled, sr_switch.
 *
 * THE ROOT CAUSE the 2026-11-15 cure removed: renderH3Window's t4r
 * arm went straight from decode to CreateVideo and never mounted the
 * image-space post chain, so four separate courts (the walk, the card
 * admission, the pick verdict, the rail's omit/emit-strip) refused
 * the post keys on that lane instead of firing them. The chain is now
 * HOISTED ABOVE the family branch: the t4r arm mounts SeedVR2 /
 * ImageSharpenKJ / FrameInterpolate exactly as the else arm does.
 *
 * THE WALL, re-aimed: the suite-level DECL matrix — every served
 * variant row × every served recipe row × every derived lane
 * (t4_open / t4r / t4_chain, assembled through deriveWindowFamily's
 * OWN derivation) × the doc carrying the finish quartet or carrying
 * none. Every cell must pass the walk, the write door and (on a
 * representative per lane) the RUN DOOR — a lane where a stated
 * finish key fires nothing is the class this wall exists to catch.
 * The surviving single-window omission is the film-only knob
 * (duck_depth_db): sanctioned on t4_chain, refused by the walk and
 * the run door on t4r/t4_open, and withheld from the rail by
 * omitFilmRecipeRow. NO FROZEN FIXTURES: rows come from formSpecArm
 * over the booted estate.
 *
 * THE LAWS:
 *   A. NO CELL REFUSES — every served cell passes the walk, the
 *      write door and the run door; the finish quartet is lawful on
 *      every lane because the chain fires there.
 *   B. THE FILM-ONLY LETTER KEEPS ITS TEETH — a single-window doc
 *      stating duck_depth_db is refused by the walk (and by the run
 *      door), while the chain doc composes it; the row gate withholds
 *      a row whose stamp is film-only.
 *   C. THE TRANSACTION — the t4_open era carrying the Final Cut
 *      stamps, flipped to t4r by a keyframe pin, lands with its
 *      stamps INTACT and composes at the run door; no reseat drops
 *      them (the settlement is the plain merge-patch law now).
 *   D. THE SERVED LAW PIN — the served familyLaw still derives the
 *      contract module's lanes verbatim; deadKeys is empty (the
 *      retirement's own receipt).
 *   E. THE NULL LAW — an explicit null on a finish key is UNSTATED at
 *      both seats, one grammar.
 *   F. THE DECLARATION JUDGE — familyLawDrift still reds an orphan or
 *      empty declaration at boot; the h3 seat settles nothing.
 */
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import "../../../helpers/boot-models.ts";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import type {} from "../../../../packages/harness/estate-queue/src/service.ts";
import { CardRegistryService, familyLawDrift } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { getModel, loadCardDefs } from "@melite/comfyui-cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schema as h3schemaFn } from "@melite/models-h3/schema";
import { deriveWindowFamily, FAMILY_LAW } from "@melite/models-h3/timelineContract";
import { axisPickPatch, composeValidate } from "@melite/card-base/client";
import type { FormSpecDoc, FormVariantRow } from "@melite/card-base/client";
import { omitFilmOnlyField, omitFilmRecipeRow } from "../../../../packages/video/h3-timeline/src/ui/studio/omitLaneRecipe.ts";

/** THE FINISH QUARTET + the route — the burn's keys, lawful on every
 *  lane since the chain hoist (2026-11-15). The sorted spelling is
 *  the walk's own voice when a genuine orphan key appears. */
const FINISH = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch", "upscale_route"] as const;

/** THE FILM-ONLY LETTER — read solely by the multi-window mix
 *  (computeFilmMix), so a single-window doc stating it is the class
 *  the walk still refuses. */
const FILM_ONLY = "duck_depth_db";

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
  // THE MERGE-PATCH LAW (the retirement's shape): per key, null
  // deletes — and nothing else. The old family reseat dropped the
  // burn's quartet on a t4r flip; since the chain fires there, the
  // quartet is a stated truth the settlement carries untouched.
  return settleRaw(base, saved);
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

/** THE SURVIVING CELL LAW: a cell is a FILM-ONLY LETTER iff its
 *  assembled doc states duck_depth_db on a lane that is not the
 *  multi-window chain — the exact judgment schema.ts's FILM_ONLY
 *  gate speaks. */
function filmOnlyLetter(doc: Record<string, unknown>): boolean {
  return deriveWindowFamily(doc) !== "t4_chain" && Object.keys(doc).includes(FILM_ONLY);
}

describe("THE PRE-VALIDATION SEAT, re-aimed (the matrix — no served cell refuses; the film-only letter keeps its teeth; the flip keeps its stamps)", () => {
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

  it("LAW A — every served cell passes the walk and the write door, and the finish quartet fires at the run door on EVERY lane (the retirement's positive matrix)", async () => {
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
            // THE FINISH QUARTET IS LAW ON EVERY LANE: no cell claims
            // a dead letter; the walk and the write door must agree.
            if (filmOnlyLetter(doc)) violations.push(`a served cell states the film-only letter (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}) — the DECL must not ship it`);
            const walkMsg = walk(doc);
            const admit = svc.admitStageFamily("h3-timeline", doc);
            if (walkMsg !== null) violations.push(`LAW A refused a served cell (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}): walk — ${walkMsg}`);
            if (admit.ok !== true) violations.push(`LAW A refused a served cell (lane ${lane}, variant ${String(v.id)}, recipe ${String(r.id)}, ${axis}): write door — ${String(admit.error)}`);
          }
        }
      }
    }
    expect(violations, `the matrix's own laws held:\n${violations.join("\n")}`).toEqual([]);
    // THE CENSUS, derived never frozen: 3 lanes × the served Variant
    // rows × the served Recipe rows × the 2 boolean axes.
    expect(cells, "the full matrix walked (3 lanes × variant rows × recipe rows × 2 boolean axes)")
      .toBe(LANES.length * variantRows.length * recipeRows.length * BOOLEAN_AXES.length);
    // THE ROW GATE, the offer side: the Final Cut row's stamps are
    // lawful on every lane now — the pill rides everywhere.
    const finalRow = recipeRows.find((r) => r.id === "final");
    expect(finalRow, "the served DECL carries the Final Cut row").toBeDefined();
    if (finalRow !== undefined) {
      expect(omitFilmRecipeRow(spec, finalRow), "the Final Cut row is OFFERED on the reference lane — its stamps fire there").toBe(false);
    }
    // THE RUN DOOR ON EVERY LANE (the fourth court the burn crossed):
    // the same four-stated doc must compose — a lane whose arm skips
    // the post chain would resolve here with the stamps landing in no
    // node, which is exactly the refused-doc class this wall names.
    for (const { lane, assemble } of LANES) {
      const doc = cell(assemble, null, finalRow ?? null, BOOLEAN_AXES[0]!.state);
      expect(deriveWindowFamily(doc), `the door cell derives ${lane}`).toBe(lane);
      await expect(
        svc.phase1Card({ ...doc, card: "h3-timeline", model: "h3" }, "h3"),
        `${lane}: the finish quartet composes at the real run door`,
      ).resolves.toBeDefined();
    }
  });

  it("LAW B — the film-only letter keeps its teeth: t4_chain composes duck_depth_db; the single-window lanes refuse it at the walk AND the run door; the row gate withholds a film-stamped row", async () => {
    // THE SANCTIONED LEG (the positive control — a gate that refused
    // duck_depth_db everywhere would pass the other half while
    // breaking the mix desk): the chain doc carries it clean.
    const chainBase = LANES.find((l) => l.lane === "t4_chain")!.assemble();
    const chainDoc = { ...chainBase, [FILM_ONLY]: -14 };
    expect(walk(chainDoc), "the multi-window chain composes the mix-desk knob").toBeNull();
    await expect(svc.phase1Card({ ...chainDoc, card: "h3-timeline", model: "h3" }, "h3"),
      "the chain's mix-desk knob reaches the run door").resolves.toBeDefined();
    // THE SINGLE-WINDOW LEGS: the walk refuses BY NAME, and the run
    // door (which rides the walk) refuses the same doc — one spelling.
    for (const lane of ["t4r", "t4_open"] as const) {
      const base = LANES.find((l) => l.lane === lane)!.assemble();
      const doc = { ...base, [FILM_ONLY]: -14 };
      const msg = walk(doc);
      expect(msg, `${lane}: the walk refuses the film-only letter`).toMatch(new RegExp(FILM_ONLY));
      await expect(svc.phase1Card({ ...doc, card: "h3-timeline", model: "h3" }, "h3"),
        `${lane}: the run door refuses the film-only letter too`).rejects.toThrow(new RegExp(FILM_ONLY));
      // and the FIELD predicate agrees with the walk's one spelling
      expect(omitFilmOnlyField(FILM_ONLY), "omitFilmOnlyField reads the same set").toBe(true);
    }
    // THE ROW GATE'S TEETH (a row stamping the film-only key is
    // withheld; a geometry-only row still rides)
    const filmRow = { id: "film_mix", label: "Film Mix", group: "Recipe", defaults: { [FILM_ONLY]: -18 },
      route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" };
    expect(omitFilmRecipeRow(spec, filmRow), "a row stamping duck_depth_db is withheld").toBe(true);
    const draftRow = rowsOf("Recipe").find((r) => !omitFilmRecipeRow(spec, r));
    expect(draftRow, "the DECL carries at least one film-legal recipe row").toBeDefined();
    expect(omitFilmRecipeRow(spec, draftRow), "a clean row still rides").toBe(false);
  });

  it("LAW C — THE TRANSACTION: the t4_open era carrying the Final Cut stamps, flipped to t4r by a keyframe pin, keeps its stamps through the settlement and composes at the run door", async () => {
    const recipeRows = rowsOf("Recipe");
    const finalRow = recipeRows.find((r) => r.id === "final");
    expect(finalRow, "the served DECL carries the Final Cut row").toBeDefined();
    const open = LANES[0]!;
    // THE ERA: the open lane carries the Final Cut stamps and the
    // finish quartet — lawful here, and lawful after the flip.
    const era = cell(open.assemble, null, finalRow ?? null, BOOLEAN_AXES[0]!.state);
    expect(deriveWindowFamily(era), "the era's own derived lane is t4_open").toBe("t4_open");
    expect(omitFilmRecipeRow(spec, finalRow ?? {}), "the pick's own judge offers the row on the open lane").toBe(false);
    expect(walk(era), "the era doc passes the walk clean").toBeNull();
    expect(svc.admitStageFamily("h3-timeline", era).ok, "the era doc passes the write door clean").toBe(true);
    await expect(svc.phase1Card({ ...era, card: "h3-timeline", model: "h3" }, "h3"),
      "the era composes at the REAL run door").resolves.toBeDefined();
    // THE FLIP: the keyframe pin rides a params patch through the
    // bench merge-patch settlement (per key, null deletes — nothing
    // else). The product derives t4r with the stamps standing.
    const pin = { keyframes: [{ image: "anchor.png", frame: 0 }] };
    const product = settle(era, pin);
    expect(deriveWindowFamily(product), "the flip flipped the derived family").toBe("t4r");
    for (const k of ["second_pass_enabled", "sr_switch", "sharpen_enabled", "interpolate_enabled"] as const) {
      expect(product[k], `the flip NEVER strips the operator's stated '${k}'`).toBe(era[k]);
    }
    // THE PRODUCT COMPOSES — the burn's exact pair is lawful now: the
    // walk, the write door and the run door all land it.
    expect(walk(product), "the flipped product passes the walk").toBeNull();
    expect(svc.admitStageFamily("h3-timeline", product).ok, "the flipped product passes the write door").toBe(true);
    await expect(svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3"),
      "the flipped product composes at the run door — the burn's exact pair").resolves.toBeDefined();
    // NO RESEAT EXISTS: the seat resolves the DECL's law and drops
    // nothing on h3 (deadKeys is empty) — the retirement's receipt.
    const seat = svc.reseatStageFamily("h3-timeline", product, era);
    expect(seat, "the seat resolves h3's family law off the DECL").not.toBeNull();
    expect(seat?.dropped ?? ["<null>"], "nothing is dropped on a lane that fires the stamps").toEqual([]);
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
    expect(law.deadKeys, "the retirement leaves NO lane dead letters — every lane fires its chain").toEqual({});
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

  it("LAW E — THE NULL LAW (one grammar): an explicit null on a finish key is UNSTATED at both seats", async () => {
    // THE PLATFORM'S ONE NULL LAW (the drill null-set precedent +
    // the 21 lane's journey-PASSed null→200): null is the switch
    // verbs' delete mark — an arrival door that reads null as stated
    // re-opens the exact gap ERROR g burned through (a gate that
    // promises [] while the walk refuses 400).
    const recipeRows = rowsOf("Recipe");
    const finalRow = recipeRows.find((r) => r.id === "final");
    const open = LANES[0]!;
    const era = cell(open.assemble, null, finalRow ?? null, BOOLEAN_AXES[0]!.state);
    const pin = { keyframes: [{ image: "anchor.png", frame: 0 }] };
    const nulled = { ...settle(era, pin), ...Object.fromEntries(FINISH.map((k) => [k, null])) };
    expect(deriveWindowFamily(nulled), "the null-carried doc is still t4r").toBe("t4r");
    expect(composeValidate(spec, nulled), "the gate reads null-carried keys as unstated").toEqual([]);
    expect(walk(nulled), "the walk reads null-carried keys as unstated — ONE null law").toBeNull();
    // THE COMPOSE DOOR'S OWN NULL GRAMMAR (a different seat, never a
    // lane law): the arrival door refuses an explicit null on a key
    // whose declaration carries a default — "send a real value or
    // omit the key". That refusal is lane-blind and predates the
    // retirement; the walk's unstated reading is what the studio's
    // delete rides on.
    await expect(svc.phase1Card({ ...nulled, card: "h3-timeline", model: "h3" }, "h3"),
      "the compose door refuses null-carried keys outright (its own arrival grammar)")
      .rejects.toThrow(/is null but its declaration carries a default/);
  });

  it("LAW F — THE DECLARATION JUDGE (the one-seat migration, 2026-11-12): the registry's reseatStageFamily resolves the MODEL DECL's law and drops nothing after the retirement; familyLawDrift reds a law nobody can derive", async () => {
    // THE ROW'S OWN GATE (ROADMAP, the one-seat destination): a wall
    // arm drives the lane-declaration path itself — the DECL names
    // its law, the registry's seat derives from it, never from a
    // card face. The service above IS the primed real registry.
    // (1) THE FLIP CARRIES ITS STAMPS: a t4_open era carrying the
    // finish quartet under a keyframe pin — the merged view derives
    // t4r, and nothing drops.
    const open = LANES[0]!;
    const era = cell(open.assemble, null, null, null);
    const prior: Record<string, unknown> = { ...era, ...Object.fromEntries(FINISH.map((k) => [k, true])) };
    const flip = { ...prior, keyframes: [{ image: "anchor.png", frame: 0 }] };
    const seat = svc.reseatStageFamily("h3-timeline", flip, prior);
    expect(seat, "the seat resolves h3's family law off the DECL — never null").not.toBeNull();
    expect(seat?.dropped ?? ["<null>"], "the DECL carries no dead letters — nothing drops").toEqual([]);
    for (const k of FINISH) {
      if (k === "upscale_route") continue
      expect(seat?.params, `the landed row still carries '${k}'`).toHaveProperty(k);
    }
    // (2) A DOC WHOSE LANE HONORS THE KEYS rides unchanged.
    const honored = svc.reseatStageFamily("h3-timeline", prior, prior);
    expect(honored?.dropped ?? ["<null>"], "the t4_open doc rides unchanged (dropped: [])").toEqual([]);
    // (3) THE DECLARATION JUDGE (familyLawDrift — prime() throws on
    // its verdict): the real boarded laws carry no drift, an orphan
    // deadKeys lane is named, and an empty lane list is named. This
    // is the judge's OWN firing arm — gutting it reds here AND
    // silences prime's boot gate.
    const laws = new Map<string, typeof FAMILY_LAW>();
    for (const [, d] of await loadCardDefs()) {
      for (const family of d.boarded) {
        const law = getModel(family).familyLaw;
        if (law !== undefined && !laws.has(family)) laws.set(family, law);
      }
    }
    expect(laws.has("h3"), "the h3 family declares its law on the MODEL DECL").toBe(true);
    expect(familyLawDrift(laws), "the real declarations pass their own boot judge").toEqual([]);
    const orphan = new Map(laws);
    orphan.set("mock-family", {
      lanes: [{ lane: "only" }],
      deadKeys: { nobody: ["a_key"] },
    });
    expect(familyLawDrift(orphan), "deadKeys naming a lane the lanes array does not declare reds at boot")
      .toContain("mock-family: deadKeys names undeclared lanes [\"nobody\"]");
    expect(familyLawDrift(new Map([["empty", { lanes: [], deadKeys: {} }]])), "a law with no lanes reds at boot")
      .toContain("empty: no lanes declared");
    // (4) THE LANE-DEAD-LETTER BAN: the empty slot cannot silently
    // re-grow the law the burn convicted — a law that declares dead
    // keys on a REAL lane reds at boot, naming the cure (fix the
    // renderer, or gate the shape with a repair-teaching law).
    const deadLetter = new Map(laws);
    deadLetter.set("mock-dead-letter", {
      lanes: [{ lane: "t4r", guideKeys: ["image"] }],
      deadKeys: { t4r: ["second_pass_enabled"] },
    });
    expect(familyLawDrift(deadLetter), "a non-empty deadKeys reds even on a legitimately declared lane")
      .toContain('mock-dead-letter: lane t4r declares dead keys ["second_pass_enabled"] — no lane dead letter may ship (cure the renderer or gate the shape)');
  });
});
