// @melite/models-h3 — P1-4/P1-5 at the RENDERER plane (defect board
// row 4, the operator's five-times-asked demand: "Why is there ZERO
// OPTION to split up the video to video transformation"): the split
// comes from the FILM, never the caller. The door exposes exactly
// one new concept — carry (ABSENT = true, the default: the whole
// film rides, segments continue from the last frame of the previous,
// joined with the DERIVED AV-legal overlap). The engine's
// AV-continuity vocabulary (39/90/141/192/243 — contracts_v05.py:55,
// AV_TRANSITION_CONTEXT_LENGTHS) is judged at COMPOSE, zero GPU, so
// the run-1f91718b7cde class (a typed boundary refused eight nodes
// deep: "H3 AV generated-audio continuity requires an exact shared
// video/audio boundary") is dead before a graph executes. These arms
// read the composed H3OneClickSwapPlan overlap input and the
// VHS_LoadVideo cap — the two seats the caller used to type.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Repair, renderH3Swap, renderH3Edit, renderH3Extend } from "../src/index.ts";
import { AV_CONTINUITY_OVERLAPS, CARRY_JOIN_OVERLAP, entryCarries, resolveCarryOverlap } from "../src/timelineContract.ts";
import { CALL_TRANSITIONS } from "../src/timelineContract.ts";
import { schema as h3schema } from "../src/schema.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> => g.toJSON() as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

/** the plan head's overlap input — the join boundary the ENGINE rides. */
const planOverlap = (o: Record<string, Node>): unknown =>
  ofClass(o, "H3OneClickSwapPlan")[0]![1].inputs.overlap_frames;

/** the loader's cap — 0 loads the WHOLE film (run-e79f3b304e4b's
 * window_length: 90 cut a 243 f film HERE, at the loader, and the
 * plan never saw the film). */
const loadCap = (o: Record<string, Node>): unknown =>
  ofClass(o, "VHS_LoadVideo")[0]![1].inputs.frame_load_cap;

const FILM: Record<string, unknown> = { width: 1344, height: 768 };

const REPAIR = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4", repair_prompt: "clean hands", mask: "masks/hands.png",
});

const EDIT = (g: GraphBuilder, entry: Record<string, unknown>, runId: string): void => {
  renderH3Edit(entry, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, FILM, FACTS, g, runId);
};

describe("P1-4 carry split — segments come from the film, the boundary from the engine's law", () => {
  it("THE DEFAULT PRESS: nothing stated composes the WHOLE film (loader cap 0) joined at the derived 39 — every cell", () => {
    for (const [name, compose] of [
      ["repair", (g: GraphBuilder, r: string) => renderH3Repair(REPAIR(), FILM, FACTS, g, r)],
      ["swap", (g: GraphBuilder, r: string) => renderH3Swap({
        source_clip: "c.mp4", still: "s.png", mannequin: "m.mp4", mask: "k.png", swap_prompt: "p",
      }, FILM, FACTS, g, r)],
      ["edit", (g: GraphBuilder, r: string) => EDIT(g, { source_clip: "c.mp4", edit_prompt: "p", denoise: 0.32 }, r)],
      ["extend", (g: GraphBuilder, r: string) => renderH3Extend({ source_clip: "c.mp4", extend_prompt: "p" }, FILM, FACTS, g, r)],
    ] as const) {
      const g = new GraphBuilder();
      compose(g, "carry_default");
      const o = out(g);
      assert.equal(loadCap(o), 0, `${name}: the whole film rides — no caller cut at the loader`);
      assert.equal(planOverlap(o), CARRY_JOIN_OVERLAP, `${name}: the join boundary is DERIVED (39), never typed`);
    }
  });

  it("CARRY STATED TRUE rides the same derived join — the one new concept, one spelling", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), carry: true }, FILM, FACTS, g, "carry_on");
    assert.equal(planOverlap(out(g)), 39, "carry: true derives the AV-legal join");
  });

  it("CARRY FALSE cuts the joins: the plan rides 0 (the engine's own cut preset — context 0 skips the AV law)", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), carry: false }, FILM, FACTS, g, "carry_off");
    assert.equal(planOverlap(out(g)), 0, "carry: false = each segment stands alone");
  });

  it("THE AV LAW DIES AT COMPOSE: a stated overlap outside the vocabulary REFUSES before any graph executes", () => {
    for (const bad of [22, 56, 40, 244]) {
      assert.throws(
        () => renderH3Repair({ ...REPAIR(), overlap_frames: bad }, FILM, FACTS, new GraphBuilder(), "av_law"),
        /39, 90, 141, 192, or 243/,
        `overlap_frames ${bad} must refuse naming the engine's vocabulary`,
      );
      assert.throws(
        () => renderH3Repair({ ...REPAIR(), overlap_frames: bad }, FILM, FACTS, new GraphBuilder(), "av_law"),
        new RegExp(String(bad)),
        `the refusal names the stated value ${bad}`,
      );
    }
  });

  it("THE RUN-1F91718B7CDE REFUSAL TEXT IS QUOTED (the burn the operator named, verbatim in the cure)", () => {
    assert.throws(
      () => renderH3Repair({ ...REPAIR(), overlap_frames: 22 }, FILM, FACTS, new GraphBuilder(), "quote"),
      /H3 AV generated-audio continuity requires an exact shared video\/audio boundary/,
    );
  });

  it("THE EXPERT OVERRIDE STAYS: a stated legal boundary rides verbatim, a stated window still cuts the loader", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), overlap_frames: 90 }, FILM, FACTS, g, "expert_90");
    assert.equal(planOverlap(out(g)), 90, "90 is engine-legal and rides as stated");

    const g2 = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), window_length: 90 }, FILM, FACTS, g2, "expert_win");
    assert.equal(loadCap(out(g2)), 90, "an explicitly stated window still cuts — the internal override door stays open");
  });

  it("THE INTENT-PHRASED GRID REFUSAL (row 8's rider): an off-grid window names carry as the cure, not just the nearest rung", () => {
    assert.throws(
      () => EDIT(new GraphBuilder(), {
        source_clip: "c.mp4", edit_prompt: "p", denoise: 0.32, window_length: 60,
      }, "grid_phrase"),
      /carry: true .* splits the film automatically/,
      "the cure the operator asked to READ is carry — never frame arithmetic",
    );
  });
});

describe("the resolver's own law (unit plane — one home, every cell consumes it)", () => {
  it("the engine vocabulary is exactly the five", () => {
    assert.deepEqual([...AV_CONTINUITY_OVERLAPS], [39, 90, 141, 192, 243]);
  });

  it("absence derives 39 under carry (the default), 0 under carry: false; 0 and the five ride verbatim", () => {
    assert.equal(resolveCarryOverlap({}), 39);
    assert.equal(resolveCarryOverlap({ carry: false }), 0);
    assert.equal(resolveCarryOverlap({ carry: true }), 39);
    assert.equal(resolveCarryOverlap({ overlap_frames: 0 }), 0);
    for (const legal of AV_CONTINUITY_OVERLAPS) {
      assert.equal(resolveCarryOverlap({ overlap_frames: legal }), legal);
    }
  });

  it("a stated boundary is refused AT ADMISSION with the law and the value named", () => {
    for (const bad of [22, 56, 1, 38, 40, 244, 1000]) {
      assert.throws(() => resolveCarryOverlap({ overlap_frames: bad }), /39, 90, 141, 192, or 243/);
      assert.throws(() => resolveCarryOverlap({ overlap_frames: bad }), new RegExp(`\\b${bad}\\b`));
    }
  });

  it("carry admits only booleans — anything else refuses naming the seat", () => {
    assert.equal(entryCarries({}), true, "ABSENT = carry, THE DEFAULT");
    assert.equal(entryCarries({ carry: false }), false);
    assert.throws(() => entryCarries({ carry: "yes" }), /carry must be a boolean/);
    assert.throws(() => entryCarries({ carry: 1 }), /carry must be a boolean/);
    assert.throws(() => resolveCarryOverlap({ overlap_frames: 39.5 }), /whole number of frames/);
    assert.throws(() => resolveCarryOverlap({ overlap_frames: "lots" }), /whole number of frames/);
  });
});

describe("THE CALLS→EDIT SEAM TRANSLATION (audit item 5 — the timeline's authored windows reach the edit run)", () => {
  /** The edit door composed over a doc whose calls carry authored
   *  windows — the plan node's ChainPlanModern inputs read back. */
  const editPlan = (p: Record<string, unknown>, entry: Record<string, unknown>): {
    shots: Array<{ id: string; length: number; context_length?: number }>;
    literalRules: boolean;
    o: Record<string, Node>;
  } => {
    const g = new GraphBuilder();
    renderH3Edit(entry, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, p, FACTS, g, "run_seam");
    const o = out(g);
    const plan = ofClass(o, "MiniMaxH3ChainPlanModern")[0]![1];
    const shots = (JSON.parse(String(plan.inputs.plan_json)) as { shots: Array<{ id: string; length: number; context_length?: number }> }).shots;
    return { shots, literalRules: !("plan_json_input" in plan.inputs), o };
  };
  const EDIT_ENTRY = (): Record<string, unknown> => ({
    source_clip: "clips/take.mp4", edit_prompt: "clean the jacket", denoise: 0.32, mask: "masks/j.png",
  });
  const TWO_WINDOWS = (transition: string): Array<Record<string, unknown>> => [
    { text: "a", start_frame: 0, end_frame: 56 },
    { text: "b", start_frame: 56, end_frame: 112, transition },
  ];

  it("TWO AUTHORED WINDOWS + a carry seam: the plan shots ARE the calls' spans, the seam carries 39, the LITERAL rules (no source re-slice over them)", () => {
    const { shots, literalRules, o } = editPlan({ calls: TWO_WINDOWS("extend"), ...FILM }, EDIT_ENTRY());
    assert.equal(shots.length, 2, "one shot per authored window");
    assert.deepEqual(shots[0], { id: "w1-carry", prompt: "clean the jacket", length: 56 }, "shot 1 states its span and the translation in its id");
    assert.deepEqual(shots[1], { id: "w2-carry", prompt: "clean the jacket", length: 56, context_length: 39 }, "the carry seam rides the AV-legal join");
    assert.equal(literalRules, true, "plan_json_input is ABSENT — the authored shots rule, the plan node must not re-slice");
    assert.equal(loadCap(o), 0, "the whole film still rides the loader — the SHOTS slice the plan, the loader never cuts");
  });

  it("A CUT SEAM carries 0 (the engine's cut preset), its id states it", () => {
    const { shots } = editPlan({ calls: TWO_WINDOWS("cut"), ...FILM }, EDIT_ENTRY());
    assert.equal(shots[1]!.context_length, 0);
    assert.equal(shots[1]!.id, "w2-cut");
  });

  it("carry+keyframe translates to the CARRY join, STATED in the id (a keyframe is a gen-side anchor; a masked edit carries — never a silent downgrade)", () => {
    const { shots } = editPlan({ calls: TWO_WINDOWS("carry+keyframe"), ...FILM }, EDIT_ENTRY());
    assert.equal(shots[1]!.context_length, 39);
    assert.equal(shots[1]!.id, "w2-carry", "the translation is legible on the plan itself");
  });

  it("carry: false on the ENTRY cuts every authored seam (the entry's global law wins over the calls' own)", () => {
    const { shots } = editPlan({ calls: TWO_WINDOWS("extend"), ...FILM }, { ...EDIT_ENTRY(), carry: false });
    assert.equal(shots[1]!.context_length, 0);
    assert.equal(shots[1]!.id, "w2-cut");
  });

  it("A SINGLE CALL is the un-split film: the source-sliced default press stands (nothing changes)", () => {
    const { shots, literalRules } = editPlan({ calls: [{ text: "a", start_frame: 0, end_frame: 243 }], ...FILM }, EDIT_ENTRY());
    assert.deepEqual(shots, [{ id: "edit", prompt: "clean the jacket" }], "the ignored fallback literal");
    assert.equal(literalRules, false, "plan_json_input rides — the plan node slices engine-side");
  });

  it("A STATED EXPERT WINDOW rules over the calls (the override is the expert's, never derived)", () => {
    const { shots, literalRules } = editPlan(
      { calls: TWO_WINDOWS("extend"), ...FILM },
      { ...EDIT_ENTRY(), window_start: 0, window_length: 141 },
    );
    assert.deepEqual(shots, [{ id: "edit", prompt: "clean the jacket" }]);
    assert.equal(literalRules, false);
  });

  it("A MALFORMED call span stands the translation DOWN (never a composed guess over broken windows)", () => {
    const { shots, literalRules } = editPlan(
      { calls: [{ text: "a", start_frame: 0, end_frame: 56 }, { text: "b" }], ...FILM },
      EDIT_ENTRY(),
    );
    assert.deepEqual(shots, [{ id: "edit", prompt: "clean the jacket" }]);
    assert.equal(literalRules, false);
  });
});

describe("THE SEAM VOCABULARY (the carry+keyframe audit's owed wall — a typo'd seam never composes as carry in silence)", () => {
  // transitionOverlap treats ANY non-'cut' string as the carry join,
  // so the schema's walk judges every stated transition against the
  // CALL_TRANSITIONS roster. The arms drive the REAL walk (the
  // schema carrier), not the resolver alone.
  const WALK = (transition: string | undefined): unknown => {
    // the span geometry is seam-relative (timelineContract's one grid):
    // a carried window's authored span is 17k (119f here — its 22f seam
    // is the generation head); a cut window is judged verbatim, 22+17k
    // (124f here). First window is always verbatim.
    const calls: Array<Record<string, unknown>> = [
      { text: "a", start_frame: 0, end_frame: 124 },
      { text: "b", start_frame: 124, end_frame: transition === "cut" ? 248 : 243 },
    ]
    if (transition !== undefined) calls[1]!.transition = transition
    return h3schema({ calls });
  };

  it("the three stated seams walk clean (cut, extend, carry+keyframe) and unstated = carry", () => {
    for (const legal of CALL_TRANSITIONS) {
      assert.doesNotThrow(() => WALK(legal), `'${legal}' is the vocabulary`);
    }
    assert.doesNotThrow(() => WALK(undefined), "unstated is the carry default");
  });

  it("anything else refuses at the walk, naming the value and the vocabulary", () => {
    for (const bad of ["cary", "stock", "cut ", "CUT", "dissolve", ""]) {
      assert.throws(() => WALK(bad), /is not a seam this timeline composes/, `'${bad}' must refuse`);
      assert.throws(() => WALK(bad), new RegExp(`'${bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`), "the refusal names the value");
    }
  });
});
