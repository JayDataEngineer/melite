// THE FILM CLOCK (F55, 2026-11-09 — the join shares ONE clock).
// MeliteConcatVideos refuses members at mixed fps LOUD at execute
// (nodes.py: the concat's fps arm — "every member must share the
// clock (never a silently-restamped film)"), AFTER every window's
// GPU is paid and every member file is saved. The burn: a
// multi-window doc with second_pass on + interpolate on ×2 whose
// second call pinned knobs.interpolate_enabled = false composed
// validate-green — window1_CreateVideo fps 48 against window2's 24,
// one FrameInterpolate on window 1 only — and died at execute with
// the film fully rendered ("member ... plays at 24fps but the film
// is 48fps"). The stanza merge ({...p, ...knobs}) folds per-call
// pins into the params renderH3Window reads, so ANY per-window
// clock pin — interpolate_enabled, interp_multiplier, or a
// second_pass_enabled smuggled past the knob vocabulary — renders
// its member at a foreign clock.
//
// THE LAW THIS WALL OWNS: the film loop's one-clock sweep
// (actions.ts renderH3Film, before the render loop) judges each
// window's COMPUTED clock against the film's — the composer's own
// reads (strict master, truthy switch, raw multiplier) — and the
// first split window refuses with its pin state, the film's clock,
// and the cure (move the pin to the film level). Agreement — or
// silence — rides the film's clock untouched; interp_model stays a
// per-shot choice (the model never touches the clock).
//
// THE DOOR: the card def's real path (def.schema then def.compose —
// the same hop the run rides), booted through the real models table.
// THE WITNESS: thrown refusal verbatim on the split arms; member
// CreateVideo fps census on the agreement arms (number fps seats are
// members; the film's rides the concat link).
//
// TOGGLE RED-PROOFS (2026-11-02, hands on the cure file — the
// files settled with the cure, so the proofs below are recorded,
// not re-run): deleting the sweep re-greens the split — ARM 1/2/3/4
// fail (expected refusal, the graph composes with mixed member
// fps); restoring it returns 9/9. The vendor's own fps arm stays the
// execute seat for files the film never rendered (an extend-time
// append at a foreign rate refuses there, both rates named —
// adjacent, not owned).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "@melite/comfyui-cordis";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

/** THE COMPOSE DOOR — the same def.compose the run rides. */
async function composeH3(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

/** A two-window extend film (the door's own grid law — first window
 *  22+17·4, carried window 17·5; the three-door wall's proven spans). */
const FILM = (over: Record<string, unknown> = {}, w2knobs?: Record<string, unknown>): Record<string, unknown> => ({
  model: "h3", variant: "timeline", quant: "int8",
  ...over,
  calls: [
    { text: "one", start_frame: 0, end_frame: 90 },
    { text: "two", start_frame: 90, end_frame: 175, ...(w2knobs !== undefined ? { knobs: w2knobs } : {}) },
  ],
});

/** The member CreateVideo fps seats — number fps are members (their
 *  saved files carry the clock); the film's rides the concat link. */
function memberFps(graph: Graph): number[] {
  return Object.values(graph)
    .filter((n) => n.class_type === "CreateVideo" && typeof n.inputs.fps === "number")
    .map((n) => n.inputs.fps as number);
}

function census(graph: Graph, cls: string): Array<[string, GNode]> {
  return Object.entries(graph).filter(([, n]) => n.class_type === cls);
}

describe("the film clock (F55 — the join shares one clock)", () => {
  let def: CardDefinition;
  beforeAll(async () => {
    def = (await loadCardDefs()).get("h3-timeline")!;
    void def;
  });

  it("ARM 1 — THE OPT-OUT SPLIT: doc interp on, window 2 pins it off — refuses naming the window, the pin, and the film-level cure", async () => {
    await assert.rejects(
      composeH3(FILM(
        { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
        { interpolate_enabled: false },
      ), "h3_filmclock_arm1_split_off"),
      /h3-timeline window 2: knobs\.interpolate_enabled = false states a base-rate member against the film's interpolated clock.*move the pin to the film level/,
    );
  });

  it("ARM 2 — THE OPT-IN SPLIT: doc interp off (master on), window 1 pins it on — refuses naming window 1", async () => {
    const doc = FILM({ second_pass_enabled: true });
    ((doc.calls as Array<Record<string, unknown>>)[0] as Record<string, unknown>).knobs = { interpolate_enabled: true };
    await assert.rejects(
      composeH3(doc, "h3_filmclock_arm2_split_on"),
      /h3-timeline window 1: knobs\.interpolate_enabled = true states a doubled member against the film's base-rate clock.*move the pin to the film level/,
    );
  });

  it("ARM 3 — THE MULTIPLIER SPLIT: both windows interp, window 2 pins ×4 against the film's ×2 — refuses naming both clocks", async () => {
    await assert.rejects(
      composeH3(FILM(
        { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
        { interp_multiplier: 4 },
      ), "h3_filmclock_arm3_split_mult"),
      /h3-timeline window 2: knobs\.interp_multiplier = 4 states a ×4 member against the film's ×2 clock.*move the pin to the film level/,
    );
  });

  it("ARM 4 — THE MASTER SMUGGLE: second_pass_enabled is doc-only vocabulary — a per-call pin that flips the clock refuses with the same voice", async () => {
    await assert.rejects(
      composeH3(FILM(
        { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
        { second_pass_enabled: false },
      ), "h3_filmclock_arm4_smuggle"),
      /h3-timeline window 2: knobs\.second_pass_enabled = false states a base-rate member against the film's interpolated clock.*move the pin to the film level/,
    );
  });

  it("ARM 5 — THE AGREEMENT: a redundant ×2 pin + a per-shot interp_model ride the film's clock untouched — both members interpolate at one fps", async () => {
    const graph = await composeH3(FILM(
      { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
      { interp_multiplier: 2, interp_model: "rife47.pth" },
    ), "h3_filmclock_arm5_agree");
    assert.equal(census(graph, "FrameInterpolate").length, 2, "agreement ⇒ both windows ride the interpolator (no limb lost)");
    assert.deepEqual(memberFps(graph), [48, 48], "agreement ⇒ every member shares the film's doubled clock");
  });

  it("ARM 6 — THE CLEAN INTERP FILM: doc-level interp, no pins — every member doubles, the film rides the concat's clock", async () => {
    const graph = await composeH3(FILM(
      { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
    ), "h3_filmclock_arm6_clean_interp");
    assert.equal(census(graph, "FrameInterpolate").length, 2, "film-level interp ⇒ one interpolator per window");
    assert.deepEqual(memberFps(graph), [48, 48], "film-level interp ⇒ every member shares the doubled clock");
  });

  it("ARM 7 — THE CLEAN BASE FILM: no interp anywhere — no interpolator, every member rides the base clock", async () => {
    const graph = await composeH3(FILM({ second_pass_enabled: true }), "h3_filmclock_arm7_clean_base");
    assert.equal(census(graph, "FrameInterpolate").length, 0, "interp off ⇒ no interpolator on any window");
    assert.deepEqual(memberFps(graph), [24, 24], "interp off ⇒ every member shares the base clock");
  });

  it("ARM 8 — THE NULL PIN: an explicit null still overrides the merge (the composer renders it falsy) — refuses naming the null verbatim", async () => {
    await assert.rejects(
      composeH3(FILM(
        { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
        { interpolate_enabled: null },
      ), "h3_filmclock_arm8_null_pin"),
      /h3-timeline window 2: knobs\.interpolate_enabled = null states a base-rate member against the film's interpolated clock.*move the pin to the film level/,
    );
  });

  it("ARM 9 — THE UNDEFINED PIN (in-process): an explicit undefined still overrides the merge — refuses naming the key, never an empty 'knobs = {}'", async () => {
    await assert.rejects(
      composeH3(FILM(
        { second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 2 },
        { interpolate_enabled: undefined },
      ), "h3_filmclock_arm9_undefined_pin"),
      /h3-timeline window 2: knobs\.interpolate_enabled = undefined states a base-rate member against the film's interpolated clock.*move the pin to the film level/,
    );
  });
});
