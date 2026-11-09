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
  it("NO FALLBACK READS: a wrong-typed repair seat refuses loud (never silently defaults/unbinds)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Repair({ ...REPAIR(), steps: true }, FILM, FACTS, g, "run_typed_repair"),
      /'steps' is stated as true.*a number seat carries a number.*never silently defaults/s,
    );
  });

  it("NO FALLBACK READS: a wrong-typed swap seat refuses loud (never silently defaults/unbinds)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Swap({
        source_clip: "clips/take.mp4", still: "stills/a.png", mannequin: "clips/m.mp4",
        mask: "masks/m.png", swap_prompt: "swap",
        clip_seconds: null,
      }, FILM, FACTS, g, "run_typed_swap"),
      /'clip_seconds' is stated as null.*a number seat carries a number.*never silently defaults/s,
    );
  });
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

  it("CARRY FALSE on a PLAN-HEAD seat refuses AT COMPOSE naming the live vocabulary and the authored-windows cure (the bench burn 2026-11-16, run-84806ec44694's cell B: 0 on H3OneClickSwapPlan died at submit — 'the input allows 3 values (22, 39, 56)')", () => {
    // the cut join (0) serves AUTHORED windows' context_length; the
    // source-slicing plan head carries only the AV-legal 39 — the
    // press that used to compose 0 onto the widget now dies HERE,
    // at zero GPU, with the door named
    assert.throws(
      () => renderH3Repair({ ...REPAIR(), carry: false }, FILM, FACTS, new GraphBuilder(), "carry_off"),
      /\[22, 39, 56\].*39.*CUT \(0\) serves AUTHORED windows/s,
      "carry: false under the plan head must refuse quoting the live engine word + the cure",
    );
    assert.throws(
      () => renderH3Repair({ ...REPAIR(), carry: false }, FILM, FACTS, new GraphBuilder(), "carry_off"),
      /split the film on the timeline first/s,
      "the refusal names the door: authored windows, then carry: false",
    );
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

  it("THE EXPERT OVERRIDE RIDES THE SEAT IT SERVES: a stated boundary belongs to AUTHORED seams (never the plan head), a stated window still cuts the loader (the bench-burn cure's other half)", () => {
    // a stated 90 on the PLAN-HEAD seat (repair composes no authored
    // shots) refuses at compose — the live widget carries [22, 39, 56]
    // and would 400 the submit (run-84806ec44694's class)
    assert.throws(
      () => renderH3Repair({ ...REPAIR(), overlap_frames: 90 }, FILM, FACTS, new GraphBuilder(), "expert_90"),
      /\[22, 39, 56\]/,
      "a stated AV boundary never rides the plan head's own slicing",
    );

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

  it("THE AUTHORED CUT COMPOSES WITH A LEGAL WIDGET (the submit-death no wall judged, 2026-11-16): carry: false over authored windows rides the cut on the SHOTS' context_length while the plan head's overlap widget carries the node's own 39 — the inert widget must still pass validate_prompt's [22, 39, 56]", () => {
    const { shots, o } = editPlan({ calls: TWO_WINDOWS("extend"), ...FILM }, { ...EDIT_ENTRY(), carry: false });
    assert.equal(shots[1]!.context_length, 0, "the cut rides the shot's own context (the engine's cut preset)");
    assert.equal(planOverlap(o), 39, "the plan head's widget rides a legal choice (39, the node's own default) — 0 there died at submit eight nodes deep");
  });

  it("A STATED AV BOUNDARY rides an AUTHORED seam's context verbatim (the expert's seat is the shot, never the plan head)", () => {
    const { shots, o } = editPlan({ calls: TWO_WINDOWS("extend"), ...FILM }, { ...EDIT_ENTRY(), overlap_frames: 90 });
    assert.equal(shots[1]!.context_length, 90, "the stated boundary rides the seam it serves");
    assert.equal(planOverlap(o), 39, "the plan head's widget stays legal — the boundary never lands on the slicing seat");
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

describe("D-5 THE PROBED WINDOW (defect board 2026-11-16: the refine 2x press on a 56 f clip refused \"a 144 f window\" — the unstated window planned the 6 s default and never read the film)", () => {
  /** The edit cell's refine ceiling seat: entry + film params, the
   *  unstated-window posture (window_length absent — the plan slice
   *  governs) unless an override says otherwise. */
  const REFINE_ENTRY = (extra: Record<string, unknown>): Record<string, unknown> => ({
    source_clip: "clips/take.mp4", edit_prompt: "clean the jacket", denoise: 0.32, mask: "masks/j.png",
    refine: true, ...extra,
  });
  const compose = (entry: Record<string, unknown>): Record<string, Node> => {
    const g = new GraphBuilder();
    EDIT(g, entry, "run_d5");
    return out(g);
  };

  it("THE CURE: a 56 f probed film composes refine 2x unstated — the plan slice never outlives the film (the blind 144 f refusal is dead)", () => {
    const o = compose(REFINE_ENTRY({ __source_frames: 56 }));
    assert.ok(ofClass(o, "VHS_LoadVideo").length > 0, "the edit chain still composes whole");
  });

  it("the probe judges the frames REMAINING past the window's start (56 f film, window_start 48 — 8 f serve)", () => {
    assert.doesNotThrow(() => compose(REFINE_ENTRY({ __source_frames: 56, window_start: 48 })));
  });

  it("a film that OUTLIVES the plan slice still refuses at the slice (400 f probed, unstated window → the 144 f first segment)", () => {
    assert.throws(
      () => compose(REFINE_ENTRY({ __source_frames: 400 })),
      /a 144 f window at refine 2x is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the true positive keeps firing",
    );
    assert.throws(
      () => compose(REFINE_ENTRY({ __source_frames: 400 })),
      /the source probed 400 f and outlives the 144 f plan slice, so the slice itself judged/,
      "the refusal states WHICH length judged — the provenance is the cure's receipt",
    );
  });

  it("a STATED window wins over the probe (the author's word: 175 f stated on a 400 f film refuses 175, never the min)", () => {
    assert.throws(
      () => compose(REFINE_ENTRY({ __source_frames: 400, window_length: 175 })),
      /a 175 f window at refine 2x is TOO LONG/,
      "the stated window is the author's, probed or not",
    );
  });

  it("NO STAMP = the conservative plan keeps its old voice verbatim (an unprobed source never silently passes)", () => {
    assert.throws(
      () => compose(REFINE_ENTRY({})),
      /a 144 f window at refine 2x is TOO LONG — the 2x pass was measured OOM at 141 f \(H3 memory grows with the window; whichever sizing mode upsizes, a window that dies is a window too long\)\. Cut the window \(window_length \/ clip_seconds\) or lower scale below 2 for a same-size pass$/,
      "the unprobed refusal stays whole — no provenance clause, no leniency",
    );
  });

  it("a wrong-typed stamp refuses loud (the door's number is never guessed around)", () => {
    assert.throws(
      () => compose(REFINE_ENTRY({ __source_frames: "lots" })),
      /'__source_frames' is stated as "lots" — the compose door's probed-length stamp is a positive frame count/,
      "a wrong-typed probed length never silently reads as unprobed",
    );
  });

  it("a film shorter than the OOM line composes at ANY probed length (100 f, unstated — min\(144, 100\) = 100)", () => {
    assert.doesNotThrow(() => compose(REFINE_ENTRY({ __source_frames: 100 })));
  });
});

describe("D-2 THE MULTI-SEGMENT 2X GUARD (defect board 2026-11-16: refine + scale 2 over a multi-window plan burned the engine mid-run — `h3_masked_prefix: previous/target video latent geometry differs: (1, 24, 17, 168, 96) vs (1, 24, 17, 84, 48)`. The chain joins at 1x, each window emits 2x.)", () => {
  /** The board's own press shape: the whole 141 f film, clip_seconds 2.5, OVERLAP 39 → 5 segments. */
  const BOARD_PRESS = (extra: Record<string, unknown>): Record<string, unknown> => ({
    source_clip: "clips/take.mp4", edit_prompt: "upscale the yard", denoise: 0.32, mask: "masks/j.png",
    refine: true, scale: 2, ...extra,
  });
  const composeEdit = (entry: Record<string, unknown>, p: Record<string, unknown> = { ...FILM }): Record<string, Node> => {
    const g = new GraphBuilder();
    renderH3Edit(entry, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, p, FACTS, g, "run_d2");
    return out(g);
  };
  const TWO_CALLS: Array<Record<string, unknown>> = [
    { text: "a", start_frame: 0, end_frame: 56 },
    { text: "b", start_frame: 56, end_frame: 112, transition: "extend" },
  ];

  it("THE CURE: the board's own press refuses at compose — the sentence names the join burn and the one-window cure (zero GPU)", () => {
    assert.throws(
      () => composeEdit(BOARD_PRESS({
        clip_seconds: 2.5, overlap_frames: 39, __source_frames: 141,
      }), { ...FILM, calls: TWO_CALLS }),
      /refine 2x over a 2-window plan cannot tile — the chain joins its segments at 1x geometry while each refined window emits 2x latents \(the engine dies mid-run: h3_masked_prefix 'previous\/target video latent geometry differs'\), so a multi-window refine press burns GPU on the first segment to abort on the second\. Refine ONE window per press/,
      "the sentence names the burn and the measured cure, never a naked refusal",
    );
  });

  it("the source-sliced face counts through the probe stamp (an unprobed source stays the engine's belt — the same posture every probe arm rides)", () => {
    // a 464 f film tiles 5 uniform 124 f windows under the 39 join — under the OOM line, EVERY slice fits (the solver's own verdict)
    // yet the press still refuses BY WINDOW COUNT: this is the guard's whole law (the join burns whatever the slice length)
    assert.throws(
      () => composeEdit(BOARD_PRESS({ clip_seconds: 3.04, __source_frames: 464 })),
      /refine 2x over a 5-window plan cannot tile/,
      "the source-sliced multi-window press refuses through the stamp",
    );
  });

  it("ONE window composes (the measured posture: single 56 f press, 2x, ~3 min)", () => {
    assert.doesNotThrow(() => composeEdit(BOARD_PRESS({ clip_seconds: 2.5, overlap_frames: 39, __source_frames: 56 })));
  });

  it("a STATED window is its own single press (caps the loader — the guard never counts past it)", () => {
    assert.doesNotThrow(() => composeEdit(BOARD_PRESS({ window_length: 56, __source_frames: 400 })));
  });

  it("scale below 2 never guards (the same-size pass is exempt — the OOM law's own carve-out)", () => {
    assert.doesNotThrow(() => composeEdit(BOARD_PRESS({
      scale: 1, clip_seconds: 2.5, overlap_frames: 39, __source_frames: 141,
    }), { ...FILM, calls: TWO_CALLS }));
  });

  it("refine OFF never guards (the plain edit tiles whole films end to end)", () => {
    assert.doesNotThrow(() => composeEdit(BOARD_PRESS({
      refine: false, clip_seconds: 2.5, overlap_frames: 39, __source_frames: 141,
    }), { ...FILM, calls: TWO_CALLS }));
  });
});

describe("THE UNPROBED STAMP ABSENCE (every probe arm's own posture: no stamp, no tiling claim, the render's own ceilings speak)", () => {
  it("an unprobed source stays the belt on BOTH refine faces (the slice ceiling at 144, the carry face silent)", () => {
    const g = new GraphBuilder();
    // the 6 s default plan, no stamp: the only question is the slice
    assert.throws(
      () => renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "upscale the yard", denoise: 0.32, mask: "masks/j.png",
        refine: true, scale: 2,
      }, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, { width: 1344, height: 768 }, FACTS, g, "run_unprobed"),
      /a 144 f window at refine 2x is TOO LONG/,
      "no stamp: the render's own slice ceiling speaks (never a guard's guess about a tiling nobody proved)",
    );
  });
});

describe("THE DEFECT-BOARD MESSAGE PASS (D-6 + D-3, 2026-11-16: a refusal that does not name the missing field is a lecture — the board's own burn: 'an agent reads this and cannot tell whether it set reference wrong or omitted a sibling field')", () => {
  it("D-6 THE MISSING FIELD IS NAMED: the identity-swap refusal says 'mannequin', the enum's two postures, and the text-conditioned carve", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "swap the face", denoise: 1, mask: "masks/f.png",
        mask_source: "region", region_prompt: "face",
      }, { source: "region", prompt: "face", detectionThreshold: 0.5 } as never, { mode: "self" } as never, { width: 1344, height: 768 }, FACTS, g, "run_d6"),
      /THE MISSING FIELD IS 'mannequin' — the motion video seated beside 'still' under reference still\+mannequin \('still' alone is not a posture: the enum is self \| still\+mannequin/i,
      "the refusal names the field, never a posture lecture alone",
    );
    assert.throws(
      () => renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "swap the face", denoise: 1, mask: "masks/f.png",
        mask_source: "region", region_prompt: "face",
      }, { source: "region", prompt: "face", detectionThreshold: 0.5 } as never, { mode: "self" } as never, { width: 1344, height: 768 }, FACTS, g, "run_d6b"),
      /With mask_source 'region' a plate is OPTIONAL — region_prompt selects the region by text and the edit prompt redraws inside it; a reference image is required only when the new content must be a specific person or a specific mark/,
      "the text-conditioned carve rides the same sentence (the board's D-12 inference killer)",
    );
  });

  it("D-3 THE 2 S DECREE RIDER: 48 f refuses naming 56 f AS THE CEILING of the 2 s class (the decree rounds UP — 48 f cannot exist)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "clean the jacket", denoise: 0.32, mask: "masks/j.png",
        window_length: 48,
      }, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, { width: 1344, height: 768 }, FACTS, g, "run_d3"),
      /window_length 48f is not on the film's grid — 56f is the nearest and it IS the ceiling of the 2 s class \(48 f cannot exist: the engine serves 22\+17k frames, so the "2 seconds" decree rounds UP to the 56 f rung = 2\.33 s, the memory-safe window at refine 2x\)/,
      "the 48 press hears the whole law: nearest + ceiling + why",
    );
  });

  it("the rider is CLASS-SCOPED (a 300 f press hears only the nearest — no 2 s talk)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit({
        source_clip: "clips/take.mp4", edit_prompt: "clean the jacket", denoise: 0.32, mask: "masks/j.png",
        window_length: 300,
      }, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, { width: 1344, height: 768 }, FACTS, g, "run_d3b"),
      /window_length 300f is not on the film's grid — \d+f is the nearest, or leave the window unstated/,
      "the old voice rides whole for the non-2s press",
    );
  });
});
